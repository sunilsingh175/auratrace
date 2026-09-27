# 🎬 AuraTrace — 10-Minute Live Presentation & Demo Script

---

## ⏱️ Timeline & Presentation Flow

### **Minute 00:00 – 01:30 | The Problem & Industry Challenge**
> *"Good morning respected evaluators. In production distributed systems, when an application crashes, developers receive alerts but must spend an average of 60 to 90 minutes reading stack traces, identifying root causes, writing fixes, and deploying them. AuraTrace solves this by automating the entire lifecycle from crash detection to pull request creation and verification in under 60 seconds."*

---

### **Minute 01:30 – 03:00 | System Architecture Walkthrough**
- Open [ARCHITECTURE.md](file:///c:/Users/sunil/OneDrive/Documents/Desktop/final%20year%20project/AuraTrace/docs/ARCHITECTURE.md)
- Explain the 5 layers:
  1. Zero-config SDKs (Python & Node.js).
  2. Ingestion Gateway & Redis Stream Buffers.
  3. Isolation Forest ML Anomaly Detection.
  4. RAG Vector Search with pgvector & Gemini Diagnostic Doctor.
  5. Autonomous Repair Engine with 5-layer Safety Gates.

---

### **Minute 03:00 – 05:00 | Live SDK Crash Capture**
1. Open terminal and run the demo Python application:
   ```powershell
   python sdk\python\test_sdk.py
   ```
2. Point out that the integration requires **only 2 lines of code** with zero external dependencies.
3. Show that the SDK automatically sanitizes sensitive authorization tokens client-side.

---

### **Minute 05:00 – 07:30 | Live Dashboard & AI Root-Cause Diagnosis**
1. Switch to the Next.js Dashboard: **`http://localhost:3000`**
2. Show the newly detected incident card with:
   - Exception type (`TypeError`, `ZeroDivisionError`).
   - Calculated Isolation Forest anomaly score.
   - AI-generated root-cause explanation.
   - Synthesized unified-diff code patch with one-click copy.
   - Similar past historical incidents retrieved via pgvector cosine distance.

---

### **Minute 07:30 – 09:00 | Autonomous Auto-Repair & Safety Gates**
1. Open Project Settings at **`http://localhost:3000/projects/<id>/settings`**.
2. Show the **Auto-Repair** and **Auto-Merge** toggles.
3. Explain the **5 layers of defense**:
   - Patch syntax & forbidden commands validator.
   - Sandbox isolated test runner.
   - GitHub continuous integration check-runs monitor.
   - Sensitive file path blocklist (`auth/`, `payment/`, `billing/`).
   - 20-minute post-deploy error regression rollback guard.

---

### **Minute 09:00 – 10:00 | Conclusion & Q&A**
- Highlight the real-world impact: **MTTR reduced from 60+ minutes to 45 seconds**.
- Aligned with **UN Sustainable Development Goal 9 (Industry, Innovation & Infrastructure)**.
- Invite questions from the evaluation panel.
