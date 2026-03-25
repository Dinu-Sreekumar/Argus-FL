### **Project Context: Argus-FL Sentry Testing & Demo Strategy**

#### **1. Overview**

**Project:** Argus-FL (Federated Learning based Intrusion Detection System)
**Component:** Sentry (Real-time IDS)


**Goal:** Validate the Sentry's detection capabilities using a live "Attacker vs. Target" scenario and demonstrate this real-time detection during the final presentation.

#### **2. System Architecture**

The testing environment mimics a real-world Local Area Network (LAN) compromise or Insider Threat scenario.

* **Target (The Sentry):**
* **Host Machine:** Running the Argus-FL Sentry application.
* 
**Core Logic:** Uses `NFStream` for packet capture and the pre-trained `global_model.keras` for classification.


* **Role:** Passive monitoring of the network interface to detect anomalies.


* **Attacker (The Threat):**
* **Environment:** Virtual Machine (VirtualBox) running **Kali Linux**.
* **Role:** Active execution of network attacks against the Host IP.


* **Network Configuration:**
* **Connection:** Both Host and VM are connected to a **Personal Hotspot/Mobile Tethering**.
* **VirtualBox Mode:** **Bridged Adapter** (to place the VM on the same subnet as the Host) or **Host-Only Adapter** (fallback for isolation issues).
* **Visibility:** Both devices must be pingable from each other.



#### **3. Implementation Requirements**

**A. Sentry (Host Side) Code Context:**

* **Library:** `NFStream` must be configured to listen on the active network interface (e.g., "Wi-Fi" or "wlan0").
* 
**Model:** The script must load `global_model.keras` (generated from the FL training phase).


* 
**Output:** The UI must update in real-time to show alerts when attack signatures are detected.



**B. Attacker (Kali Side) Tools:**
The IDE should be aware that the following traffic patterns will be generated:

1. **Reconnaissance:** `nmap` scans (Port Scanning/Probing).
2. **Denial of Service:** `hping3` SYN floods (DoS detection).
3. **Brute Force:** `hydra` or `medusa` (optional, for specific service attacks).

#### **4. Testing Workflow (The "Script")**

This workflow serves as the verification checklist and the presentation demo script:

1. **Initialization:**
* Start the Sentry module in Argus-FL.
* Verify `global_model.keras` is loaded.
* Verify `NFStream` is capturing packets.


2. **Attack 1: Port Scanning (Probe)**
* *Action:* Attacker runs `nmap -F [HOST_IP]`.
* *Expected Result:* Sentry logs classify traffic as "Probe" or "Scan".


3. **Attack 2: SYN Flood (DoS)**
* *Action:* Attacker runs `hping3 -S -p 80 --flood [HOST_IP]`.
* *Expected Result:* Sentry detects high-volume SYN packets and flags "DoS".


4. **Attack 3: Normal Traffic (Baseline)**
* *Action:* Attacker simply pings or browses a hosted page.
* *Expected Result:* Sentry classifies traffic as "Benign/Normal".



#### **5. IDE Tasks & Prompts**

* *Task:* "Help me configure the `NFStreamer` source to dynamically detect the active network interface."
* *Task:* "Write a Python function to parse the live NFStream flow and pass the features to `global_model.predict()`."
* *Task:* "Debug why the VirtualBox VM cannot ping the Host machine (Windows Firewall/AP Isolation issues)."