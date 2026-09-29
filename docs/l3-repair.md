# AuraTrace L3 Autonomous Repair Engine

The L3 Repair Engine automates the validation, code patching, pull request generation, and deployment monitoring for diagnosed incidents.

---

## 1. Autonomous Healing Workflow

```text
               AI Diagnosis & Unified Diff Patch
                               │
                               ▼
                    Stage 1: Safety Gate
          (Path traversal & dangerous command checks)
                               │
                               ▼
                Stage 2: Mandatory Sandbox
          (Isolated workspace + allowlisted test suite)
                               │
                               ▼
               Stage 3: GitHub Branch Creation
                  (auratrace/repair/...)
                               │
                               ▼
                Stage 4: File Commit & Patch
                               │
                               ▼
               Stage 5: Pull Request Creation
                               │
                               ▼
                Stage 6: CI Polling & Gate
                 (wait_for_ci: check-runs)
                               │
                               ▼
                 Stage 7: Merge Execution
               (Auto-Merge or Manual Review)
                               │
                               ▼
             Stage 8: Post-Deploy Monitoring
          (Evaluate baseline vs. post-deploy errors)
                     ┌─────────┴─────────┐
                     ▼                   ▼
                  Healthy        Regression Detected
                                         │
                                         ▼
                                  Revert PR Opened
```

---

## 2. Safety Gate Rules (`backend/repair_engine/safety.py`)

- **Blocked Sensitive Files:** `.env`, `.env.*`, `id_rsa`, `*.pem`, `*.key`, `authorized_keys`, `credentials.json`, `service_account.json`.
- **Blocked System Directories:** `.git/`, `.ssh/`, `/etc/`, `/proc/`, `/sys/`, `/dev/`, `/root/`.
- **Blocked Execution Patterns in Diff:** `rm -rf /`, `mkfs`, fork bombs, `curl | sh`, `os.system`, `subprocess(shell=True)`, dynamic `eval`/`exec`.

---

## 3. Mandatory Sandbox Runner (`backend/repair_engine/sandbox.py`)

- Initializes an isolated temporary workspace.
- Applies patch with `git apply --ignore-whitespace`.
- Executes only allowlisted test runners:
  - `pytest`
  - `python -m pytest`
  - `npm test`
  - `npm run test`
- Enforces strict process isolation (`shell=False`) and timeout thresholds.
- Rejects any patch that fails tests or produces syntax compilation errors.

---

## 4. Post-Deployment Regression Guard (`backend/repair_engine/rollback.py`)

1. **Pre-Deploy Baseline:** Computes error rate in the 15-minute window before the repair run.
2. **Post-Deploy Monitoring:** Continuously tracks error rates and watches for incident recurrence after PR merge.
3. **Automated Rollback:** If the error rate increases above the configured threshold (e.g., `> 5%`) or the exact exception recurs, a revert PR is automatically opened and alerted via WebSocket.
