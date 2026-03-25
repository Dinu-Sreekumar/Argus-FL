# ARGUS-FL Website Blueprint
**Architecture Type**: Single Page Application (SPA) with Scroll-Based Navigation.

## 1. Design Philosophy
- **Theme**: Cyberpunk Blue (`#00b8ff`) & Deep Space Dark (`#0a0b10`).
- **Layout**: Verified single-column vertical scroll.
- **Navigation**: Sticky navbar that smooth-scrolls to anchors.

## 2. Page Structure (Sections)

### Section 1: Hero (Landing)
- **Visual**: Large "ARGUS-FL" title with glowing effect.
- **Content**: Tagline "The All-Seeing Guardian of Federated Learning".
- **Action**: "Launch System" button (Scrolls to Dashboard).

### Section 2: How It Works (Methodology)
- **Layout**: 3-Column Grid.
- **Items**:
    1.  **Edge Training**: Nodes train locally (Laptop/Phone Icons).
    2.  **Secure Updates**: Only weights are sent (Lock Icon).
    3.  **Global Aggregation**: Server refines the master model (Brain/Server Icon).

### Section 3: The "Why" (Importance)
- **Content**: Contrast traditional centralized learning (Privacy Risk) vs Federated Learning (Privacy Preserved).

### Section 4: Why "ARGUS"? (Brand Story)
- **Content**: Mythology reference. Argus Panoptes (the all-seeing giant). "We see the threats without seeing the data."

### Section 5: The Dashboard (Live System)
- **Content**: Embed the **entire existing `App.js` dashboard content** here.
- **Features**: Control Panel, Node Cards (with Attacks), Real-time Accuracy Graph.

### Section 6: Advanced Analytics (New Feature)
- **Confusion Matrix**:
    - Visual heatmap grid (Predicted vs Actual).
    - Shows True Positives (High accuracy) and False Negatives (Missed attacks).
- **Weight Distribution**:
    - Animated grid showing neural network weight magnitude changes.
- **Reporting**:
    - **"Generate Thesis PDF"** Button: Uses `jspdf` to download a report of the session.

### Section 7: Tech Stack
- **Content**: Grid of logos/names: TensorFlow, Flower (Flwr), React, Socket.IO, Python.

## 3. Technical Implementation
- **Scroll Linking**: Use `react-scroll` or simple `id` anchors.
- **Components**: Break down `App.js` into:
    - `HeroSection.js`
    - `InfoSection.js`
    - `DashboardSection.js` (The current App logic)
    - `AnalyticsSection.js` (New)
- **PDF Generation**: Add `jspdf` and `jspdf-autotable` dependency.

## 4. Next Steps
1.  Approve this blueprint.
2.  Refactor `App.js` to serve as the orchestrator of these sections.
3.  Implement the new "AnalyticsSection" with mock data for the heatmap initially (connected to real metrics later).
