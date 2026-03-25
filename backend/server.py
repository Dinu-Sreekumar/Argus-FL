import warnings
import os

# Suppress warnings BEFORE importing eventlet so the deprecation + RLock
# messages never print.  Must be the very first thing in the file.
warnings.filterwarnings("ignore", category=DeprecationWarning, module="eventlet")
warnings.filterwarnings("ignore", category=UserWarning, module="keras")
os.environ['EVENTLET_NO_GREENDNS'] = 'yes'  # Prevent greendns RLock warning

import eventlet
eventlet.monkey_patch()

import time
import json
import logging
import subprocess
import sys

# Suppress TensorFlow oneDNN logs (requires setting env var before import)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

from dotenv import load_dotenv

# Load .env environment variables
load_dotenv()

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO, emit

# Configure logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("ArgusServer")

# Silence Werkzeug logs
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# Setup Flask
app = Flask(__name__)

# Load Configuration
from core.config import Config
app.config.from_object(Config)
Config.init_app(app)

# Enable CORS for API routes with cookie support
CORS(app, supports_credentials=True, origins=Config.CORS_ORIGINS)

# Initialize Extensions
from core.extensions import db, login_manager
db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

# User Loader
from core.models import User, Incident
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Register Blueprints
from api.auth import auth as auth_blueprint
app.register_blueprint(auth_blueprint)

from utils.notifier import send_intrusion_alert, send_email_async, get_email_template
from sentry.ml_inference import inference_engine
from utils.reports import generate_security_report, generate_fl_report
from flask_login import login_required, current_user
from datetime import datetime
from flask import send_file, jsonify

# Initialize SocketIO with eventlet
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='eventlet')

# Global state
GLOBAL_ROUND_OFFSET = 0
nodes_state = {}
flower_subprocess = None  # Track the Flower subprocess
sentry_subprocess = None # Track Network Sentry
nfstream_subprocess = None  # Track NFStream ML Sentry
fl_metrics_history = []  # FL training metrics for report generation



import socket

def get_local_ip():
    """Detects the real local IP address of the machine (e.g. WiFi adapter IP)."""
    try:
        # Create a UDP socket and connect to an external address
        # This doesn't actually send data, but reveals which interface would be used
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

@socketio.on('connect')
def handle_connect():
    """Handle client connection."""
    local_ip = get_local_ip()
    socketio.emit('server_info', {'ip': local_ip})


@socketio.on('start_training')
def handle_start_training(data):
    """Starts the Flower server training process as a subprocess."""
    global flower_subprocess, GLOBAL_ROUND_OFFSET
    
    # Clear previous session metrics so report reflects only this run
    fl_metrics_history.clear()
    
    if data is None:
        data = {}
    rounds = data.get('rounds', 5)
    
    # Handle infinite training: -1 means "run until stopped"
    # We use a large number (10000) as "effectively infinite"
    if rounds == -1:
        rounds = 10000  # Will run until manually stopped
    
    # Check if Flower is already running
    if flower_subprocess and flower_subprocess.poll() is None:
        socketio.emit('server_status', {'status': 'already_running'})
        return
    
    # Clean up old files
    for f in ['training_metrics.json', 'training_complete.json', 'training_error.json']:
        filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), f)
        if os.path.exists(filepath):
            os.remove(filepath)
        if os.path.exists(f):
            os.remove(f)
    
    # Start Flower as a subprocess
    script_dir = os.path.dirname(os.path.abspath(__file__))
    flower_script = os.path.join(script_dir, 'core', 'flower_server.py')
    
    # Use the same Python interpreter and venv
    python_exe = sys.executable
    
    cmd = [python_exe, flower_script, str(rounds), str(GLOBAL_ROUND_OFFSET), 'demo_model.keras']
    flower_subprocess = subprocess.Popen(
        cmd,
        cwd=script_dir,  # Run from backend/ to ensure imports work
        text=True
    )
    
    # Only update offset for finite training runs
    if rounds < 10000:
        GLOBAL_ROUND_OFFSET += rounds
    
    socketio.emit('server_status', {'status': 'started', 'rounds': rounds})
    
    # Start monitoring the metrics file in a green thread
    eventlet.spawn(monitor_training_progress)


