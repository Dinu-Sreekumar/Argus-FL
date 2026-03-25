"""
Argus-FL NFStream Real-Time Sentry
===================================
Flow-based ML intrusion detection using NFStream and trained FL model.
Captures live network flows, extracts CICIDS2017-format features, 
and runs inference using the Federated Learning model.

Requirements:
    - NFStream: pip install nfstream
    - Npcap on Windows (with WinPcap API compatibility mode)
    - Admin privileges for packet capture

Usage: python nfstream_sentry.py [interface]
"""

import os
import sys
import time
import logging
import threading
from collections import defaultdict, deque
import numpy as np
import socketio

# Configure Logging
logging.basicConfig(
    level=logging.WARNING, 
    format='%(asctime)s - [SENTRY] - %(levelname)s - %(message)s'
)
logger = logging.getLogger("NFStreamSentry")

# SocketIO Client to communicate with Main Server
sio = socketio.Client()
SERVER_URL = "http://localhost:5001"

# Global flags
EXIT_FLAG = False
MODEL_LOADED = False
_model = None
_scaler_params = None
_label_encoder = None
NUM_CLASSES = 2  # Binary classification (BENIGN vs ATTACK)

# Alert cooldown tracking (prevent spam)
alert_cooldowns = {}
COOLDOWN_SECONDS = 5.0



# ── Flood Detection Configuration ──────────────────────────────────────────
# Sliding-window thresholds: if a single source IP sends more than this many
# packets (of the relevant type) within FLOOD_WINDOW_SECONDS, trigger an alert.
# NOTE: hping3 -i u500 sends ~20 pps (waits for responses), so thresholds
# must be low enough to catch this rate within the window.
FLOOD_WINDOW_SECONDS = 15         # Width of the sliding window (seconds)
SYN_FLOOD_THRESHOLD  = 50         # SYN packets per window to trigger alert
UDP_FLOOD_THRESHOLD  = 50         # UDP packets per window to trigger alert


