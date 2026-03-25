#!/bin/bash
# ============================================
# ARGUS-FL Kali Linux Setup Script
# Installs all required tools for attack testing
# ============================================

set -e

echo "================================================"
echo "  ARGUS-FL Sentry — Kali Linux Setup"
echo "================================================"
echo ""

# Update package lists
echo "[*] Updating package lists..."
sudo apt update -y

# Core attack tools
echo "[*] Installing core attack tools..."
sudo apt install -y \
    nmap \
    hping3 \
    curl \
    net-tools \
    iputils-ping \
    python3-pip

# Python Socket.IO client (for remote node poisoning)
echo "[*] Installing Python Socket.IO client..."
pip3 install "python-socketio[client]" 2>/dev/null || pip install "python-socketio[client]" 2>/dev/null || true

echo ""
echo "================================================"
echo "  ✓ Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Run: sudo ./attacks.sh"
echo "  2. Enter your Windows host IP when prompted"
echo ""