def monitor_training_progress():
    """Monitor training metrics file and emit updates."""
    last_round = -1
    # Use current directory (backend/)
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    metrics_file = os.path.join(root_dir, 'training_metrics.json')
    complete_file = os.path.join(root_dir, 'training_complete.json')
    error_file = os.path.join(root_dir, 'training_error.json')
    
    while True:
        eventlet.sleep(0.5)  # Check every 500ms
        
        # Check for new metrics
        if os.path.exists(metrics_file):
            try:
                with open(metrics_file, 'r') as f:
                    metrics = json.load(f)
                
                if metrics.get('round', -1) != last_round:
                    last_round = metrics['round']
                    socketio.emit('training_metrics', metrics)
                    
                    
                    # Store metrics for FL report generation
                    fl_metrics_history.append(metrics)
                    if len(fl_metrics_history) > 100:
                        fl_metrics_history[:] = fl_metrics_history[-100:]
            except (json.JSONDecodeError, KeyError) as e:
                pass  # File still being written

        # Check for error
        if os.path.exists(error_file):
            try:
                with open(error_file, 'r') as f:
                    error_data = json.load(f)
                logger.error(f"Flower error: {error_data}")
                socketio.emit('training_error', error_data)
            except:
                pass
            os.remove(error_file)
            break
        
        # Check for completion
        if os.path.exists(complete_file):
            socketio.emit('training_complete', {'status': 'finished'})
            try:
                os.remove(complete_file)
            except:
                pass
            break


@socketio.on('reset_round_count')
def handle_reset_round_count():
    """Resets the global round offset."""
    global GLOBAL_ROUND_OFFSET
    GLOBAL_ROUND_OFFSET = 0


@socketio.on('ping')
def handle_ping(data):
    """Echoes back the ping for latency measurement."""
    socketio.emit('pong', data)


@socketio.on('node_heartbeat')
def handle_node_heartbeat(data):
    """Updates the state of a specific node."""
    node_id = data.get('id')
    nodes_state[node_id] = {
        'id': node_id,
        'ip': data.get('ip', 'Unknown'),
        'loss': data.get('loss', 0.0),
        'status': data.get('status', 'ONLINE'),
        'last_seen': time.time()
    }
    nodes_list = [nodes_state[k] for k in sorted(nodes_state.keys())]
    socketio.emit('nodes_update', {'nodes': nodes_list})





@socketio.on('simulate_ml_attack')
def handle_simulate_ml_attack(data):
    """Handle ML simulation attack from attack console (Demo Mode)."""
    attack_type = data.get('attack_type', 'UNKNOWN')
    attacker_ip = data.get('attacker_ip', 'Unknown')
    
    # Run inference on attack sample
    result = inference_engine.predict(attack_type)
    
    if result.get('error'):
        logger.warning(f"ML Inference Error: {result['error']}")
        # Still emit alert with error info
        confidence = 0.0
    else:
        confidence = result.get('confidence', 0.0)
    
    # Emit intrusion alert with ML detection result
    socketio.emit('intrusion_alert', {
        'attacker_ip': attacker_ip,
        'payload': {
            'type': 'ML_DETECTED',
            'ml_attack_type': attack_type,
            'confidence': confidence,
            'detected_by': 'Federated Learning Model',
            'label': result.get('label', 'UNKNOWN')
        },
        'timestamp': time.time()
    })


@socketio.on('restart_system')
def handle_restart_system():
    """Restarts the entire Argus system."""
    subprocess.Popen("start cmd /c restart_system.bat", shell=True)


@socketio.on('stop_training')
def handle_stop_training():
    """Stops the current Flower training subprocess without killing the server."""
    global flower_subprocess
    if flower_subprocess:
        if flower_subprocess.poll() is None:
            
            # Windows-specific: Use taskkill to kill the process tree (/T) force (/F)
            try:
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(flower_subprocess.pid)],
                    check=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            except subprocess.CalledProcessError:
                # Process might have already died
                pass
            
            # Ensure python object is cleaned up
            flower_subprocess.poll()
            flower_subprocess = None
            
            # Clear metrics so report only reflects next session
            fl_metrics_history.clear()
            
            socketio.emit('server_status', {'status': 'stopped'})
            socketio.emit('training_complete', {'status': 'aborted'})
        else:
             flower_subprocess = None


