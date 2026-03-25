import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print("Connected to server")
    print("Emitting start_training...")
    sio.emit('start_training', {'rounds': 5})

@sio.event
def server_status(data):
    print(f"Server Status: {data}")
    sio.disconnect()

@sio.event
def run_status(data):
    # Depending on what the server emits back
    print(f"Run Status: {data}")

try:
    sio.connect('http://localhost:5000')
    sio.wait()
except Exception as e:
    print(f"Error: {e}")