class FloodTracker:
    """
    Thread-safe sliding-window packet-rate tracker for flood detection.

    Maintains per-(src_ip, flood_type) deques of (timestamp, packet_count)
    buckets.  `record_flow()` is called for every flow; `check_flood()`
    returns True when the accumulated packet count inside the current
    window exceeds the configured threshold.
    """

    THRESHOLDS = {
        'SYN_FLOOD': SYN_FLOOD_THRESHOLD,
        'UDP_FLOOD': UDP_FLOOD_THRESHOLD,
    }

    def __init__(self, window: float = FLOOD_WINDOW_SECONDS):
        self.window = window
        self._buckets = defaultdict(deque)   # key: (src_ip, type) → deque of (ts, pkt_count)
        self._lock = threading.Lock()

    # ── Internal helpers ────────────────────────────────────────────────
    def _prune(self, key: tuple, now: float):
        """Drop buckets older than the sliding window."""
        dq = self._buckets[key]
        cutoff = now - self.window
        while dq and dq[0][0] < cutoff:
            dq.popleft()

    # ── Public API ──────────────────────────────────────────────────────
    def record_flow(self, src_ip: str, flow):
        """
        Inspect a completed flow and, if it matches a flood pattern,
        record its packet count into the appropriate sliding-window bucket.

        Flood pattern matching:
          • SYN_FLOOD — TCP flow (protocol 6) where SYN packets make up
            more than 50 % of total packets (half-open connection storm),
            OR a 1-packet TCP flow (hping3 --flood creates these and
            NFStream may not parse TCP flags for ultra-short flows).
          • UDP_FLOOD — UDP flow (protocol 17) targeting port 53.
        """
        protocol   = getattr(flow, 'protocol', 0)
        now        = time.time()
        total_pkts = getattr(flow, 'bidirectional_packets', 0) or 0
        dst_port   = getattr(flow, 'dst_port', 0)

        if protocol == 6:  # TCP
            syn_count = (getattr(flow, 'src2dst_syn_packets', 0) or 0) + \
                        (getattr(flow, 'dst2src_syn_packets', 0) or 0)

            # Determine if this flow looks like a SYN flood segment:
            #   1. SYN-heavy flow (syn_count / total >= 40%) — covers the case
            #      where Windows replies RST/ACK to each SYN, making SYN ~50%.
            #   2. High absolute SYN count (10+) in a single flow — even if
            #      mixed with other traffic, that many SYNs is suspicious.
            #   3. Single-packet TCP flow to a web port — hping3 --flood sends
            #      one SYN per unique 5-tuple; NFStream may report syn_count=0.
            is_syn_suspect = False
            if total_pkts > 0 and syn_count > 0 and syn_count / total_pkts >= 0.4:
                is_syn_suspect = True  # SYN-heavy flow (handles RST responses)
            elif syn_count >= 10:
                is_syn_suspect = True  # High absolute SYN count
            elif total_pkts <= 2:
                is_syn_suspect = True  # 1-2 pkt TCP flow = likely SYN probe/flood
            elif total_pkts <= 10 and syn_count >= 1:
                is_syn_suspect = True  # Small flow with SYN = likely flood segment

            if is_syn_suspect:
                key = (src_ip, 'SYN_FLOOD')
                with self._lock:
                    self._buckets[key].append((now, total_pkts))

        elif protocol == 17:  # UDP
            if dst_port == 53:
                key = (src_ip, 'UDP_FLOOD')
                with self._lock:
                    self._buckets[key].append((now, total_pkts))

    def check_flood(self, src_ip: str, flood_type: str) -> bool:
        """
        Return True if the accumulated packet count for (src_ip, flood_type)
        within the current sliding window exceeds the threshold.
        """
        key = (src_ip, flood_type)
        threshold = self.THRESHOLDS.get(flood_type, 500)
        now = time.time()

        with self._lock:
            self._prune(key, now)
            total = sum(count for _, count in self._buckets[key])

        return total >= threshold


# Global flood tracker instance (sits alongside alert_cooldowns)
flood_tracker = FloodTracker()

# Attack type classification based on model output and flow characteristics
ATTACK_CATEGORIES = {
    'DDoS': ['DDoS-SYN_Flood', 'DDoS-TCP_Flood', 'DDoS-UDP_Flood', 'DDoS-ICMP_Flood', 
             'DDoS-PSHACK_Flood', 'DDoS-RSTFINFlood', 'DDoS-SynonymousIP_Flood',
             'DDoS-ACK_Fragmentation', 'DDoS-UDP_Fragmentation', 'DDoS-ICMP_Fragmentation'],
    'DoS': ['DoS-SYN_Flood', 'DoS-TCP_Flood', 'DoS-UDP_Flood', 'DoS-HTTP_Flood'],
    'Reconnaissance': ['Recon-PortScan', 'Recon-OSScan', 'Recon-HostDiscovery'],
    'Mirai': ['Mirai-greeth_flood', 'Mirai-greip_flood', 'Mirai-udpplain'],
    'MITM': ['MITM-ArpSpoofing', 'DNS_Spoofing'],
}

# Feature column order matching data.csv (46 features)
FEATURE_COLUMNS = [
    'flow_duration', 'Header_Length', 'Protocol Type', 'Duration', 'Rate', 'Srate', 'Drate',
    'fin_flag_number', 'syn_flag_number', 'rst_flag_number', 'psh_flag_number', 'ack_flag_number',
    'ece_flag_number', 'cwr_flag_number', 'ack_count', 'syn_count', 'fin_count', 'urg_count', 'rst_count',
    'HTTP', 'HTTPS', 'DNS', 'Telnet', 'SMTP', 'SSH', 'IRC', 'TCP', 'UDP', 'DHCP', 'ARP', 'ICMP', 'IPv', 'LLC',
    'Tot sum', 'Min', 'Max', 'AVG', 'Std', 'Tot size', 'IAT', 'Number', 'Magnitue', 'Radius', 'Covariance', 'Variance', 'Weight'
]