@socketio.on('stop_all')
def handle_stop_all():
    """Stops all Argus processes."""
    subprocess.Popen("taskkill /F /IM python.exe /T && taskkill /F /IM node.exe /T", shell=True)
    os._exit(0)

# === SENTRY & INTRUSION HANDLERS ===
@socketio.on('sentry_connect')
def handle_sentry_connect(data):
    socketio.emit('sentry_status', {'status': 'active'})

@socketio.on('system_stats')
def handle_system_stats(data):
    """Forward system stats to frontend."""
    socketio.emit('system_stats', data)

@socketio.on('intrusion_detected')
def handle_intrusion(data):
    """Handle INTRUSION DETECTED event — save incident for all verified users."""
    # 1. Log detailed threat
    threat_ip = data.get('attacker_ip')
    target_ip = data.get('target_ip')  # The device being attacked (dst_ip from sentry)
    logger.critical(f"⚠ INTRUSION DETECTED FROM {threat_ip} targeting {target_ip}")
    
    # 2. Alert Frontend (Red Screen)
    socketio.emit('intrusion_alert', data)
    
    with app.app_context():
        # 3. Save incident for ALL verified users (single-network deployment).
        #    Previous per-user IP matching (last_login_ip == target_ip) was broken
        #    because localhost logins record 127.0.0.1 while the sentry reports
        #    the machine's real adapter IP — so no users ever matched.
        all_verified_users = User.query.filter_by(is_verified=True).all()
        
        # 4. Save one incident PER verified user
        for user in all_verified_users:
            try:
                new_incident = Incident(
                    user_id=user.id,
                    timestamp=datetime.now(),
                    attacker_ip=threat_ip,
                    payload=str(data.get('payload')),
                    action_taken='BLOCKED'
                )
                db.session.add(new_incident)
            except Exception as e:
                logger.error(f"Failed to save incident for user {user.id}: {e}")
        
        try:
            db.session.commit()
        except Exception as e:
            logger.error(f"Failed to commit incidents: {e}")
        
        # 5. Email users who have email alerts enabled
        email_users = [u for u in all_verified_users if u.email_alerts_enabled]
        for user in email_users:
            send_intrusion_alert(user.email, data, user_name=user.name or "Agent")

# === REPORTING ROUTES ===
@app.route('/api/report/download', methods=['GET'])
@login_required
def download_report():
    """Generates PDF and returns it as a download."""
    incidents = Incident.query.filter_by(user_id=current_user.id).order_by(Incident.timestamp.desc()).limit(100).all()
    pdf_buffer = generate_security_report(incidents)
    
    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f'Argus_Security_Report_{datetime.now().strftime("%Y%m%d")}.pdf',
        mimetype='application/pdf'
    )

@app.route('/api/report/email', methods=['POST'])
@login_required
def email_report():
    """Generates PDF and emails it to the current user."""
    incidents = Incident.query.filter_by(user_id=current_user.id).order_by(Incident.timestamp.desc()).limit(100).all()
    pdf_buffer = generate_security_report(incidents)
    
    user_name = current_user.name or "Agent"
    report_date = datetime.now().strftime('%Y-%m-%d  %H:%M:%S')
    subject = f"Argus Security Report - {datetime.now().strftime('%Y-%m-%d')}"
    
    html_content = f"""
    <p>Agent <span style="color: #FFD700; font-weight: bold;">{user_name}</span>,</p>
    <p>Your requested security incident report is attached to this transmission.</p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
        <tr>
            <td style="padding: 12px 16px; background: rgba(220, 20, 60, 0.08); border-left: 3px solid #DC143C; border-bottom: 1px solid #222;">
                <span style="display: block; font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Total Incidents</span>
                <span style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #DC143C;">{len(incidents)}</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; background: rgba(255, 215, 0, 0.05); border-left: 3px solid #FFD700; border-bottom: 1px solid #222;">
                <span style="display: block; font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">System</span>
                <span style="font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold; color: #FFD700;">ArgusFL</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; background: rgba(255, 255, 255, 0.03); border-left: 3px solid #555;">
                <span style="display: block; font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Generated At</span>
                <span style="font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold; color: #ffffff;">{report_date}</span>
            </td>
        </tr>
    </table>
    
    <p>The full report is attached as a PDF for your records.</p>
    """
    
    full_html = get_email_template("SECURITY REPORT", html_content)
    
    send_email_async(
        current_user.email, 
        subject, 
        full_html, 
        attachment_data=pdf_buffer, 
        attachment_name="Argus_Security_Report.pdf"
    )
    
    return jsonify({'message': 'Report sent to your email.'})


