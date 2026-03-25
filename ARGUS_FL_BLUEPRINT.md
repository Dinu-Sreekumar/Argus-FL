    # ARGUS-FL: Project Blueprint & Context

## 1. Project Overview
**Project Name:** Argus-FL (Federated Learning Intrusion Detection System)
**Concept:** A privacy-preserving security system for IoT Smart Homes.
**Core Metaphor:** Like the mythological Argus (100 eyes), this system uses multiple distributed devices to watch for network threats simultaneously without sharing private user data.

**Goal:** Demonstrate a working Federated Learning (FL) simulation where multiple clients (Smart Homes) train a local AI model on network traffic and share *only* model weights with a central server to build a "Global Model."

## 2. Tech Stack Constraints
The codebase must strictly adhere to this stack:

### Backend (The Brain)
*   **Language:** Python 3.9+
*   **FL Framework:** `flwr` (Flower) - *Strict requirement for FL logic.*
*   **ML Framework:** TensorFlow/Keras (Sequential Deep Learning Model).
*   **API/Bridge:** Flask + `flask_socketio` (To stream live training metrics to the frontend).
*   **Data Processing:** Pandas, NumPy, Scikit-Learn.

### Frontend (The Dashboard)
*   **Framework:** React.js (Create React App or Vite).
*   **Communication:** `socket.io-client` (Must listen to Backend events in real-time).
*   **Visualization:** `recharts` (Dynamic Line Charts for Accuracy/Loss) or `chart.js`.
*   **Styling:** Tailwind CSS or Material UI (Dark Mode / Cyber-Security Aesthetic).

### Dataset
*   **Source:** CIC-IoT-2023 (or NSL-KDD/UNSW-NB15).
*   **Strategy:** Data must be partitioned into 3 separate subsets to simulate 3 distinct clients.

---

## 3. Architecture & Data Flow

### The Components
1.  **Central Server (`server.py`):** 
    *   Orchestrates the Federated Learning rounds.
    *   Aggregates model weights (FedAvg).
    *   **Crucial:** Emits live stats (Round #, Accuracy, Loss) via Socket.IO to the React Frontend.
2.  **Clients (`client.py`):**
    *   Simulated IoT Nodes (e.g., Node 1, Node 2, Node 3).
    *   Each loads its own private `.csv` or `.npz` dataset.
    *   Trains locally for 1-5 epochs per round.
    *   Sends weights to Server.
3.  **The Dashboard:**
    *   Visualizes the "invisible" training process.

### The Loop
1.  Server starts -> Waits for Clients.
2.  Clients connect -> Server triggers "Round 1".
3.  Clients train on local data -> Send weights -> Server Averages weights.
4.  Server updates Global Model -> Emits `socket` event with new Accuracy score.
5.  React Dashboard updates graph instantly.
6.  Repeat for 5-10 Rounds.

---

## 4. Desired Feature List (The "Definition of Done")

### Phase 1: Backend Core
- [ ] **Data Splitter Script:** A utility script to clean the dataset and save it into 3 parts (`client_1_data`, `client_2_data`, `client_3_data`).
- [ ] **Model Definition:** A lightweight Keras model (Input Layer -> Dense -> Dropout -> Output).
- [ ] **Flower Client:** A class inheriting from `flwr.client.NumPyClient`.
- [ ] **Flower Server (Custom Strategy):** A custom strategy class that extracts metrics (Accuracy) after every round and sends them to the Flask-Socket bridge.

### Phase 2: Frontend Visualization
- [ ] **Live Accuracy Graph:** A line chart where X=Round, Y=Accuracy. It must animate live.
- [ ] **Network Grid:** A visual representation of 3 "Houses." They should blink/change color when they are "Training" vs "Idle."
- [ ] **Live Logs:** A scrolling terminal-like window showing messages (e.g., *"Argus Node 1: Threat Detected... Updating Weights"*).
- [ ] **Global Status:** Large metrics showing "Current Global Accuracy" and "Total Data Packets Scanned."

### Phase 3: The "Argus" Branding
- [ ] UI should feature a "Cyber/Dark" theme.
- [ ] Use Eye icons or Shield icons to represent the Nodes.
- [ ] Include a toggle or visual indicator showing "Privacy Mode: Active" (highlighting that raw data is not being sent).

---

## 5. Development Guidelines for AI Assistant

1.  **Code Structure:** Keep Backend and Frontend in separate root folders.
2.  **Documentation:** Comment the "Federated Averaging" step clearly so I can explain the math during the presentation.
3.  **Simulation:** Ensure the Python scripts can run on a single machine (using `localhost`) but simulate a distributed network using Threads or Processes.
4.  **Error Handling:** Handle cases where a client disconnects gracefully.

---

## 6. Seminar Context (Why we are building this)
*   **Privacy:** We are proving we don't need to send user data to the cloud.
*   **Security:** We are proving that collaborative learning is faster than isolated learning.
*   **Argus Metaphor:** We are building a "Decentralized Watchman."