def load_model():
    """Load the trained FL model, label encoder, AND scaler params."""
    global _model, MODEL_LOADED, _label_encoder, _scaler_params
    
    if MODEL_LOADED:
        return True
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Go up one level from sentry/ to backend/, then into models/saved_models
    backend_dir = os.path.dirname(script_dir)
    model_path = os.path.join(backend_dir, 'models', 'saved_models', 'global_model.keras')
    label_encoder_path = os.path.join(backend_dir, 'data', 'label_encoder.json')
    scaler_path = os.path.join(backend_dir, 'data', 'scaler_params.json')
    
    if not os.path.exists(model_path):
        logger.warning(f"Model not found at {model_path}. Train the FL model first.")
        return False
    
    try:
        import tensorflow as tf
        import json
        # Suppress TensorFlow warnings
        tf.get_logger().setLevel('ERROR')
        os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
        
        
        _model = tf.keras.models.load_model(model_path)
        MODEL_LOADED = True
        
        # Load label encoder
        if os.path.exists(label_encoder_path):
            with open(label_encoder_path, 'r') as f:
                _label_encoder = json.load(f)
        else:
            _label_encoder = {
                'class_names': ['BENIGN', 'ATTACK']
            }
            logger.warning("Using default class names (label encoder not found)")
        
        # Load scaler parameters (CRITICAL for correct normalization)
        if os.path.exists(scaler_path):
            with open(scaler_path, 'r') as f:
                _scaler_params = json.load(f)
            _scaler_params['mean'] = np.array(_scaler_params['mean'], dtype=np.float64)
            _scaler_params['scale'] = np.array(_scaler_params['scale'], dtype=np.float64)
            # Prevent division by zero
            _scaler_params['scale'][_scaler_params['scale'] == 0] = 1.0
        else:
            logger.error(f"SCALER PARAMS NOT FOUND at {scaler_path}! Classification will be inaccurate.")
            _scaler_params = None
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return False


def is_cooling_down(ip, alert_type):
    """Check if an alert is in cooldown period."""
    key = (ip, alert_type)
    if key in alert_cooldowns:
        if time.time() - alert_cooldowns[key] < COOLDOWN_SECONDS:
            return True
    return False


def mark_alert(ip, alert_type):
    """Mark an alert as sent for cooldown tracking."""
    alert_cooldowns[(ip, alert_type)] = time.time()