@app.route('/api/fl-report/download', methods=['GET'])
@login_required
def download_fl_report():
    """Generates FL Training PDF and returns it as a download."""
    pdf_buffer = generate_fl_report(fl_metrics_history, [])
    
    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f'Argus_FL_Report_{datetime.now().strftime("%Y%m%d")}.pdf',
        mimetype='application/pdf'
    )


@app.route('/api/fl-report/email', methods=['POST'])
@login_required
def email_fl_report():
    """Generates FL Training PDF and emails it to the current user."""
    pdf_buffer = generate_fl_report(fl_metrics_history, [])
    
    user_name = current_user.name or "Agent"
    report_date = datetime.now().strftime('%Y-%m-%d  %H:%M:%S')
    total_rounds = len(fl_metrics_history)
    latest_acc = f"{fl_metrics_history[-1].get('accuracy', 0) * 100:.2f}%" if fl_metrics_history else "N/A"
    subject = f"Argus-FL Training Report - {datetime.now().strftime('%Y-%m-%d')}"
    
    html_content = f"""
    <p>Agent <span style="color: #FFD700; font-weight: bold;">{user_name}</span>,</p>
    <p>Your Federated Learning training report is attached to this transmission.</p>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
        <tr>
            <td style="padding: 12px 16px; background: rgba(255, 215, 0, 0.08); border-left: 3px solid #FFD700; border-bottom: 1px solid #222;">
                <span style="display: block; font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Training Rounds</span>
                <span style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #FFD700;">{total_rounds}</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; background: rgba(220, 20, 60, 0.08); border-left: 3px solid #DC143C; border-bottom: 1px solid #222;">
                <span style="display: block; font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Final Accuracy</span>
                <span style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #DC143C;">{latest_acc}</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; background: rgba(255, 255, 255, 0.03); border-left: 3px solid #555;">
                <span style="display: block; font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Generated At</span>
                <span style="font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold; color: #ffffff;">{report_date}</span>
            </td>
        </tr>
    </table>
    
    <p>The full report with metrics, confusion matrix, and round-by-round data is attached as a PDF.</p>
    """
    
    full_html = get_email_template("FL TRAINING REPORT", html_content)
    
    send_email_async(
        current_user.email, 
        subject, 
        full_html, 
        attachment_data=pdf_buffer, 
        attachment_name="Argus_FL_Report.pdf"
    )
    
    return jsonify({'message': 'FL Report sent to your email.'})


@app.route('/api/toggle_email_alerts', methods=['POST'])
@login_required
def toggle_email_alerts():
    """Toggles the auto-email alert preference for the current user."""
    try:
        current_user.email_alerts_enabled = not current_user.email_alerts_enabled
        db.session.commit()
        return jsonify({'enabled': current_user.email_alerts_enabled})
    except Exception as e:
        logger.error(f"Failed to toggle email alerts: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_email_alert_status', methods=['GET'])
@login_required
def get_email_alert_status():
    """Returns the current user's email alert preference."""
    return jsonify({'enabled': current_user.email_alerts_enabled})

def start_sentry():
    """Legacy stub — the old network_sentry.py has been replaced by nfstream_sentry.py."""
    pass


def start_nfstream_sentry():
    """Spawns the NFStream ML Sentry subprocess for real-time ML detection."""
    global nfstream_subprocess
    script_dir = os.path.dirname(os.path.abspath(__file__))
    nfstream_script = os.path.join(script_dir, 'sentry', 'nfstream_sentry.py')
    python_exe = sys.executable
    
    # Check if NFStream sentry script exists
    if not os.path.exists(nfstream_script):
        logger.warning("NFStream sentry script not found. Skipping ML sentry.")
        return
    
    try:
        nfstream_subprocess = subprocess.Popen([python_exe, nfstream_script], cwd=script_dir)
    except Exception as e:
        logger.error(f"Failed to start NFStream sentry: {e}")


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        
    start_nfstream_sentry()
    
    socketio.run(app, host='0.0.0.0', port=5001, allow_unsafe_werkzeug=True)

