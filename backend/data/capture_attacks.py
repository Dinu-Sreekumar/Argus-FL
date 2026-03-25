"""
Argus-FL Attack Capture Tool
==============================
Captures real network flows using NFStream, extracts the same 46 features
used in training, and saves them as labeled data for fine-tuning the FL model.

Usage:
    python capture_attacks.py process-pcap <pcap_file>   # Process a tcpdump .pcap file
    python capture_attacks.py capture                    # Live capture (admin required)
    python capture_attacks.py capture --benign           # Live capture benign flows  
    python capture_attacks.py merge <csv_file>            # Merge captured data into data.csv

Recommended workflow (VirtualBox + Kali):
    1. On Kali:  sudo tcpdump -i eth0 -w attack_capture.pcap
    2. Launch attacks from Kali
    3. Stop tcpdump (Ctrl+C)
    4. Copy .pcap to Windows
    5. On Windows: python capture_attacks.py process-pcap attack_capture.pcap
    6. python capture_attacks.py merge captured_attacks_XXXX.csv

Requirements:
    - NFStream (pip install nfstream)
    - Npcap on Windows (with WinPcap API compatibility)
"""

import os
import sys
import time
import argparse
import numpy as np
import pandas as pd
from multiprocessing import freeze_support
from datetime import datetime

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_CSV_PATH = os.path.join(SCRIPT_DIR, 'data.csv')

# Feature column order — MUST match data.csv exactly (46 features)
FEATURE_COLUMNS = [
    'flow_duration', 'Header_Length', 'Protocol Type', 'Duration', 'Rate', 'Srate', 'Drate',
    'fin_flag_number', 'syn_flag_number', 'rst_flag_number', 'psh_flag_number', 'ack_flag_number',
    'ece_flag_number', 'cwr_flag_number', 'ack_count', 'syn_count', 'fin_count', 'urg_count', 'rst_count',
    'HTTP', 'HTTPS', 'DNS', 'Telnet', 'SMTP', 'SSH', 'IRC', 'TCP', 'UDP', 'DHCP', 'ARP', 'ICMP', 'IPv', 'LLC',
    'Tot sum', 'Min', 'Max', 'AVG', 'Std', 'Tot size', 'IAT', 'Number', 'Magnitue', 'Radius', 'Covariance', 'Variance', 'Weight'
]


def extract_features(flow):
    """
    Extract 46 CICIDS-format features from an NFStream flow.
    This is the SAME logic as nfstream_sentry.py — keeping them in sync is critical.
    """
    def safe_get(obj, attr, default=0.0):
        try:
            val = getattr(obj, attr, default)
            return float(val) if val is not None else default
        except:
            return default

    # Duration
    duration_s = safe_get(flow, 'bidirectional_duration_ms', 0) / 1000.0
    if duration_s == 0:
        duration_s = 0.001

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

    # Rates
    rate = total_packets / duration_s
    srate = src2dst_packets / duration_s
    drate = dst2src_packets / duration_s

    # Packet size statistics
    mean_ps = safe_get(flow, 'bidirectional_mean_ps', 0)
    std_ps = safe_get(flow, 'bidirectional_stddev_ps', 0)
    min_ps = safe_get(flow, 'bidirectional_min_ps', 0)
    max_ps = safe_get(flow, 'bidirectional_max_ps', 0)

    header_length = total_bytes / max(total_packets, 1)

    # TCP flags
    syn_count = safe_get(flow, 'src2dst_syn_packets', 0) + safe_get(flow, 'dst2src_syn_packets', 0)
    ack_count = safe_get(flow, 'src2dst_ack_packets', 0) + safe_get(flow, 'dst2src_ack_packets', 0)
    fin_count = safe_get(flow, 'src2dst_fin_packets', 0) + safe_get(flow, 'dst2src_fin_packets', 0)
    rst_count = safe_get(flow, 'src2dst_rst_packets', 0) + safe_get(flow, 'dst2src_rst_packets', 0)
    psh_count = safe_get(flow, 'src2dst_psh_packets', 0) + safe_get(flow, 'dst2src_psh_packets', 0)
    urg_count = safe_get(flow, 'src2dst_urg_packets', 0) + safe_get(flow, 'dst2src_urg_packets', 0)
    ece_count = safe_get(flow, 'src2dst_ece_packets', 0) + safe_get(flow, 'dst2src_ece_packets', 0)
    cwr_count = safe_get(flow, 'src2dst_cwr_packets', 0) + safe_get(flow, 'dst2src_cwr_packets', 0)

    # Inter-arrival time
    iat = safe_get(flow, 'bidirectional_mean_piat_ms', 0) * 1000

    # Derived statistics
    magnitude = np.sqrt(total_bytes**2 + total_packets**2) if total_bytes > 0 else 0
    radius = np.sqrt(mean_ps**2 + std_ps**2) if mean_ps > 0 else 0
    covariance = mean_ps * std_ps
    variance = std_ps ** 2
    weight = total_bytes / max(duration_s, 0.001)

    # Build feature vector in exact column order
    features = [
        duration_s, header_length, protocol, 
        safe_get(flow, 'bidirectional_duration_ms', 0) / 1000,
        rate, srate, drate,
        fin_count, syn_count, rst_count, psh_count, ack_count,
        ece_count, cwr_count, ack_count, syn_count, fin_count, urg_count, rst_count,
        is_http, is_https, is_dns, is_telnet, is_smtp, is_ssh, is_irc,
        is_tcp, is_udp, is_dhcp, 0.0, is_icmp, 1.0, 1.0,
        total_bytes, min_ps, max_ps, mean_ps, std_ps, total_bytes,
        iat, total_packets, magnitude, radius, covariance, variance, weight
    ]

    return features