def extract_features(flow):
    """
    Extract CICIDS2017-format features from an NFStream flow.
    Maps NFStream attributes to the 46 features expected by the model.
    """
    
    # Safe attribute access helper
    def safe_get(obj, attr, default=0.0):
        try:
            val = getattr(obj, attr, default)
            if val is None:
                return default
            return float(val)
        except:
            return default
    
    # Calculate derived values
    duration_s = safe_get(flow, 'bidirectional_duration_ms', 0) / 1000.0
    if duration_s == 0:
        duration_s = 0.001  # Avoid division by zero
    
    total_packets = safe_get(flow, 'bidirectional_packets', 1)
    total_bytes = safe_get(flow, 'bidirectional_bytes', 0)
    
    src2dst_packets = safe_get(flow, 'src2dst_packets', 0)
    dst2src_packets = safe_get(flow, 'dst2src_packets', 0)
    
    # Protocol detection
    protocol = safe_get(flow, 'protocol', 0)
    is_tcp = 1.0 if protocol == 6 else 0.0
    is_udp = 1.0 if protocol == 17 else 0.0
    is_icmp = 1.0 if protocol == 1 else 0.0
    
    # Port-based service detection
    dst_port = safe_get(flow, 'dst_port', 0)
    src_port = safe_get(flow, 'src_port', 0)
    
    is_http = 1.0 if dst_port == 80 or src_port == 80 else 0.0
    is_https = 1.0 if dst_port == 443 or src_port == 443 else 0.0
    is_dns = 1.0 if dst_port == 53 or src_port == 53 else 0.0
    is_telnet = 1.0 if dst_port == 23 or src_port == 23 else 0.0
    is_smtp = 1.0 if dst_port == 25 or src_port == 25 else 0.0
    is_ssh = 1.0 if dst_port == 22 or src_port == 22 else 0.0
    is_irc = 1.0 if dst_port == 6667 or src_port == 6667 else 0.0
    is_dhcp = 1.0 if dst_port in [67, 68] or src_port in [67, 68] else 0.0
    
    # Calculate rates
    rate = total_packets / duration_s
    srate = src2dst_packets / duration_s
    drate = dst2src_packets / duration_s
    
    # Packet size statistics
    mean_ps = safe_get(flow, 'bidirectional_mean_ps', 0)
    std_ps = safe_get(flow, 'bidirectional_stddev_ps', 0)
    min_ps = safe_get(flow, 'bidirectional_min_ps', 0)
    max_ps = safe_get(flow, 'bidirectional_max_ps', 0)
    
    # Header length approximation (total bytes / packets gives average, subtract typical payload portion)
    header_length = total_bytes / max(total_packets, 1)
    
    # TCP flags (NFStream provides these for TCP flows)
    syn_count = safe_get(flow, 'src2dst_syn_packets', 0) + safe_get(flow, 'dst2src_syn_packets', 0)
    ack_count = safe_get(flow, 'src2dst_ack_packets', 0) + safe_get(flow, 'dst2src_ack_packets', 0)
    fin_count = safe_get(flow, 'src2dst_fin_packets', 0) + safe_get(flow, 'dst2src_fin_packets', 0)
    rst_count = safe_get(flow, 'src2dst_rst_packets', 0) + safe_get(flow, 'dst2src_rst_packets', 0)
    psh_count = safe_get(flow, 'src2dst_psh_packets', 0) + safe_get(flow, 'dst2src_psh_packets', 0)
    urg_count = safe_get(flow, 'src2dst_urg_packets', 0) + safe_get(flow, 'dst2src_urg_packets', 0)
    ece_count = safe_get(flow, 'src2dst_ece_packets', 0) + safe_get(flow, 'dst2src_ece_packets', 0)
    cwr_count = safe_get(flow, 'src2dst_cwr_packets', 0) + safe_get(flow, 'dst2src_cwr_packets', 0)
    
    # Inter-arrival time
    iat = safe_get(flow, 'bidirectional_mean_piat_ms', 0) * 1000  # Convert to microseconds like CICIDS
    
    # Derived statistics 
    magnitude = np.sqrt(total_bytes**2 + total_packets**2) if total_bytes > 0 else 0
    radius = np.sqrt(mean_ps**2 + std_ps**2) if mean_ps > 0 else 0
    covariance = mean_ps * std_ps  # Approximation
    variance = std_ps ** 2
    weight = total_bytes / max(duration_s, 0.001)  # Bytes per second
    
    # Build feature vector in exact column order
    features = [
        duration_s,                    # flow_duration
        header_length,                 # Header_Length
        protocol,                      # Protocol Type
        safe_get(flow, 'bidirectional_duration_ms', 0) / 1000,  # Duration (slightly different interpretation)
        rate,                          # Rate
        srate,                         # Srate
        drate,                         # Drate
        fin_count,                     # fin_flag_number
        syn_count,                     # syn_flag_number
        rst_count,                     # rst_flag_number
        psh_count,                     # psh_flag_number
        ack_count,                     # ack_flag_number
        ece_count,                     # ece_flag_number
        cwr_count,                     # cwr_flag_number
        ack_count,                     # ack_count (duplicate of flag)
        syn_count,                     # syn_count
        fin_count,                     # fin_count
        urg_count,                     # urg_count
        rst_count,                     # rst_count
        is_http,                       # HTTP
        is_https,                      # HTTPS
        is_dns,                        # DNS
        is_telnet,                     # Telnet
        is_smtp,                       # SMTP
        is_ssh,                        # SSH
        is_irc,                        # IRC
        is_tcp,                        # TCP
        is_udp,                        # UDP
        is_dhcp,                       # DHCP
        0.0,                           # ARP (not detectable at this layer)
        is_icmp,                       # ICMP
        1.0,                           # IPv (assuming IPv4)
        1.0,                           # LLC (assuming present)
        total_bytes,                   # Tot sum
        min_ps,                        # Min
        max_ps,                        # Max
        mean_ps,                       # AVG
        std_ps,                        # Std
        total_bytes,                   # Tot size
        iat,                           # IAT
        total_packets,                 # Number
        magnitude,                     # Magnitue (sic - matches original typo)
        radius,                        # Radius
        covariance,                    # Covariance
        variance,                      # Variance
        weight                         # Weight
    ]
    
    return np.array(features, dtype=np.float32)


