import argparse
import os
import time
import socket
import numpy as np

# Suppress TensorFlow/Keras noise
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import tensorflow as tf
tf.get_logger().setLevel('ERROR')
import flwr as fl
import socketio
import threading
import random
from sklearn.utils.class_weight import compute_class_weight
from sklearn.model_selection import train_test_split

def get_local_ip():
    """Get the local IP address of this machine."""
    try:
        # Connect to an external address to determine our local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except:
        return "127.0.0.1"

# 1. Setup
parser = argparse.ArgumentParser(description='Argus-FL Client')
parser.add_argument('--node-id', type=int, required=True, help='Client Node ID (1-3)')
args = parser.parse_args()

# Setup SocketIO Client for Heartbeat/Monitoring
sio = socketio.Client()
stop_heartbeat = False

# Global State
current_packet_loss = 0.0 # Shared state for network emulation

# === HETEROGENOUS DEVICE CONFIGURATION ===
# Simulate different processing speeds (Artificial Delay)
# NOTE: Delays disabled for stable demo - uncomment to re-enable
DEVICE_SPEED_DELAYS = {
    1: 0.0,  # Node 1: High-End PC (Fast)
    2: 0.0,  # Node 2: Mobile Device (Medium) - was 2.0
    3: 0.0   # Node 3: IoT Sensor (Slow) - was 4.0
}



def heartbeat_loop(node_id):
    """Reports node status to the dashboard server."""
    global current_packet_loss
    # Try to connect
    current_packet_loss = random.uniform(0.01, 0.05) # Start low
    
    while not stop_heartbeat:
        try:
            if not sio.connected:
                sio.connect('http://localhost:5001')
            
            # Simulate real stats - Mean Reverting Random Walk
            # If loss is high (>20%), bias towards recovery (negative change)
            # If loss is low (<5%), bias towards slight increase (network jitter)
            if current_packet_loss > 0.20:
                change = random.uniform(-0.08, -0.01) # Recovery bias
            elif current_packet_loss < 0.05:
                change = random.uniform(-0.01, 0.03) # Jitter bias
            else:
                change = random.uniform(-0.05, 0.05) # Random drift
                
            current_packet_loss += change
            
            # Clamp between 0.00 and 0.50 (0% to 50%)
            current_packet_loss = max(0.00, min(0.50, current_packet_loss))
            
            packet_loss_rounded = round(current_packet_loss, 3)
            ip_address = get_local_ip()  # Get real IP of this machine
            
            status_report = 'TRAINING'
            
            # If loss is high, report unstable
            if current_packet_loss > 0.30:
                status_report = 'UNSTABLE'
            
            sio.emit('node_heartbeat', {
                'id': node_id,
                'ip': ip_address,
                'loss': packet_loss_rounded,
                'status': status_report
            })
            time.sleep(3)
        except Exception as e:
            # print(f"Monitoring connection error: {e}")
            time.sleep(5)

# Start heartbeat in background
t = threading.Thread(target=heartbeat_loop, args=(args.node_id,), daemon=True)
t.start()

# 2. Data Loading
# Robust path finding for data file
script_dir = os.path.dirname(os.path.abspath(__file__))
# Look for data in backend/data (new location)
file_path = os.path.join(script_dir, "data", "partitions", f"client_{args.node_id}.npz")

if not os.path.exists(file_path):
     # Fallback: try looking up one level (if running from core/ or similar)
    file_path_up = os.path.join(os.path.dirname(script_dir), "data", "partitions", f"client_{args.node_id}.npz")
    if os.path.exists(file_path_up):
        file_path = file_path_up
    else:
        # Fallback 2: Old location support (just in case)
        file_path_old = os.path.join(script_dir, "partitions", f"client_{args.node_id}.npz")
        if os.path.exists(file_path_old):
            file_path = file_path_old
        else:
            raise FileNotFoundError(f"Could not find data file for client {args.node_id}. Searched at: {file_path}")


data = np.load(file_path)
x, y = data['x'], data['y']

# Split into train and test

x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42)

# 3. The Pro Fix (Class Imbalance)

NUM_CLASSES = 2  # Binary classification (0=BENIGN, 1=ATTACK)
unique_classes = np.unique(y_train)
class_weights_array = compute_class_weight(
    class_weight='balanced',
    classes=unique_classes,
    y=y_train
)
class_weights = dict(zip(unique_classes, class_weights_array))
# Ensure both classes have weights
for i in range(NUM_CLASSES):
    if i not in class_weights:
        class_weights[i] = 1.0

