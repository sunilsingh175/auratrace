# AuraTrace 2-Minute Autonomous Demo Guide

This script demonstrates the closed-loop autonomous diagnostic and self-healing lifecycle of AuraTrace.

---

## 1. Demo Timeline (Closed-Loop)

```text
00:00  Application runs healthy (live dashboard displays 0% error rate)
00:15  Simulated crash occurs in application (SDK intercepts uncaught exception)
00:25  ML Anomaly Engine detects anomaly score crossing threshold (> 0.75)
00:35  Incident is automatically registered in PostgreSQL and pushed via WebSocket
00:45  RAG retrieves top-3 historical fixes; Gemini synthesizes diagnosis & patch
01:10  Autonomous L3 repair initiates
01:20  Safety Gate & Sandbox verification tests PASS in isolated workspace
01:30  GitHub repair branch and Pull Request created automatically
01:40  CI check-runs verified & PR merged (Auto-merge or Manual Approval)
01:50  Post-deployment telemetry health monitoring active
02:00  Healthy verification confirmed (OR automated rollback revert PR on regression)
```

---

## 2. Running the E2E Demo

### Step 1: Start AuraTrace Stack
```bash
docker compose up -d
```

### Step 2: Open Dashboard
Navigate to `http://localhost:3000` and select/create a project.

### Step 3: Run the Application with SDK
```bash
# Python
export AURATRACE_API_KEY="your-project-api-key"
python -c "import auratrace; raise ConnectionResetError('PostgreSQL DB pool exhaustion at port 5432')"
```

### Step 4: Watch Autonomous Healing on Dashboard
- **Incidents Tab:** Anomaly appears instantly with stack trace and severity.
- **Crash Details:** Gemini root cause analysis and pgvector historical matches populate in real time.
- **L3 Repair Timeline:** Watch the live pipeline progress through Safety Check $\to$ Sandbox $\to$ GitHub Branch $\to$ Pull Request $\to$ CI $\to$ Post-Deploy Monitoring.