def normalize_features(features):
    """
    Normalize features using the EXACT StandardScaler parameters saved during training.
    Applies per-feature normalization: (x_i - mean_i) / scale_i
    """
    global _scaler_params
    
    # Clean up NaN/Inf values
    features = np.nan_to_num(features, nan=0.0, posinf=1e6, neginf=-1e6)
    features = np.clip(features, -1e6, 1e6)
    
    if _scaler_params is not None:
        # Use the REAL scaler params from training (per-feature mean and scale)
        mean = _scaler_params['mean']
        scale = _scaler_params['scale']
        normalized = (features - mean) / scale
    else:
        # Fallback: log warning and do basic normalization
        logger.warning("No scaler params loaded! Using fallback normalization (results will be inaccurate)")
        mean = np.mean(features)
        std = np.std(features) if np.std(features) > 0 else 1.0
        normalized = (features - mean) / std
    
    return normalized.reshape(1, -1)


def classify_attack_type_ml(predictions):
    """
    Binary intrusion detection from sigmoid model output.
    Dense(1, sigmoid) outputs a single value: probability of ATTACK.
    
    Args:
        predictions: numpy array of shape (1,) — sigmoid output (attack probability)
    
    Returns:
        tuple: (is_attack, attack_confidence)
    """
    # Detection threshold — higher = fewer false positives
    # 0.95 = model must be 95%+ confident it's an attack before alerting
    ATTACK_THRESHOLD = 0.95
    
    attack_prob = float(predictions[0])   # Sigmoid output = attack probability
    
    is_attack = attack_prob > ATTACK_THRESHOLD
    
    # Scale confidence to a meaningful range (threshold..1.0 → 50%..100%)
    # So 0.75 → 50%, 0.875 → 75%, 1.0 → 100%
    if is_attack:
        scaled_confidence = 0.5 + 0.5 * (attack_prob - ATTACK_THRESHOLD) / (1.0 - ATTACK_THRESHOLD)
    else:
        scaled_confidence = attack_prob
    
    return is_attack, scaled_confidence


