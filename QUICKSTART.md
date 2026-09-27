# ⚡ AuraTrace Quick Start Guide

Get AuraTrace running locally or in production in under 5 minutes.

For the comprehensive 30+ page deployment handbook, see [docs/DEPLOYMENT_GUIDE.md](file:///docs/DEPLOYMENT_GUIDE.md).

---

## 💻 Local Development Setup

### 1. Prerequisites
- Docker Engine 24+ and Docker Compose v2
- Python 3.10+ (for running scripts & SDKs)
- Node.js 18+ (for frontend development & Node SDK)

### 2. One-Command Setup (Windows PowerShell)
```powershell
.\scripts\quick_start.ps1
```

### 3. Manual Launch (Linux / macOS / WSL)
```bash
# 1. Clone repo & prepare environment
cp .env.example .env

# 2. Build and launch all microservices
docker compose up -d --build

# 3. Verify health
python scripts/verify_pipeline.py
```

---

## 🌐 Endpoints & Dashboards

- **Web Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Ingestion API Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Prometheus Metrics:** [http://localhost:8000/metrics](http://localhost:8000/metrics)
- **Health Check:** [http://localhost:8000/health/detailed](http://localhost:8000/health/detailed)

---

## 🧪 Triggering a Live Demo Crash

Test the end-to-end detection and autonomous diagnosis:
```bash
# Python demo app:
python scripts/demo_python_app.py

# Node.js demo app:
node scripts/demo_node_app.js
```
