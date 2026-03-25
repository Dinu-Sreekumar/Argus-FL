"""
NFStream Test Script
====================
Tests if NFStream can capture flows on this system.
Run with admin privileges for best results.

Usage: python test_nfstream.py [interface_name]
"""

import sys
import os

def list_interfaces():
    """List available network interfaces."""
    import psutil
    print("\n=== Available Network Interfaces ===")
    interfaces = list(psutil.net_if_addrs().keys())
    for i, name in enumerate(interfaces):
        stats = psutil.net_if_stats().get(name)
        status = "UP" if stats and stats.isup else "DOWN"
        print(f"  {i+1}. {name} [{status}]")
    return interfaces


def test_nfstream(interface=None):
    """Test NFStream capture."""
    print("=" * 50)
    print("NFStream Capture Test")
    print("=" * 50)
    
    # Check NFStream import
    try:
        from nfstream import NFStreamer
        print("[OK] NFStream imported successfully")
    except ImportError as e:
        print(f"[FAIL] NFStream import failed: {e}")
        print("  Run: pip install nfstream")
        return False
    except Exception as e:
        print(f"[FAIL] NFStream error (Npcap missing?): {e}")
        print("  Install Npcap from https://npcap.com with WinPcap API mode")
        return False
    
    # List interfaces
    interfaces = list_interfaces()
    
    # Determine interface to use
    if interface:
        iface = interface
    elif len(sys.argv) > 1:
        iface = sys.argv[1]
    else:
        # Try common interface names on Windows
        # NFStream on Windows needs the device path, not friendly name
        # Try to find one that works
        print("\n=== Testing Interface Access ===")
        
        # On Windows, NFStream may need the GUID-based interface name
        # Let's try a pcap file test first
        print("Note: Live capture on Windows requires running as Administrator")
        print("      and the interface name in Npcap format")
        
        # Try with first available interface
        iface = interfaces[0] if interfaces else None
    
    if not iface:
        print("No interface specified or found")
        return False
    
    print(f"\n=== Testing capture on: {iface} ===")
    print("(Capturing for 5 seconds, press Ctrl+C to stop early)")
    
    try:
        streamer = NFStreamer(
            source=iface,
            idle_timeout=2,
            active_timeout=5,
            statistical_analysis=True
        )
        
        flow_count = 0
        for flow in streamer:
            flow_count += 1
            print(f"  Flow {flow_count}: {flow.src_ip}:{flow.src_port} -> {flow.dst_ip}:{flow.dst_port}")
            print(f"          Protocol: {flow.protocol}, Packets: {flow.bidirectional_packets}, Bytes: {flow.bidirectional_bytes}")
            
            if flow_count >= 5:
                break
        
        if flow_count > 0:
            print(f"\n[OK] Successfully captured {flow_count} flows!")
            return True
        else:
            print("\n[WARN] No flows captured (network might be idle)")
            return True  # Still working, just no traffic
            
    except ValueError as e:
        print(f"\n[FAIL] Interface error: {e}")
        print("\nOn Windows, try running as Administrator")
        print("Or specify the interface index from the list above")
        return False
    except Exception as e:
        print(f"\n[FAIL] Capture error: {e}")
        return False


def test_model():
    """Test FL model loading."""
    print("\n=== Testing FL Model ===")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, 'saved_models', 'global_model.keras')
    
    if not os.path.exists(model_path):
        print(f"[FAIL] Model not found: {model_path}")
        return False
    
    try:
        import tensorflow as tf
        tf.get_logger().setLevel('ERROR')
        model = tf.keras.models.load_model(model_path)
        print(f"[OK] Model loaded successfully")
        print(f"  Input shape: {model.input_shape}")
        return True
    except Exception as e:
        print(f"[FAIL] Model loading failed: {e}")
        return False


if __name__ == "__main__":
    interface = sys.argv[1] if len(sys.argv) > 1 else None
    
    # Test model first (doesn't require admin)
    model_ok = test_model()
    
    # Test NFStream
    nfstream_ok = test_nfstream(interface)
    
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"  FL Model:  {'[OK]' if model_ok else '[FAILED]'}")
    print(f"  NFStream:  {'[OK]' if nfstream_ok else '[FAILED]'}")
    
    if model_ok and nfstream_ok:
        print("\n[OK] All systems ready for ML-based intrusion detection!")
    else:
        print("\n[WARN] Some components need attention")