def emit_alert(flow, confidence, attack_type='ML_DETECTED', detected_by='FL Model'):
    """
    Emit intrusion alert to the dashboard via Socket.IO.

    Args:
        flow:        NFStream flow object (source of IP/port/protocol metadata).
        confidence:  Detection confidence (0.0–1.0).
        attack_type: Category tag — 'SYN_FLOOD', 'UDP_FLOOD', or 'ML_DETECTED'.
        detected_by: Engine that flagged the flow — 'FL Model' or 'Rule Engine'.
    """
    if not sio.connected:
        logger.warning("Not connected to server, cannot emit alert")
        return
    
    src_ip = getattr(flow, 'src_ip', 'Unknown')
    dst_ip = getattr(flow, 'dst_ip', 'Unknown')
    src_port = getattr(flow, 'src_port', 0)
    dst_port = getattr(flow, 'dst_port', 0)
    
    alert_data = {
        'attacker_ip': src_ip,
        'target_ip': dst_ip,
        'payload': {
            'type': 'INTRUSION',              # Kept for frontend backward-compat
            'attack_type': attack_type,        # NEW — granular category for dashboard
            'confidence': round(float(confidence), 4),
            'detected_by': detected_by,
            'flow_details': {
                'src': f"{src_ip}:{src_port}",
                'dst': f"{dst_ip}:{dst_port}",
                'protocol': getattr(flow, 'protocol', 0),
                'packets': getattr(flow, 'bidirectional_packets', 0),
                'bytes': getattr(flow, 'bidirectional_bytes', 0)
            }
        },
        'timestamp': time.time()
    }
    
    sio.emit('intrusion_detected', alert_data)
    logger.warning(
        f"⚠ {attack_type} DETECTED from {src_ip} "
        f"(confidence: {confidence:.1%}) [{detected_by}]"
    )


def process_flow(flow):
    """
    Process a single flow through both rule-based and ML detection.

    IMPORTANT ordering:
      1. IP filtering (localhost, private-only, suppressed, self-IP) — applies to all paths
      2. Rule-based flood detection — runs on ALL flows (including 1-packet)
      3. ML inference — only runs on flows with ≥2 packets and a loaded model

    hping3 --flood increments source port per packet, so NFStream creates a
    unique 5-tuple flow for each packet (bidirectional_packets=1).  The flood
    tracker MUST see these 1-packet flows to accumulate the sliding-window
    count; the old total_packets<2 gate was silently dropping them all.
    """
    global _model

    src_ip = getattr(flow, 'src_ip', 'Unknown')
    dst_ip = getattr(flow, 'dst_ip', 'Unknown')



    # ── IP Filtering (shared by ALL detection paths) ───────────────────

    # Skip localhost traffic
    if src_ip.startswith('127.') or src_ip == '::1':
        return

    # --- DEMO MODE: Only alert on RFC-1918 private/local subnet traffic ---
    try:
        import ipaddress
        _PRIVATE_NETS = [
            ipaddress.ip_network('10.0.0.0/8'),
            ipaddress.ip_network('172.16.0.0/12'),
            ipaddress.ip_network('192.168.0.0/16'),
        ]
        src_addr = ipaddress.ip_address(src_ip)
        if not any(src_addr in net for net in _PRIVATE_NETS):
            return
    except ValueError:
        return

    # Skip specific ignored IPs by prefix
    SUPPRESSED_IP_PREFIXES = [
        '4.',            # lumen cloud
        '::',            # IPv6 unspecified address
        '0.0.0.0',       # IPv4 unspecified address
        '2001:4860:',    # Google Global IPv6 range
        '2404:6800:',    # Google Asia-Pacific IPv6 range
        '64:ff9b:',      # IPv4-mapped IPv6 addresses
        'fe80:',         # Link-local addresses
        'ff02:',         # IPv6 multicast
        '2a04:4e42:'     # ESET Antivirus
    ]
    for prefix in SUPPRESSED_IP_PREFIXES:
        if src_ip.startswith(prefix):
            return

    # Skip flows originating FROM this machine (we're the target, not the attacker)
    dst_ip = getattr(flow, 'dst_ip', 'Unknown')
    try:
        import socket
        local_hostname = socket.gethostname()
        local_ips = set()
        for info in socket.getaddrinfo(local_hostname, None):
            local_ips.add(info[4][0])
        local_ips.update(['172.26.196.146', '192.168.56.1'])
        if src_ip in local_ips:
            return
    except:
        if src_ip in ('172.26.196.146', '192.168.56.1'):
            return

    # ── Rule-Based Flood Detection (runs on ALL flows, even 1-packet) ──
    # hping3 --flood creates thousands of 1-packet flows per second.
    # Each individually looks harmless, but the FloodTracker accumulates
    # their packet counts in a sliding window to detect the aggregate burst.
    try:
        flood_tracker.record_flow(src_ip, flow)

        for flood_type in ('SYN_FLOOD', 'UDP_FLOOD'):
            if flood_tracker.check_flood(src_ip, flood_type):
                if not is_cooling_down(src_ip, flood_type):
                    emit_alert(flow, confidence=0.99,
                               attack_type=flood_type,
                               detected_by='Rule Engine')
                    mark_alert(src_ip, flood_type)
    except Exception as e:
        logger.error(f"Error in flood detection: {e}")

    # ── ML Inference (requires model + meaningful flow size) ────────────
    # Skip 1-packet flows for ML — they lack enough statistical features
    # for reliable classification.  The flood tracker above already handles them.
    total_packets = getattr(flow, 'bidirectional_packets', 0) or 0
    if total_packets < 2:
        return

    if not MODEL_LOADED or _model is None:
        return

    try:
        features = extract_features(flow)
        features_normalized = normalize_features(features)
        predictions = _model.predict(features_normalized, verbose=0)[0]



        is_attack, attack_confidence = classify_attack_type_ml(predictions)

        if is_attack:
            if not is_cooling_down(src_ip, 'INTRUSION'):
                emit_alert(flow, attack_confidence,
                           attack_type='ML_DETECTED', detected_by='FL Model')
                mark_alert(src_ip, 'INTRUSION')

    except Exception as e:
        logger.error(f"Error in ML processing: {e}")


