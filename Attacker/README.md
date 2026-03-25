# 🗡️ ARGUS-FL — Kali Linux Attack Toolkit

## Overview

Scripts to test the **ARGUS-FL Sentry IDS** from a **Kali Linux VM**. Generates real network traffic for Sentry's NFStream + FL Model pipeline to detect, and supports remote FL node poisoning.

> **⚠️ Authorized testing on YOUR OWN LAB network only. Unauthorized use is illegal.**

---

## Setup

### 1. Network Configuration
- **VirtualBox**: Set network adapter to **Bridged Adapter** (same network as host)
- Verify connectivity: `ping <HOST_IP>`

### 2. Install Dependencies
```bash
chmod +x setup.sh attacks.sh
sudo ./setup.sh
```

### 3. Find Your Target IP
On your **Windows host**, open PowerShell:
```powershell
ipconfig | findstr "IPv4"
```

---

## Attack Menu

| # | Attack | Category | Tool |
|---|--------|----------|------|
| 1 | SYN Stealth Scan | Reconnaissance | `nmap -sS` |
| 2 | OS Detection Scan | Reconnaissance | `nmap -O` |
| 3 | SYN Flood (TCP:80) | DDoS | `hping3 -S --flood` |
| 4 | UDP Flood (DNS:53) | DDoS | `hping3 --udp --flood` |
| 5 | Poison FL Node | Model Poisoning | Socket.IO event |

---

## Quick Start

```bash
sudo ./attacks.sh
```
Enter the victim IP when prompted, then choose an attack from the menu.

---

## Files

| File | Description |
|------|-------------|
| `README.md` | This file |
| `setup.sh` | Installs nmap, hping3, and python-socketio |
| `attacks.sh` | Interactive menu-driven attack launcher |

---

## Presentation Demo Script

1. **Start ARGUS-FL** on Windows host (`launch_Argus-FL.bat`)
2. **Open Dashboard** in browser (`http://localhost:3000/dashboard`)
3. **Start FL Training** from dashboard
4. **Run attacks from Kali**:
   ```bash
   sudo ./attacks.sh
   ```
5. Follow the menu:
   - Option 1-2: Recon scans (triggers detection in Sentry)
   - Option 3-4: DDoS floods (triggers attack alerts)
   - Option 5: Poison a node (corrupts model weights during FL training)