# === SECURITY OPTIMIZATION: RECALL BOOST ===
# Prioritize detecting attacks (Class 1) to reduce False Negatives
# We'd rather have false positives than miss real attacks
if 1 in class_weights:
    class_weights[1] *= 1.2



# 4. Model Architecture Factory - Binary Classification
def create_model():
    model = tf.keras.models.Sequential([
        tf.keras.layers.Dense(128, activation='relu', input_shape=(x_train.shape[1],)),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(64, activation='relu'),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dense(1, activation='sigmoid')  # Binary output
    ])
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), 
        loss='binary_crossentropy',  # Binary loss
        metrics=['accuracy']
    )
    return model

# 5. Flower Client
class ArgusClient(fl.client.NumPyClient):
    def __init__(self, model):
        self.model = model

    def get_parameters(self, config):
        return self.model.get_weights()

    def fit(self, parameters, config):
        # === HETEROGENEOUS DEVICE SIMULATION ===
        device_delay = DEVICE_SPEED_DELAYS.get(args.node_id, 1.0)
        if device_delay > 0:
            print(f"⏳ HETEROGENEOUS SIMULATION: Applying {device_delay}s processing delay...")
            time.sleep(device_delay)

        # === TRUE NETWORK EMULATION ===
        # Simulate Network Latency (reduced for demo)
        # Base latency 0.1s + variable latency based on packet loss
        simulated_latency = 0.1 + (current_packet_loss * 0.5)  # Reduced multiplier
        time.sleep(simulated_latency)
        
        # NOTE: Connection drop simulation disabled for stable demo
        # Uncomment below to re-enable network failure simulation
        # if current_packet_loss > 0.30: # 30% Threshold
        #     loss_percent = int(current_packet_loss * 100)
        #     print(f"❌ CRITICAL NETWORK ERROR: Packet Loss {loss_percent}% too high! Dropping connection...")
        #     raise ConnectionError("Simulated Network Failure")

        self.model.set_weights(parameters)
        
        # Normal Training
        local_epochs = 3  # Optimal for FL without client drift
        
        self.model.fit(
            x_train, 
            y_train, 
            epochs=local_epochs, 
            batch_size=32, 
            class_weight=class_weights,
            verbose=0
        )
            
        return self.model.get_weights(), len(x_train), {}

    def evaluate(self, parameters, config):
        # Network failure simulation disabled for stable demo
        # if current_packet_loss > 0.35:
        #      raise ConnectionError("Simulated Network Failure during Evaluation")
             
        self.model.set_weights(parameters)
        # Evaluation is always on honest data
        loss, accuracy = self.model.evaluate(x_test, y_test, verbose=0)
        
        # === BINARY SECURITY METRICS ===
        # Generate predictions (threshold for binary)
        y_pred_probs = self.model.predict(x_test, verbose=0)
        y_pred = (y_pred_probs.flatten() > 0.5).astype(int)
        
        # Binary precision, recall, F1
        tp = int(np.sum((y_pred == 1) & (y_test == 1)))  # Correctly detected attacks
        tn = int(np.sum((y_pred == 0) & (y_test == 0)))  # Correctly detected benign
        fp = int(np.sum((y_pred == 1) & (y_test == 0)))  # False alarm
        fn = int(np.sum((y_pred == 0) & (y_test == 1)))  # Missed attack
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        
        return float(loss), len(x_test), {
            "accuracy": float(accuracy),
            "f1_score": float(f1),
            "precision": float(precision),
            "recall": float(recall),
            "num_classes": NUM_CLASSES,
            "tp": tp,
            "tn": tn,
            "fp": fp,
            "fn": fn
        }

# 6. Execution
model = create_model()

# Robust Connection Loop
while True:
    try:
        fl.client.start_numpy_client(
            server_address="127.0.0.1:8080",
            client=ArgusClient(model)
        )
        print("Client session ended. Reconnecting in 5s...")
        time.sleep(5)
    except Exception as e:
        time.sleep(3)
    except KeyboardInterrupt:
        print("Client stopped.")
        stop_heartbeat = True
        if sio.connected:
            sio.disconnect()
        break