def emit_system_stats():
    """Periodically emit system stats to the dashboard."""
    import psutil
    
    while not EXIT_FLAG:
        if sio.connected:
            try:
                net_io = psutil.net_io_counters()
                stats = {
                    'cpu': psutil.cpu_percent(interval=None),
                    'ram': psutil.virtual_memory().percent,
                    'bytes_sent': net_io.bytes_sent,
                    'bytes_recv': net_io.bytes_recv
                }
                sio.emit('system_stats', stats)
            except Exception as e:
                logger.error(f"Failed to emit system stats: {e}")
        time.sleep(2)  # Emit every 2 seconds


def connect_to_server():
    """Establish connection to the Argus Dashboard Server."""
    while not EXIT_FLAG:
        try:
            if not sio.connected:
                sio.connect(SERVER_URL)
                sio.emit('sentry_connect', {'status': 'active', 'type': 'nfstream_ml'})
            time.sleep(5)
        except Exception as e:
            time.sleep(5)


def get_npcap_device_name(friendly_name):
    """
    Convert Windows friendly interface name to Npcap device format.
    Uses getmac command to find the GUID for the interface.
    Returns: \\Device\\NPF_{GUID} format or None
    """
    try:
        import subprocess
        import re
        
        # Run getmac to get interface details
        result = subprocess.run(
            ['getmac', '/v', '/fo', 'csv'],
            capture_output=True, text=True, timeout=5
        )
        
        if result.returncode != 0:
            return None
        
        # Parse CSV output to find matching interface
        lines = result.stdout.strip().split('\n')
        for line in lines[1:]:  # Skip header
            # Parse CSV: "Connection Name","Network Adapter","Physical Address","Transport Name"
            parts = line.split('","')
            if len(parts) >= 4:
                conn_name = parts[0].strip('"')
                transport = parts[3].strip('"')
                
                if conn_name == friendly_name and transport.startswith('\\Device\\Tcpip_'):
                    # Extract GUID and convert to NPF format
                    guid = transport.replace('\\Device\\Tcpip_', '')
                    npcap_name = f'\\Device\\NPF_{guid}'
                    return npcap_name
        
        return None
        
    except Exception as e:
        logger.warning(f"Could not convert to Npcap format: {e}")
        return None