def get_active_interface():
    """Auto-detect active network interface (reused from sentry)."""
    try:
        import psutil
        stats = psutil.net_if_stats()
        preferred = ['WiFi', 'Wi-Fi', 'Ethernet', 'Ethernet 2', 'eth0', 'en0']
        
        for pref in preferred:
            if pref in stats and stats[pref].isup:
                return pref
        
        for iface, stat in stats.items():
            if stat.isup and 'loopback' not in iface.lower() and 'pseudo' not in iface.lower():
                return iface
        
        return None
    except:
        return None


def get_npcap_device_name(friendly_name):
    """Convert Windows friendly interface name to Npcap device format."""
    try:
        import subprocess
        import re
        result = subprocess.run(
            ['getmac', '/v', '/fo', 'csv'],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode != 0:
            return None
        
        lines = result.stdout.strip().split('\n')
        for line in lines[1:]:
            parts = line.split('","')
            if len(parts) >= 4:
                conn_name = parts[0].strip('"')
                transport = parts[3].strip('"')
                if conn_name == friendly_name and transport.startswith('\\Device\\Tcpip_'):
                    guid = transport.replace('\\Device\\Tcpip_', '')
                    npcap_name = f'\\Device\\NPF_{guid}'
                    return npcap_name
        return None
    except:
        return None


def capture_flows(label_name, interface=None, kali_ips=None):
    """
    Capture network flows and save as labeled training data.
    
    Args:
        label_name: 'AttackTraffic' or 'BenignTraffic' 
        interface: Network interface (auto-detected if None)
        kali_ips: List of IPs/prefixes to filter by (catches both IPv4 and IPv6)
    """
    try:
        from nfstream import NFStreamer
    except ImportError:
        print("ERROR: NFStream not installed. Run: pip install nfstream")
        print("Also ensure Npcap is installed on Windows.")
        return

    # Auto-detect interface
    if interface is None:
        interface = get_active_interface()
        if interface is None:
            print("ERROR: Could not auto-detect network interface.")
            return
        print(f"Auto-detected interface: {interface}")
        
        # Convert to Npcap format on Windows
        if sys.platform == 'win32':
            npcap_name = get_npcap_device_name(interface)
            if npcap_name:
                print(f"Using Npcap device: {npcap_name}")
                interface = npcap_name

    # Output file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    label_tag = 'attacks' if label_name == 'AttackTraffic' else 'benign'
    output_file = os.path.join(SCRIPT_DIR, f'captured_{label_tag}_{timestamp}.csv')

    def matches_kali(ip):
        """Check if an IP matches any of the Kali IPs/prefixes."""
        if not kali_ips:
            return True  # No filter = capture everything
        return any(ip == k or ip.startswith(k) for k in kali_ips)

    print("=" * 60)
    print(f"  ARGUS-FL TRAFFIC CAPTURE TOOL")
    print(f"  Label: {label_name}")
    print(f"  Interface: {interface}")
    if kali_ips:
        print(f"  Kali IP Filter: {', '.join(kali_ips)}")
        print(f"    (flows matching ANY of these IPs/prefixes will be captured)")
    else:
        print(f"  IP Filter: NONE (capturing ALL flows)")
    print(f"  Output: {output_file}")
    print("=" * 60)
    
    if label_name == 'AttackTraffic':
        print("\n  Launch your Kali attacks NOW.")
        print("  All captured flows will be labeled as ATTACK.")
    else:
        print("\n  Capturing normal/benign traffic.")
        print("  Do NOT launch any attacks during this capture.")
    
    print("  Press Ctrl+C to stop capture.\n")

    # Collect rows
    rows = []
    flow_count = 0
    skipped = 0

    try:
        streamer = NFStreamer(
            source=interface,
            idle_timeout=5,
            active_timeout=30,
            accounting_mode=1,
            statistical_analysis=True,
        )

        for flow in streamer:
            # Skip tiny flows (noise)
            total_packets = getattr(flow, 'bidirectional_packets', 0) or 0
            if total_packets < 2:
                skipped += 1
                continue

            # Skip localhost
            src_ip = getattr(flow, 'src_ip', '')
            dst_ip = getattr(flow, 'dst_ip', '')
            if src_ip.startswith('127.') or src_ip == '::1':
                skipped += 1
                continue

            # Filter by Kali IP(s) if specified
            if kali_ips and not matches_kali(src_ip) and not matches_kali(dst_ip):
                skipped += 1
                continue

            # Extract features
            features = extract_features(flow)
            
            # Add label
            row = features + [label_name]
            rows.append(row)
            flow_count += 1

            if flow_count % 10 == 0:
                src = getattr(flow, 'src_ip', '?')
                dst = getattr(flow, 'dst_ip', '?')
                proto = getattr(flow, 'protocol', '?')
                print(f"  [{flow_count}] {src} -> {dst} (proto={proto}, pkts={total_packets})")

    except KeyboardInterrupt:
        print(f"\n  Capture stopped by user.")
    except Exception as e:
        print(f"\n  Capture error: {e}")

    if flow_count == 0:
        print("  No flows captured. Nothing to save.")
        return

    # Save to CSV
    columns = FEATURE_COLUMNS + ['label']
    df = pd.DataFrame(rows, columns=columns)
    df.to_csv(output_file, index=False)

    print(f"\n{'=' * 60}")
    print(f"  CAPTURE COMPLETE")
    print(f"  Flows captured: {flow_count}")
    print(f"  Flows skipped:  {skipped} (noise/localhost)")
    print(f"  Label:          {label_name}")
    print(f"  Saved to:       {output_file}")
    print(f"{'=' * 60}")
    print(f"\n  Next step: python capture_attacks.py merge {os.path.basename(output_file)}")


def merge_captured_data(csv_file):
    """Merge a captured CSV file into the main data.csv training data."""
    
    # Resolve path
    if not os.path.isabs(csv_file):
        csv_file = os.path.join(SCRIPT_DIR, csv_file)
    
    if not os.path.exists(csv_file):
        print(f"ERROR: File not found: {csv_file}")
        return
    
    if not os.path.exists(DATA_CSV_PATH):
        print(f"ERROR: Training data not found: {DATA_CSV_PATH}")
        return

    # Load captured data
    captured_df = pd.read_csv(csv_file)
    print(f"Loaded captured data: {len(captured_df)} rows from {os.path.basename(csv_file)}")
    
    # Validate columns
    expected_columns = FEATURE_COLUMNS + ['label']
    if list(captured_df.columns) != expected_columns:
        print("ERROR: Column mismatch! Captured data columns don't match expected format.")
        print(f"  Expected: {expected_columns[:5]}... ({len(expected_columns)} columns)")
        print(f"  Got:      {list(captured_df.columns)[:5]}... ({len(captured_df.columns)} columns)")
        return

    # Load existing training data
    existing_df = pd.read_csv(DATA_CSV_PATH)
    print(f"Existing training data: {len(existing_df)} rows")
    
    # Show label distribution before merge
    print("\nBefore merge:")
    benign_before = (existing_df['label'] == 'BenignTraffic').sum()
    attack_before = (existing_df['label'] != 'BenignTraffic').sum()
    print(f"  BENIGN: {benign_before}")
    print(f"  ATTACK: {attack_before}")

    # Show what we're adding
    captured_labels = captured_df['label'].value_counts()
    print(f"\nAdding from capture:")
    for label, count in captured_labels.items():
        label_type = "BENIGN" if label == "BenignTraffic" else "ATTACK"
        print(f"  {label_type} ({label}): {count}")

    # Merge
    merged_df = pd.concat([existing_df, captured_df], ignore_index=True)
    
    # Backup original
    backup_path = DATA_CSV_PATH + '.backup'
    if not os.path.exists(backup_path):
        existing_df.to_csv(backup_path, index=False)
        print(f"\nOriginal data backed up to: {os.path.basename(backup_path)}")

    # Save merged
    merged_df.to_csv(DATA_CSV_PATH, index=False)

    # Show label distribution after merge
    print(f"\nAfter merge: {len(merged_df)} total rows")
    benign_after = (merged_df['label'] == 'BenignTraffic').sum()
    attack_after = (merged_df['label'] != 'BenignTraffic').sum()
    print(f"  BENIGN: {benign_after} (+{benign_after - benign_before})")
    print(f"  ATTACK: {attack_after} (+{attack_after - attack_before})")

    print(f"\n{'=' * 60}")
    print(f"  MERGE COMPLETE")
    print(f"  Training data updated: {DATA_CSV_PATH}")
    print(f"{'=' * 60}")
    print(f"\n  Next step: python backend/data/process_data.py")
    print(f"  Then retrain: start FL server + clients")


def process_pcap(pcap_file, label_name, kali_ips=None):
    """
    Process a tcpdump .pcap file offline with NFStream.
    This is the recommended approach when VirtualBox prevents live capture.
    
    Args:
        pcap_file: Path to .pcap file (captured on Kali with tcpdump)
        label_name: 'AttackTraffic' or 'BenignTraffic'
        kali_ips: Optional list of IPs/prefixes to filter by
    """
    try:
        from nfstream import NFStreamer
    except ImportError:
        print("ERROR: NFStream not installed. Run: pip install nfstream")
        return

    if not os.path.exists(pcap_file):
        print(f"ERROR: File not found: {pcap_file}")
        return

    def matches_kali(ip):
        if not kali_ips:
            return True
        return any(ip == k or ip.startswith(k) for k in kali_ips)

    # Output file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    label_tag = 'attacks' if label_name == 'AttackTraffic' else 'benign'
    output_file = os.path.join(SCRIPT_DIR, f'captured_{label_tag}_{timestamp}.csv')

    print("=" * 60)
    print(f"  PROCESSING PCAP FILE")
    print(f"  Input:  {pcap_file}")
    print(f"  Label:  {label_name}")
    if kali_ips:
        print(f"  IP Filter: {', '.join(kali_ips)}")
    print(f"  Output: {output_file}")
    print("=" * 60)

    rows = []
    flow_count = 0
    skipped = 0

    try:
        streamer = NFStreamer(
            source=pcap_file,
            idle_timeout=5,
            active_timeout=30,
            accounting_mode=1,
            statistical_analysis=True,
        )

        for flow in streamer:
            total_packets = getattr(flow, 'bidirectional_packets', 0) or 0
            if total_packets < 2:
                skipped += 1
                continue

            src_ip = getattr(flow, 'src_ip', '')
            dst_ip = getattr(flow, 'dst_ip', '')
            if src_ip.startswith('127.') or src_ip == '::1':
                skipped += 1
                continue

            if kali_ips and not matches_kali(src_ip) and not matches_kali(dst_ip):
                skipped += 1
                continue

            features = extract_features(flow)
            row = features + [label_name]
            rows.append(row)
            flow_count += 1

            src = getattr(flow, 'src_ip', '?')
            dst = getattr(flow, 'dst_ip', '?')
            proto = getattr(flow, 'protocol', '?')
            dport = getattr(flow, 'dst_port', '?')
            print(f"  [{flow_count}] {src} -> {dst}:{dport} proto={proto} pkts={total_packets}")

    except Exception as e:
        print(f"  Error processing pcap: {e}")

    if flow_count == 0:
        print("\n  No flows extracted. The pcap might be empty or all flows were filtered.")
        return

    columns = FEATURE_COLUMNS + ['label']
    df = pd.DataFrame(rows, columns=columns)
    df.to_csv(output_file, index=False)

    print(f"\n{'=' * 60}")
    print(f"  PROCESSING COMPLETE")
    print(f"  Flows extracted: {flow_count}")
    print(f"  Flows skipped:   {skipped} (noise/localhost/filtered)")
    print(f"  Label:           {label_name}")
    print(f"  Saved to:        {output_file}")
    print(f"{'=' * 60}")
    print(f"\n  Next step: python capture_attacks.py merge {os.path.basename(output_file)}")


def main():
    parser = argparse.ArgumentParser(
        description='Argus-FL Attack Capture Tool',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python capture_attacks.py process-pcap attack_capture.pcap                      Process pcap from Kali
  python capture_attacks.py process-pcap attack.pcap --kali-ip 172.26.196.55      Filter by Kali IP
  python capture_attacks.py process-pcap benign.pcap --benign                     Label as benign
  python capture_attacks.py capture --kali-ip 172.26.196.55 2409:40f3:23:88fd     Live capture
  python capture_attacks.py merge captured_attacks_XXXX.csv                       Merge into data.csv
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Process-pcap subcommand (RECOMMENDED)
    pcap_parser = subparsers.add_parser('process-pcap', help='Process a tcpdump .pcap file (recommended)')
    pcap_parser.add_argument('pcap_file', type=str, help='Path to .pcap file')
    pcap_parser.add_argument('--benign', action='store_true',
                             help='Label flows as BenignTraffic instead of AttackTraffic')
    pcap_parser.add_argument('--kali-ip', type=str, nargs='+', default=None,
                             help='Filter by Kali IPs/prefixes')

    # Capture subcommand (live)
    capture_parser = subparsers.add_parser('capture', help='Live capture (admin required)')
    capture_parser.add_argument('--benign', action='store_true', 
                                help='Label flows as BenignTraffic instead of AttackTraffic')
    capture_parser.add_argument('--kali-ip', type=str, nargs='+', default=None,
                                help='One or more Kali IPs or prefixes to filter by')
    capture_parser.add_argument('--interface', type=str, default=None,
                                help='Network interface to capture on (auto-detected if not specified)')
    
    # Merge subcommand  
    merge_parser = subparsers.add_parser('merge', help='Merge captured CSV into training data')
    merge_parser.add_argument('csv_file', type=str, help='Path to captured CSV file')
    
    args = parser.parse_args()
    
    if args.command == 'process-pcap':
        label = 'BenignTraffic' if args.benign else 'AttackTraffic'
        process_pcap(args.pcap_file, label, args.kali_ip)
    elif args.command == 'capture':
        label = 'BenignTraffic' if args.benign else 'AttackTraffic'
        capture_flows(label, args.interface, args.kali_ip)
    elif args.command == 'merge':
        merge_captured_data(args.csv_file)
    else:
        parser.print_help()


if __name__ == '__main__':
    freeze_support()
    main()