def get_active_interface():
    """Auto-detect an active network interface on Windows."""
    try:
        import psutil
        
        # Get all interfaces with their stats
        stats = psutil.net_if_stats()
        addrs = psutil.net_if_addrs()
        
        # Priority order for interface selection
        preferred = ['WiFi', 'Wi-Fi', 'Ethernet', 'Ethernet 2', 'eth0', 'en0']
        
        # First try preferred interfaces that are UP
        selected_friendly = None
        for pref in preferred:
            if pref in stats and stats[pref].isup:
                selected_friendly = pref
                break
        
        # Fall back to any UP interface (excluding loopback)
        if selected_friendly is None:
            for iface, stat in stats.items():
                if stat.isup and 'loopback' not in iface.lower() and 'pseudo' not in iface.lower():
                    selected_friendly = iface
                    break
        
        if selected_friendly is None:
            # Last resort: list what's available
            logger.warning("No suitable interface found. Available interfaces:")
            for iface, stat in stats.items():
                status = "UP" if stat.isup else "DOWN"
                logger.warning(f"  - {iface} [{status}]")
            return None
        
        # On Windows, try to convert to Npcap device format
        if sys.platform == 'win32':
            npcap_name = get_npcap_device_name(selected_friendly)
            if npcap_name:
                return npcap_name
            else:
                logger.warning("Trying friendly name anyway...")
        
        return selected_friendly
        
    except Exception as e:
        logger.error(f"Failed to detect interface: {e}")
        return None


def start_flow_capture(interface=None):
    """Start capturing network flows using NFStream."""
    
    try:
        from nfstream import NFStreamer
    except ImportError:
        logger.error("NFStream not installed. Run: pip install nfstream")
        logger.error("Also ensure Npcap is installed on Windows with WinPcap API compatibility.")
        return
    
    if not load_model():
        logger.error("Failed to load ML model. Exiting.")
        return
    

    
    # Auto-detect interface if not specified
    if interface is None:
        interface = get_active_interface()
        if interface is None:
            logger.error("Could not auto-detect network interface.")
            logger.error("Please specify interface as argument: python nfstream_sentry.py <interface>")
            return
    

    
    try:
        # Create NFStreamer
        # idle_timeout:   max seconds of inactivity before flow expires
        #                 (lowered from 5→2s so stragglers expire faster during bursts)
        # active_timeout: max seconds a flow can stay active
        #                 (lowered from 30→10s so flood flows are reported 3× more often)
        streamer = NFStreamer(
            source=interface,
            idle_timeout=2,
            active_timeout=10,
            accounting_mode=1,  # Detailed packet-level stats
            statistical_analysis=True,  # Enable statistical features
        )
        

        
        flow_count = 0
        for flow in streamer:
            if EXIT_FLAG:
                break
                
            flow_count += 1
            
            process_flow(flow)
            
    except ValueError as e:
        # Interface name format issue on Windows
        logger.error(f"Interface error: {e}")
        logger.error(f"The interface '{interface}' may not be in the correct format for Npcap.")
        logger.error("On Windows, NFStream may require running as Administrator.")
        logger.error("Try specifying a different interface name.")
    except Exception as e:
        logger.error(f"NFStream capture failed: {e}")
        logger.error("Make sure Npcap is installed on Windows.")
        logger.error("Try running as Administrator for packet capture privileges.")


def main():
    """Main entry point."""
    global EXIT_FLAG
    

    
    # Get interface from args if provided
    interface = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Start connection thread
    conn_thread = threading.Thread(target=connect_to_server, daemon=True)
    conn_thread.start()
    
    # Start system stats emission thread
    stats_thread = threading.Thread(target=emit_system_stats, daemon=True)
    stats_thread.start()
    
    # Wait for connection
    time.sleep(2)
    
    try:
        # Start flow capture (blocks)
        start_flow_capture(interface)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        EXIT_FLAG = True
    

if __name__ == "__main__":
    main()
