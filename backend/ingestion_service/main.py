"""
AuraTrace Ingestion Gateway Service
High-throughput telemetry ingestion pipeline, real-time WebSocket broadcaster, and custom Swagger UI portal.
"""

import os
import json
import uuid
import logging
import asyncio
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

from fastapi import (
    FastAPI,
    HTTPException,
    Security,
    Depends,
    status,
    Header,
    WebSocket,
    WebSocketDisconnect,
    Query,
)
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel, Field
import redis.asyncio as aioredis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
try:
    from .auth import router as auth_router, init_auth_table, require_admin, get_current_user
except ImportError:
    from auth import router as auth_router, init_auth_table, require_admin, get_current_user

# ============================================================
# Logging Setup
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | auratrace-ingestion | %(message)s",
)
logger = logging.getLogger("auratrace-ingestion")

# ============================================================
# Environment & Configuration
# ============================================================

REDIS_HOST = os.getenv("REDIS_HOST", "redis-broker")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
STREAM_KEY = os.getenv("REDIS_STREAM_KEY", "telemetry_stream")
REDIS_ANOMALY_CHANNEL = os.getenv("REDIS_ANOMALY_CHANNEL", "anomaly_events")
MASTER_API_KEY = os.getenv("AURA_MASTER_API_KEY", "")
ENABLE_API_AUTH = os.getenv("ENABLE_API_AUTH", "true").lower() in ("true", "1", "yes")
DATABASE_URL = os.getenv("DATABASE_URL")

# Redis Async Client
redis_client = aioredis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    decode_responses=True,
)

# Async Database Engine
db_engine = None
if DATABASE_URL:
    try:
        db_engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
    except Exception as e:
        logger.warning(f"Database engine init warning: {e}")

# ============================================================
# WebSocket Connection Manager
# ============================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for dead in disconnected:
            self.disconnect(dead)

manager = ConnectionManager()

# Background task reference
pubsub_task: Optional[asyncio.Task] = None

async def redis_pubsub_bridge():
    """
    Subscribes to Redis Pub/Sub channel 'anomaly_events' and relays all
    anomalies (ANOMALY_DETECTED) and diagnoses (INCIDENT_DIAGNOSED)
    to connected WebSocket clients with explicit top-level and data fields.
    """
    while True:
        try:
            pubsub = redis_client.pubsub()
            await pubsub.subscribe(REDIS_ANOMALY_CHANNEL)
            logger.info(f"Subscribed to Redis Pub/Sub channel '{REDIS_ANOMALY_CHANNEL}'. Ready to bridge alerts to WebSocket.")

            async for message in pubsub.listen():
                if message["type"] == "message":
                    raw_data = message["data"]
                    try:
                        payload = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
                        event_type = payload.get("type") or payload.get("event") or "ANOMALY_ALERT"

                        # Deliver both structured event type and wrapped data payload
                        ws_message = {
                            "type": event_type,
                            "data": payload,
                            **payload,
                        }
                        ws_message["type"] = event_type

                        logger.info(f"Broadcasting Redis event [{event_type}] to {len(manager.active_connections)} WebSocket client(s)")
                        await manager.broadcast(ws_message)
                    except Exception as parse_err:
                        logger.warning(f"Error parsing Redis Pub/Sub message: {parse_err}")
        except asyncio.CancelledError:
            logger.info("Redis Pub/Sub bridge task cancelled.")
            break
        except Exception as exc:
            logger.warning(f"Redis Pub/Sub bridge connection error: {exc}. Reconnecting in 3s...")
            await asyncio.sleep(3)

# ============================================================
# FastAPI App Initialization (Custom Docs URL)
# ============================================================

app = FastAPI(
    title="⚡ Automatic Backend Diagnostics Platform API",
    version="1.2.0",
    description="""
# 🚀 Automatic Backend Diagnostics Platform
Autonomous telemetry ingestion pipeline, real-time Isolation Forest anomaly detection, pgvector similarity search, and RAG crash diagnostics doctor.
    """,
    docs_url=None,  # We will serve our custom styled Swagger UI at /docs
    redoc_url=None,
    openapi_tags=[
        {"name": "Telemetry Ingestion", "description": "High-throughput stream endpoints for sending log entries."},
        {"name": "Cluster Statistics", "description": "Real-time metrics, throughput, latency and active services count."},
        {"name": "Incidents & Diagnostics", "description": "Triage open anomalies, fetch RAG root-cause analysis and patches."},
        {"name": "Service Registry", "description": "Provision microservices and manage API keys."},
        {"name": "Chaos & Simulation", "description": "Trigger simulated crash scenarios for live demo testing."},
        {"name": "System Health", "description": "Liveness and cluster node readiness probes."},
    ],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(auth_router)

@app.on_event("startup")
async def startup_event():
    global pubsub_task
    pubsub_task = asyncio.create_task(redis_pubsub_bridge())
    try:
        await init_auth_table()
    except Exception as exc:
        logger.warning(f"Auth table init warning: {exc}")

@app.on_event("shutdown")
async def shutdown_event():
    global pubsub_task
    if pubsub_task:
        pubsub_task.cancel()
        try:
            await pubsub_task
        except asyncio.CancelledError:
            pass

# Configurable CORS Middleware (defaults to all origins for local dev)
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if "*" not in ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(api_key: Optional[str] = Security(API_KEY_HEADER)):
    """
    Validates incoming requests against master API key.
    When ENABLE_API_AUTH=true, enforces strict master API key verification.
    When ENABLE_API_AUTH=false (default development mode), permits requests with guest context.
    """
    if api_key and api_key == MASTER_API_KEY:
        return api_key
    if ENABLE_API_AUTH:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header. Access denied.",
        )
    return api_key or "guest"

# ============================================================
# Pydantic Schemas
# ============================================================

class TelemetryPayload(BaseModel):
    service_id: str = Field(..., description="Unique microservice identifier (e.g. 'payment-api')")
    message: Optional[str] = Field("Log event emitted", description="Log payload or exception message")
    level: Optional[str] = Field("INFO", description="Log severity: DEBUG, INFO, WARN, ERROR, CRITICAL")
    error_type: Optional[str] = Field(None, description="Exception class (e.g. 'sqlalchemy.exc.TimeoutError')")
    stack_trace: Optional[str] = Field(None, description="Complete Python/Node.js stack traceback")
    raw_stack_trace: Optional[str] = Field(None, description="Complete Python/Node.js stack traceback alias")
    latency_ms: Optional[float] = Field(0.0, ge=0, description="Measured execution duration in milliseconds")
    status_code: Optional[int] = Field(200, ge=100, le=599, description="HTTP status response code")
    anomaly_score: Optional[float] = Field(None, ge=0, le=1, description="Pre-computed anomaly confidence")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Arbitrary contextual tags (user_id, trace_id, route)")

class BatchTelemetryPayload(BaseModel):
    events: List[TelemetryPayload] = Field(..., description="Batch array of telemetry payloads")

class ServiceCreatePayload(BaseModel):
    id: Optional[str] = Field(None, description="Unique slug for service (e.g. 'inventory-sync')")
    name: str = Field(..., description="Human-readable service title")
    description: Optional[str] = Field(None, description="Service description")
    environment: str = Field("production", description="Environment: 'production', 'staging', 'development'")

class ServiceUpdatePayload(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    environment: Optional[str] = Field(None, pattern="^(development|staging|production)$")
    status: Optional[str] = Field(None, pattern="^(ACTIVE|INACTIVE|DEGRADED)$")

class IncidentStatusUpdate(BaseModel):
    status: str = Field(..., description="Target status: 'OPEN', 'INVESTIGATING', 'RESOLVED'")

class CrashSimulationPayload(BaseModel):
    scenario: str = Field(
        "db_pool_exhaustion",
        description="Scenario: 'db_pool_exhaustion', 'redis_consumer_lag', 'jwt_memory_leak', 'socket_timeout'"
    )
    service_id: Optional[str] = Field("payment-api", description="Service to simulate crash for")

# ============================================================
# Custom Swagger UI & Documentation Themes
# ============================================================

SWAGGER_CUSTOM_CSS = """
/* AuraTrace Custom Futuristic Dark Theme for Swagger UI */
:root {
  --bg-primary: #080c14;
  --bg-secondary: #0c1220;
  --bg-card: #0f172a;
  --bg-input: #1e293b;
  --border-color: #1e293b;
  --border-accent: #334155;
  --accent-cyan: #06b6d4;
  --accent-blue: #3b82f6;
  --accent-indigo: #6366f1;
  --accent-green: #10b981;
  --accent-rose: #f43f5e;
  --accent-amber: #f59e0b;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
}

body, .swagger-ui {
  background-color: var(--bg-primary) !important;
  color: var(--text-main) !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif !important;
  -webkit-font-smoothing: antialiased;
}

/* Custom Header Banner */
.auratrace-nav-banner {
  background: linear-gradient(135deg, #0f172a 0%, #080c14 100%);
  border-bottom: 1px solid #1e293b;
  padding: 16px 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  position: sticky;
  top: 0;
  z-index: 1000;
  backdrop-filter: blur(12px);
}

.auratrace-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.auratrace-logo-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.4);
}

.auratrace-title {
  font-size: 18px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.5px;
}

.auratrace-badge {
  background: rgba(6, 182, 212, 0.15);
  border: 1px solid rgba(6, 182, 212, 0.3);
  color: #22d3ee;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 6px;
  margin-left: 6px;
}

.auratrace-nav-links {
  display: flex;
  align-items: center;
  gap: 16px;
}

.auratrace-link {
  color: #94a3b8;
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #1e293b;
  background: #0f172a;
  transition: all 0.2s ease;
}

.auratrace-link:hover {
  color: #38bdf8;
  border-color: #38bdf8;
  background: #1e293b;
}

.auratrace-link.primary {
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
  color: #ffffff;
  border: none;
  box-shadow: 0 0 15px rgba(37, 99, 235, 0.3);
}

.auratrace-link.primary:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%);
}

/* Hide Default Swagger Topbar */
.swagger-ui .topbar {
  display: none !important;
}

/* Information Container */
.swagger-ui .info {
  margin: 30px 0 20px !important;
  background: #0c1220;
  border: 1px solid #1e293b;
  border-radius: 16px;
  padding: 24px 32px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
}

.swagger-ui .info .title {
  color: #ffffff !important;
  font-size: 26px !important;
  font-weight: 800 !important;
  letter-spacing: -0.5px !important;
}

.swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info table {
  color: #94a3b8 !important;
  font-size: 13px !important;
}

.swagger-ui .info a {
  color: #38bdf8 !important;
}

/* Operation Blocks (Endpoints) */
.swagger-ui .opblock-tag {
  color: #ffffff !important;
  font-size: 18px !important;
  font-weight: 800 !important;
  border-bottom: 1px solid #1e293b !important;
  margin: 30px 0 16px !important;
  padding-bottom: 10px !important;
}

.swagger-ui .opblock {
  background: #0f172a !important;
  border: 1px solid #1e293b !important;
  border-radius: 14px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
  margin: 0 0 16px !important;
  transition: all 0.2s ease !important;
  overflow: hidden !important;
}

.swagger-ui .opblock:hover {
  border-color: #38bdf8 !important;
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5) !important;
}

.swagger-ui .opblock .opblock-summary {
  padding: 12px 18px !important;
}

/* Method Badges */
.swagger-ui .opblock.opblock-post {
  border-color: rgba(16, 185, 129, 0.25) !important;
}
.swagger-ui .opblock.opblock-post .opblock-summary-method {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  border-radius: 8px !important;
  font-weight: 800 !important;
  font-size: 11px !important;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.3) !important;
}

.swagger-ui .opblock.opblock-get {
  border-color: rgba(59, 130, 246, 0.25) !important;
}
.swagger-ui .opblock.opblock-get .opblock-summary-method {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  border-radius: 8px !important;
  font-weight: 800 !important;
  font-size: 11px !important;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.3) !important;
}

.swagger-ui .opblock.opblock-patch {
  border-color: rgba(245, 158, 11, 0.25) !important;
}
.swagger-ui .opblock.opblock-patch .opblock-summary-method {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
  border-radius: 8px !important;
  font-weight: 800 !important;
  font-size: 11px !important;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.3) !important;
}

.swagger-ui .opblock.opblock-delete {
  border-color: rgba(244, 63, 94, 0.25) !important;
}
.swagger-ui .opblock.opblock-delete .opblock-summary-method {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%) !important;
  border-radius: 8px !important;
  font-weight: 800 !important;
  font-size: 11px !important;
  box-shadow: 0 0 12px rgba(244, 63, 94, 0.3) !important;
}

.swagger-ui .opblock-summary-path {
  color: #ffffff !important;
  font-family: "JetBrains Mono", monospace !important;
  font-size: 14px !important;
  font-weight: 600 !important;
}

.swagger-ui .opblock-summary-description {
  color: #94a3b8 !important;
  font-size: 12px !important;
}

.swagger-ui .opblock-body {
  background: #080c14 !important;
  border-top: 1px solid #1e293b !important;
}

/* Parameters & Input Elements */
.swagger-ui input[type=text],
.swagger-ui input[type=password],
.swagger-ui textarea,
.swagger-ui select {
  background: #0f172a !important;
  border: 1px solid #334155 !important;
  color: #f8fafc !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
  font-family: "JetBrains Mono", monospace !important;
  font-size: 12px !important;
}

.swagger-ui input:focus, .swagger-ui textarea:focus, .swagger-ui select:focus {
  border-color: #06b6d4 !important;
  outline: none !important;
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.2) !important;
}

/* Buttons */
.swagger-ui .btn {
  border-radius: 8px !important;
  font-weight: 700 !important;
  font-size: 12px !important;
  padding: 8px 16px !important;
  transition: all 0.2s ease !important;
}

.swagger-ui .btn.execute {
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%) !important;
  color: #ffffff !important;
  border: none !important;
  box-shadow: 0 0 15px rgba(37, 99, 235, 0.3) !important;
}

.swagger-ui .btn.execute:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%) !important;
  box-shadow: 0 0 20px rgba(37, 99, 235, 0.5) !important;
}

.swagger-ui .btn.authorize {
  color: #06b6d4 !important;
  border-color: #06b6d4 !important;
  background: rgba(6, 182, 212, 0.1) !important;
}

.swagger-ui .btn.cancel {
  border-color: #475569 !important;
  color: #cbd5e1 !important;
  background: #1e293b !important;
}

/* Schemas & Models */
.swagger-ui section.models {
  border: 1px solid #1e293b !important;
  border-radius: 16px !important;
  background: #0c1220 !important;
  margin-top: 30px !important;
  padding: 16px 24px !important;
}

.swagger-ui section.models h4 {
  color: #ffffff !important;
  font-size: 16px !important;
  font-weight: 800 !important;
}

.swagger-ui .model-box {
  background: #0f172a !important;
  border-radius: 8px !important;
  border: 1px solid #1e293b !important;
}

.swagger-ui .model-title {
  color: #38bdf8 !important;
  font-family: "JetBrains Mono", monospace !important;
}

/* Responses & Tables */
.swagger-ui table thead tr td, .swagger-ui table thead tr th {
  color: #94a3b8 !important;
  border-bottom: 1px solid #1e293b !important;
  font-size: 12px !important;
}

.swagger-ui .response-col_status {
  color: #38bdf8 !important;
  font-family: "JetBrains Mono", monospace !important;
  font-weight: 700 !important;
}

.swagger-ui .responses-inner h4, .swagger-ui .responses-inner h5 {
  color: #f8fafc !important;
}

.swagger-ui .highlight-code {
  background: #080c14 !important;
  border-radius: 8px !important;
  border: 1px solid #1e293b !important;
}
"""

SWAGGER_CUSTOM_JS = """
window.addEventListener('DOMContentLoaded', () => {
  // Inject custom top navigation bar
  const nav = document.createElement('div');
  nav.className = 'auratrace-nav-banner';
  nav.innerHTML = `
    <a href="/docs" class="auratrace-brand">
      <div class="auratrace-logo-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
      </div>
      <div>
        <span class="auratrace-title">Automatic Backend Diagnostics</span>
        <span class="auratrace-badge">v1.2 Live</span>
      </div>
    </a>
    <div class="auratrace-nav-links">
      <a href="http://localhost:3000/dashboard" target="_blank" class="auratrace-link primary">
        📊 Frontend Dashboard (Port 3000) ↗
      </a>
      <a href="/scalar" class="auratrace-link">
        ⚡ Scalar UI
      </a>
      <a href="/redoc" class="auratrace-link">
        📖 ReDoc
      </a>
      <a href="/api/v1/health" target="_blank" class="auratrace-link">
        🟢 Health
      </a>
    </div>
  `;
  document.body.prepend(nav);
});
"""

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """Serves custom-styled cyberpunk dark theme Swagger UI."""
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AuraTrace Ingestion Gateway | API Documentation</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" href="https://raw.githubusercontent.com/sunilsingh175/auratrace/complete-aura-trace/frontend/public/favicon.ico">
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        {SWAGGER_CUSTOM_CSS}
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
        {SWAGGER_CUSTOM_JS}
        window.onload = function() {{
            window.ui = SwaggerUIBundle({{
                url: "/openapi.json",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "BaseLayout"
            }});
        }};
    </script>
</body>
</html>
    """
    return HTMLResponse(content=html_content)

@app.get("/redoc", include_in_schema=False)
async def custom_redoc_html():
    """Serves clean Redoc documentation."""
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title="AuraTrace Telemetry Specs | ReDoc",
        redoc_favicon_url="https://raw.githubusercontent.com/sunilsingh175/auratrace/complete-aura-trace/frontend/public/favicon.ico",
    )

@app.get("/scalar", include_in_schema=False)
async def scalar_docs():
    """Serves ultra-modern interactive Scalar API documentation."""
    return HTMLResponse(f"""
<!doctype html>
<html>
  <head>
    <title>AuraTrace API Reference | Scalar</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="https://raw.githubusercontent.com/sunilsingh175/auratrace/complete-aura-trace/frontend/public/favicon.ico" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="{app.openapi_url}"
      data-proxy-url="https://api.scalar.com/request-proxy"
      data-theme="purple"
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
    """)


REDIS_ANOMALY_CHANNEL = os.getenv("REDIS_ANOMALY_CHANNEL", "anomaly_events")


# ============================================================
# Redis Pub/Sub -> WebSocket Bridge
# ============================================================

async def redis_pubsub_bridge():
    """
    Subscribes to Redis anomaly_events channel and forwards incoming
    ML anomalies and RAG AI diagnoses live to all connected WebSocket clients.
    """
    while True:
        try:
            pubsub_client = aioredis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                decode_responses=True,
            )
            pubsub = pubsub_client.pubsub()
            await pubsub.subscribe(REDIS_ANOMALY_CHANNEL)
            logger.info(f"FastAPI Redis Pub/Sub Bridge subscribed to channel '{REDIS_ANOMALY_CHANNEL}'")

            async for message in pubsub.listen():
                if not message or message.get("type") != "message":
                    continue
                raw_data = message.get("data")
                if not raw_data:
                    continue
                try:
                    event_data = json.loads(raw_data)
                    logger.info(
                        f"Bridge broadcasting PubSub event: {event_data.get('type')} | "
                        f"service={event_data.get('service_id')} | incident={event_data.get('incident_id')}"
                    )
                    await manager.broadcast({
                        "type": "ANOMALY_ALERT",
                        "data": event_data,
                    })
                except Exception as e:
                    logger.warning(f"Error parsing/broadcasting PubSub event: {e}")
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning(f"Redis Pub/Sub bridge connection dropped ({exc}), reconnecting in 2s...")
            await asyncio.sleep(2)


@app.on_event("startup")
async def startup_event():
    try:
        await init_auth_table()
    except Exception as exc:
        logger.warning(f"Auth table initialization skipped: {exc}")
    asyncio.create_task(redis_pubsub_bridge())


app.include_router(auth_router, prefix="/api/v1")
app.include_router(auth_router)
# ============================================================
# API Endpoints
# ============================================================

# 1. Telemetry Ingestion
@app.post(
    "/api/v1/telemetry",
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Telemetry Ingestion"],
    summary="Ingest single telemetry event",
    description="Accepts microservice error traces or performance logs, stores them in Redis Stream, and broadcasts via WebSocket.",
)
async def ingest_telemetry(
    payload: TelemetryPayload,
    api_key: str = Depends(verify_api_key),
):
    event_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    level = payload.level or ("ERROR" if payload.error_type else "INFO")
    stack_trace = payload.stack_trace or payload.raw_stack_trace or ""

    log_event = {
        "id": event_id,
        "type": "TELEMETRY",
        "service_id": payload.service_id,
        "message": payload.message or "Log payload",
        "log_message": payload.message or "Log payload",
        "level": level,
        "error_type": payload.error_type,
        "stack_trace": stack_trace,
        "raw_stack_trace": stack_trace,
        "latency_ms": payload.latency_ms or 0.0,
        "status_code": payload.status_code or 200,
        "anomaly_score": payload.anomaly_score,
        "metadata": payload.metadata,
        "timestamp": timestamp,
        "received_at": timestamp,
    }

    try:
        # Push into Redis Stream
        await redis_client.xadd(STREAM_KEY, {"payload": json.dumps(log_event)}, maxlen=10000)
    except Exception as exc:
        logger.error(f"Redis Stream push error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telemetry buffer stream unavailable.",
        )

    # Broadcast to live UI WebSocket connections
    await manager.broadcast({
        "type": "TELEMETRY_LOG",
        "data": log_event,
    })

    return {
        "status": "accepted",
        "event_id": event_id,
        "service_id": payload.service_id,
        "message": "Telemetry event queued for ML inference.",
    }


@app.post(
    "/api/v1/telemetry/batch",
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Telemetry Ingestion"],
    summary="Ingest batch telemetry events",
    description="Pushes a high-volume batch of log events atomically into the Redis ingestion stream.",
)
async def ingest_batch_telemetry(
    payload: BatchTelemetryPayload,
    api_key: str = Depends(verify_api_key),
):
    timestamp = datetime.now(timezone.utc).isoformat()
    count = 0
    pipe = redis_client.pipeline()

    for event in payload.events:
        event_dict = event.model_dump()
        event_dict["id"] = str(uuid.uuid4())
        event_dict["received_at"] = timestamp
        event_dict["timestamp"] = event_dict.get("timestamp") or timestamp
        stack_val = event_dict.get("stack_trace") or event_dict.get("raw_stack_trace") or ""
        event_dict["stack_trace"] = stack_val
        event_dict["raw_stack_trace"] = stack_val
        pipe.xadd(STREAM_KEY, {"payload": json.dumps(event_dict)}, maxlen=10000)
        count += 1
        await manager.broadcast({
            "type": "TELEMETRY_LOG",
            "data": event_dict,
        })

    await pipe.execute()
    return {
        "status": "accepted",
        "count": count,
        "message": f"Successfully queued {count} telemetry events.",
    }


# 2. Cluster Statistics
@app.get(
    "/api/v1/stats",
    tags=["Cluster Statistics"],
    summary="Fetch pipeline & cluster telemetry statistics",
)
async def get_cluster_stats(api_key: str = Depends(verify_api_key)):
    stream_length = 0

    try:
        stream_info = await redis_client.xinfo_stream(STREAM_KEY)
        stream_length = int(stream_info.get("length", 0))
    except Exception:
        pass

    if not db_engine:
        return {
            "events_per_sec": 0,
            "ingestion_rate_per_sec": 0,
            "total_logs_ingested": stream_length,
            "p95_latency_ms": 0,
            "error_ratio": 0,
            "error_rate_percent": 0,
            "open_incidents_count": 0,
            "active_services_count": 0,
            "redis_stream_length": stream_length,
            "status": "database_unavailable",
        }

    try:
        async with db_engine.connect() as conn:
            metrics = await conn.execute(text("""
                SELECT
                    COUNT(*) AS total_events,
                    COALESCE(
                        PERCENTILE_CONT(0.95)
                        WITHIN GROUP (ORDER BY latency_ms),
                        0
                    ) AS p95_latency_ms,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN status_code >= 400
                                OR level IN ('ERROR', 'CRITICAL')
                                THEN 1 ELSE 0
                            END
                        ),
                        0
                    ) AS error_count
                FROM telemetry_logs
                WHERE created_at >= NOW() - INTERVAL '5 minutes'
            """))

            row = metrics.first()

            total_events = int(row[0] or 0)
            p95_latency = float(row[1] or 0)
            error_count = int(row[2] or 0)

            error_rate = (
                (error_count / total_events) * 100
                if total_events
                else 0
            )

            incidents = await conn.execute(text("""
                SELECT COUNT(*)
                FROM incidents
                WHERE status IN ('OPEN', 'INVESTIGATING')
            """))

            active_services = await conn.execute(text("""
                SELECT COUNT(*)
                FROM services
                WHERE status = 'ACTIVE'
            """))

            open_incidents = int(incidents.scalar() or 0)
            service_count = int(active_services.scalar() or 0)

            ingestion_rate = total_events / 300

            return {
                "events_per_sec": round(ingestion_rate, 2),
                "ingestion_rate_per_sec": round(ingestion_rate, 2),
                "total_logs_ingested": stream_length,
                "p95_latency_ms": round(p95_latency, 2),
                "error_ratio": round(error_rate / 100, 4),
                "error_rate_percent": round(error_rate, 2),
                "open_incidents_count": open_incidents,
                "active_services_count": service_count,
                "redis_stream_length": stream_length,
                "status": "operational",
            }

    except Exception as exc:
        logger.error(f"Failed to calculate cluster statistics: {exc}")

        return {
            "events_per_sec": 0,
            "ingestion_rate_per_sec": 0,
            "total_logs_ingested": stream_length,
            "p95_latency_ms": 0,
            "error_ratio": 0,
            "error_rate_percent": 0,
            "open_incidents_count": 0,
            "active_services_count": 0,
            "redis_stream_length": stream_length,
            "status": "metrics_unavailable",
        }


@app.get(
    "/api/v1/stats/timeseries",
    tags=["Cluster Statistics"],
    summary="Get real-time telemetry time-series buckets",
)
async def get_stats_timeseries(
    window_seconds: int = Query(300, ge=30, le=3600),
    bucket_seconds: int = Query(5, ge=1, le=60),
    service_id: Optional[str] = Query(None, description="Filter by service identifier (name or UUID)"),
    api_key: str = Depends(verify_api_key),
):
    """
    Return real telemetry time-series data for the dashboard.
    Values are calculated directly from telemetry_logs grouped into buckets.
    """
    window_seconds = max(30, min(window_seconds, 3600))
    bucket_seconds = max(1, min(bucket_seconds, 60))

    if not db_engine:
        return {
            "window_seconds": window_seconds,
            "bucket_seconds": bucket_seconds,
            "points": [],
        }

    try:
        async with db_engine.connect() as conn:
            service_filter_sql = ""
            params: Dict[str, Any] = {}
            if service_id:
                service_filter_sql = """
                    AND service_id IN (
                        SELECT id FROM services WHERE id::text = :service_id OR name = :service_id
                    )
                """
                params["service_id"] = service_id

            stmt = text(f"""
                SELECT
                    to_timestamp(floor(extract(epoch FROM timestamp) / {bucket_seconds}) * {bucket_seconds}) AT TIME ZONE 'UTC' AS bucket,
                    COUNT(id) AS requests,
                    COALESCE(AVG(latency_ms), 0) AS avg_latency,
                    COALESCE(
                        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms),
                        0
                    ) AS p95_latency,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN status_code >= 400
                                OR level IN ('ERROR', 'CRITICAL')
                                OR error_type IS NOT NULL
                                THEN 1 ELSE 0
                            END
                        ),
                        0
                    ) AS errors
                FROM telemetry_logs
                WHERE timestamp >= NOW() - INTERVAL '{window_seconds} seconds'
                {service_filter_sql}
                GROUP BY 1
                ORDER BY 1 ASC
            """)

            result = await conn.execute(stmt, params)
            rows = result.fetchall()

            points = []
            for row in rows:
                reqs = int(row[1] or 0)
                errs = int(row[4] or 0)
                points.append({
                    "time": (
                        row[0].replace(tzinfo=timezone.utc).isoformat()
                        if hasattr(row[0], "replace")
                        else str(row[0])
                    ),
                    "requests": reqs,
                    "latency": round(float(row[2] or 0), 2),
                    "p95_latency": round(float(row[3] or 0), 2),
                    "errors": errs,
                    "error_rate": round((errs / reqs * 100.0) if reqs > 0 else 0.0, 2),
                })

            return {
                "window_seconds": window_seconds,
                "bucket_seconds": bucket_seconds,
                "points": points,
            }
    except Exception as exc:
        logger.error(f"Failed to calculate stats timeseries: {exc}")
        return {
            "window_seconds": window_seconds,
            "bucket_seconds": bucket_seconds,
            "points": [],
        }


# 3. Incidents & Diagnostics
@app.get(
    "/api/v1/incidents",
    tags=["Incidents & Diagnostics"],
    summary="List active anomalies and triaged incidents",
    description="Queries PostgreSQL for triaged incidents, ML outlier scores, and AI root cause diagnoses.",
)
async def list_incidents(
    status_filter: Optional[str] = Query(None, description="Filter by status: 'OPEN', 'INVESTIGATING', 'RESOLVED'"),
    service_id: Optional[str] = Query(None, description="Filter by service identifier"),
    limit: int = Query(20, ge=1, le=100, description="Max incidents to return"),
    api_key: str = Depends(verify_api_key),
):
    if db_engine:
        try:
            async with db_engine.connect() as conn:
                query_str = """
                    SELECT 
                        i.id,
                        i.service_id,
                        COALESCE(s.name, i.service_id::text) AS service_name,
                        i.anomaly_score,
                        i.severity,
                        i.status,
                        i.error_type,
                        i.stack_trace,
                        i.root_cause,
                        i.suggested_patch,
                        i.is_diagnosed,
                        i.created_at,
                        i.resolved_at
                    FROM incidents i
                    LEFT JOIN services s ON i.service_id = s.id
                    WHERE 1=1
                """
                params: Dict[str, Any] = {"limit": limit}

                if status_filter and status_filter != "ALL":
                    query_str += " AND i.status = :status_filter"
                    params["status_filter"] = status_filter

                if service_id:
                    query_str += " AND (s.name = :service_id OR i.service_id::text = :service_id)"
                    params["service_id"] = service_id

                query_str += " ORDER BY i.created_at DESC LIMIT :limit"

                result = await conn.execute(text(query_str), params)
                rows = result.fetchall()

                incidents = []
                for row in rows:
                    incidents.append({
                        "id": str(row[0]),
                        "service_id": row[2] or str(row[1]),
                        "title": f"{row[6] or 'Anomaly'} in {row[2] or 'service'}",
                        "error_type": row[6] or "System Anomaly",
                        "severity": (row[4] or "HIGH").lower(),
                        "status": row[5] or "OPEN",
                        "anomaly_score": float(row[3] or 0.0),
                        "created_at": row[11].isoformat() if row[11] else datetime.now(timezone.utc).isoformat(),
                        "resolved_at": row[12].isoformat() if row[12] else None,
                        "stack_trace": row[7] or "",
                        "raw_stack_trace": row[7] or "",
                        "ai_root_cause": row[8],
                        "ai_suggested_patch": row[9],
                        "ai_recommended_fix": row[9],
                        "is_diagnosed": bool(row[10]),
                    })

                if incidents:
                    return incidents
        except Exception as exc:
            logger.error(f"Error querying incidents from DB: {exc}")

    # Fallback to simulated defaults if DB is temporarily empty
    return []


@app.get(
    "/api/v1/incidents/{incident_id}",
    tags=["Incidents & Diagnostics"],
    summary="Get single incident diagnostic dossier",
)
async def get_incident(
    incident_id: str,
    api_key: str = Depends(verify_api_key),
):
    """
    Return the complete incident dossier.

    Includes:
      - ML anomaly information
      - stack trace
      - AI diagnosis
      - up to 3 historical fixes
      - calculated telemetry metrics for the affected service
    """

    if not db_engine:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable.",
        )

    try:
        async with db_engine.connect() as conn:

            # ========================================================
            # 1. Load incident + linked telemetry
            # ========================================================

            incident_stmt = text(
                """
                SELECT
                    i.id,
                    i.service_id,
                    COALESCE(s.name, i.service_id::text) AS service_name,
                    i.telemetry_id,
                    i.anomaly_score,
                    i.severity,
                    i.status,
                    i.error_type,
                    i.stack_trace,
                    i.root_cause,
                    i.suggested_patch,
                    i.is_diagnosed,
                    i.created_at,
                    i.resolved_at
                FROM incidents i
                LEFT JOIN services s
                    ON i.service_id = s.id
                WHERE
                    i.id::text = :id
                    OR i.id::text LIKE :id_prefix
                LIMIT 1
                """
            )

            result = await conn.execute(
                incident_stmt,
                {
                    "id": incident_id,
                    "id_prefix": f"{incident_id}%",
                },
            )

            row = result.first()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail=f"Incident {incident_id} not found",
                )

            (
                db_incident_id,
                db_service_id,
                service_name,
                telemetry_id,
                anomaly_score,
                severity,
                incident_status,
                error_type,
                stack_trace,
                root_cause,
                suggested_patch,
                is_diagnosed,
                created_at,
                resolved_at,
            ) = row

            service_identifier = service_name or str(db_service_id)

            # ========================================================
            # 2. Retrieve up to 3 historical fixes
            # ========================================================
            #
            # IMPORTANT:
            # The old implementation had LIMIT 2 and assigned a fake
            # 0.94 similarity to every record.
            #
            # We now return 3 records when available and calculate a
            # simple relevance value based on error-type matching.
            #
            # This is deliberately not presented as a pgvector cosine
            # score. The actual semantic retrieval is performed by the
            # RAG worker.
            # ========================================================

            hist_fixes = []

            try:
                historical_stmt = text(
                    """
                    SELECT
                        id,
                        error_type,
                        root_cause,
                        fix_description,
                        code_patch,
                        service_id
                    FROM historical_fixes
                    ORDER BY
                        CASE
                            WHEN error_type = :error_type THEN 0
                            WHEN service_id = :service_id THEN 1
                            ELSE 2
                        END,
                        created_at DESC
                    LIMIT 3
                    """
                )

                historical_result = await conn.execute(
                    historical_stmt,
                    {
                        "error_type": error_type,
                        "service_id": db_service_id,
                    },
                )

                historical_rows = historical_result.fetchall()

                for h_row in historical_rows:
                    (
                        historical_id,
                        historical_error_type,
                        historical_root_cause,
                        fix_description,
                        code_patch,
                        historical_service_id,
                    ) = h_row

                    # Relevance indicator for the API/UI.
                    #
                    # This is NOT a pgvector similarity score.
                    if (
                        error_type
                        and historical_error_type
                        and historical_error_type == error_type
                    ):
                        relevance = 1.0
                    elif (
                        historical_service_id
                        and historical_service_id == db_service_id
                    ):
                        relevance = 0.75
                    else:
                        relevance = 0.50

                    hist_fixes.append(
                        {
                            "id": str(historical_id),
                            "title": historical_error_type
                            or "Historical Incident",
                            "service_id": service_identifier,
                            "similarity_score": relevance,
                            "fix_summary": (
                                historical_root_cause
                                or fix_description
                                or "Applied verified remediation"
                            ),
                            "code_patch": code_patch or "",
                        }
                    )

            except Exception:
                logger.exception(
                    "Failed to retrieve historical fixes for incident %s",
                    db_incident_id,
                )

            # ========================================================
            # 3. Calculate incident telemetry metrics
            # ========================================================
            #
            # Use a 5-minute window around the incident creation time.
            # This matches the ML worker's rolling-window concept.
            # ========================================================

            system_metrics = {
                "cpu_percent": None,
                "memory_percent": None,
                "p95_latency_ms": None,
                "error_count": 0,
                "request_count": 0,
                "error_rate_percent": None,
                "five_xx_rate_percent": None,
                "errors_per_minute": None,
            }

            try:
                metrics_stmt = text(
                    """
                    SELECT
                        t.timestamp,
                        t.level,
                        t.error_type,
                        t.latency_ms,
                        t.status_code,
                        t.metadata
                    FROM telemetry_logs t
                    WHERE
                        t.service_id = :service_id
                        AND t.timestamp >= :window_start
                        AND t.timestamp <= :window_end
                    ORDER BY t.timestamp ASC
                    """
                )

                # Incident creation is the end of the five-minute
                # observation window.
                if created_at:
                    window_end = created_at
                else:
                    window_end = datetime.now(timezone.utc)

                window_start = (
                    window_end - timedelta(minutes=5)
                )

                telemetry_result = await conn.execute(
                    metrics_stmt,
                    {
                        "service_id": db_service_id,
                        "window_start": window_start,
                        "window_end": window_end,
                    },
                )

                telemetry_rows = telemetry_result.fetchall()

                if telemetry_rows:

                    latencies = []
                    error_count = 0
                    five_xx_count = 0

                    cpu_values = []
                    memory_values = []

                    for telemetry_row in telemetry_rows:

                        (
                            telemetry_timestamp,
                            level,
                            telemetry_error_type,
                            latency_ms,
                            status_code,
                            metadata,
                        ) = telemetry_row

                        # --------------------------------------------
                        # Request count
                        # --------------------------------------------

                        system_metrics["request_count"] += 1

                        # --------------------------------------------
                        # Error count
                        # --------------------------------------------

                        is_error = (
                            str(level or "").upper() == "ERROR"
                            or bool(telemetry_error_type)
                            or (
                                status_code is not None
                                and int(status_code) >= 400
                            )
                        )

                        if is_error:
                            error_count += 1

                        # --------------------------------------------
                        # 5xx count
                        # --------------------------------------------

                        if (
                            status_code is not None
                            and int(status_code) >= 500
                        ):
                            five_xx_count += 1

                        # --------------------------------------------
                        # Latency
                        # --------------------------------------------

                        if latency_ms is not None:
                            try:
                                latency_value = float(latency_ms)

                                if latency_value >= 0:
                                    latencies.append(
                                        latency_value
                                    )
                            except (
                                TypeError,
                                ValueError,
                            ):
                                pass

                        # --------------------------------------------
                        # CPU / memory metadata
                        # --------------------------------------------

                        if isinstance(metadata, dict):

                            cpu_keys = (
                                "cpu_percent",
                                "cpu_usage",
                                "cpu",
                                "cpu_usage_percent",
                            )

                            memory_keys = (
                                "memory_percent",
                                "memory_usage",
                                "memory",
                                "memory_usage_percent",
                            )

                            for key in cpu_keys:
                                value = metadata.get(key)

                                if value is not None:
                                    try:
                                        cpu_values.append(
                                            float(value)
                                        )
                                        break
                                    except (
                                        TypeError,
                                        ValueError,
                                    ):
                                        pass

                            for key in memory_keys:
                                value = metadata.get(key)

                                if value is not None:
                                    try:
                                        memory_values.append(
                                            float(value)
                                        )
                                        break
                                    except (
                                        TypeError,
                                        ValueError,
                                    ):
                                        pass

                    # --------------------------------------------
                    # Error rate
                    # --------------------------------------------

                    request_count = len(telemetry_rows)

                    system_metrics["error_count"] = error_count

                    # Errors per minute based on the 5-minute telemetry window
                    system_metrics["errors_per_minute"] = round(
                        error_count / 5.0,
                        2,
                    )

                    if request_count > 0:
                        system_metrics[
                            "error_rate_percent"
                        ] = round(
                            (
                                error_count
                                / request_count
                            )
                            * 100.0,
                            2,
                        )

                        system_metrics[
                            "five_xx_rate_percent"
                        ] = round(
                            (
                                five_xx_count
                                / request_count
                            )
                            * 100.0,
                            2,
                        )

                    # --------------------------------------------
                    # P95 latency
                    # --------------------------------------------

                    if latencies:

                        sorted_latencies = sorted(
                            latencies
                        )

                        # Nearest-rank P95.
                        index = max(
                            0,
                            int(
                                0.95
                                * len(sorted_latencies)
                            )
                            - 1,
                        )

                        system_metrics[
                            "p95_latency_ms"
                        ] = round(
                            sorted_latencies[index],
                            2,
                        )

                    # --------------------------------------------
                    # CPU
                    # --------------------------------------------

                    if cpu_values:
                        system_metrics[
                            "cpu_percent"
                        ] = round(
                            sum(cpu_values)
                            / len(cpu_values),
                            2,
                        )

                    # --------------------------------------------
                    # Memory
                    # --------------------------------------------

                    if memory_values:
                        system_metrics[
                            "memory_percent"
                        ] = round(
                            sum(memory_values)
                            / len(memory_values),
                            2,
                        )

            except Exception:
                logger.exception(
                    "Failed to calculate telemetry metrics "
                    "for incident %s",
                    db_incident_id,
                )

            # ========================================================
            # 4. Return complete incident dossier
            # ========================================================

            return {
                "id": str(db_incident_id),

                "service_id": (
                    service_name
                    or str(db_service_id)
                ),

                "title": (
                    f"{error_type or 'Anomaly'} "
                    f"in {service_name or 'service'}"
                ),

                "error_type": (
                    error_type
                    or "System Anomaly"
                ),

                "severity": (
                    severity or "HIGH"
                ).lower(),

                "status": (
                    incident_status
                    or "OPEN"
                ),

                "anomaly_score": float(
                    anomaly_score or 0.0
                ),

                "created_at": (
                    created_at.isoformat()
                    if created_at
                    else datetime.now(
                        timezone.utc
                    ).isoformat()
                ),

                "resolved_at": (
                    resolved_at.isoformat()
                    if resolved_at
                    else None
                ),

                "stack_trace": (
                    stack_trace or ""
                ),

                "raw_stack_trace": (
                    stack_trace or ""
                ),

                "ai_root_cause": (
                    root_cause
                    or "AI diagnosis processing in background..."
                ),

                "ai_suggested_patch": (
                    suggested_patch
                    or "Generating remediation patch..."
                ),

                "ai_recommended_fix": (
                    suggested_patch
                    or "Generating remediation patch..."
                ),

                "code_diff": (
                    suggested_patch
                    or ""
                ),

                "is_diagnosed": bool(
                    is_diagnosed
                ),

                "similar_incidents": hist_fixes,

                "system_metrics": system_metrics,
            }

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception(
            "Error getting incident %s",
            incident_id,
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve incident.",
        )


@app.patch(
    "/api/v1/incidents/{incident_id}/status",
    tags=["Incidents & Diagnostics"],
    summary="Update incident lifecycle status",
)
async def update_incident_status(
    incident_id: str,
    payload: IncidentStatusUpdate,
    current_user: dict = Depends(require_admin),
):
    if db_engine:
        try:
            async with db_engine.begin() as conn:
                resolved_time = datetime.now(timezone.utc) if payload.status == "RESOLVED" else None
                await conn.execute(
                    text("""
                        UPDATE incidents
                        SET status = :status, resolved_at = :resolved_at
                        WHERE id::text = :id OR id::text LIKE :id_prefix
                    """),
                    {
                        "status": payload.status,
                        "resolved_at": resolved_time,
                        "id": incident_id,
                        "id_prefix": f"{incident_id}%",
                    },
                )
        except Exception as exc:
            logger.error(f"Error updating incident status: {exc}")

    return {
        "id": incident_id,
        "status": payload.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "message": f"Incident {incident_id} marked as {payload.status}.",
    }


@app.post(
    "/api/v1/incidents/{incident_id}/diagnose",
    tags=["Incidents & Diagnostics"],
    summary="Trigger automated AI Doctor RAG re-diagnosis",
)
async def trigger_ai_doctor(incident_id: str, current_user: dict = Depends(require_admin)):
    # Fetch incident and republish anomaly event to trigger RAG worker
    if db_engine:
        try:
            async with db_engine.connect() as conn:
                res = await conn.execute(
                    text("""
                        SELECT i.id, COALESCE(s.name, i.service_id::text), i.anomaly_score, i.error_type, i.stack_trace
                        FROM incidents i
                        LEFT JOIN services s ON i.service_id = s.id
                        WHERE i.id::text = :id OR i.id::text LIKE :id_prefix
                        LIMIT 1
                    """),
                    {"id": incident_id, "id_prefix": f"{incident_id}%"},
                )
                row = res.first()
                if row:
                    event = {
                        "type": "ANOMALY_DETECTED",
                        "incident_id": str(row[0]),
                        "service_id": str(row[1]),
                        "anomaly_score": float(row[2] or 0.88),
                        "error_type": row[3] or "SystemAnomaly",
                        "stack_trace": row[4] or "",
                        "raw_stack_trace": row[4] or "",
                        "message": f"Re-diagnosis requested for incident {incident_id}",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                    await redis_client.publish(REDIS_ANOMALY_CHANNEL, json.dumps(event))
        except Exception as exc:
            logger.error(f"Failed to re-trigger diagnosis: {exc}")

    return {
        "id": incident_id,
        "status": "DIAGNOSING",
        "message": "AI Doctor diagnostic pipeline re-triggered via pgvector & Gemini.",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# 4. Service Registry
@app.get(
    "/api/v1/services",
    tags=["Service Registry"],
    summary="List all registered microservices",
)
async def list_services(api_key: str = Depends(verify_api_key)):
    if db_engine:
        try:
            async with db_engine.connect() as conn:
                stmt = text("""
                    SELECT 
                        s.id,
                        s.name,
                        s.environment,
                        s.status,
                        s.api_key_hash,
                        s.created_at,
                        s.owner_id,
                        COUNT(i.id) AS incident_count
                    FROM services s
                    LEFT JOIN incidents i ON s.id = i.service_id AND i.status IN ('OPEN', 'INVESTIGATING')
                    GROUP BY s.id, s.name, s.environment, s.status, s.api_key_hash, s.created_at, s.owner_id
                    ORDER BY s.name ASC
                """)
                res = await conn.execute(stmt)
                rows = res.fetchall()

                services = []
                for row in rows:
                    service_metrics = await conn.execute(text("""
                        SELECT
                            COUNT(*) AS request_count,
                            COALESCE(
                                PERCENTILE_CONT(0.95)
                                WITHIN GROUP (ORDER BY latency_ms),
                                0
                            ) AS p95_latency_ms,
                            COALESCE(
                                SUM(
                                    CASE
                                        WHEN status_code >= 400
                                        OR level IN ('ERROR', 'CRITICAL')
                                        THEN 1 ELSE 0
                                    END
                                ),
                                0
                            ) AS error_count,
                            MAX(created_at) AS last_activity
                        FROM telemetry_logs
                        WHERE service_id = :service_id
                          AND created_at >= NOW() - INTERVAL '5 minutes'
                    """), {"service_id": row[0]})

                    metric = service_metrics.first()

                    requests = int(metric[0] or 0)
                    latency = float(metric[1] or 0)
                    errors = int(metric[2] or 0)

                    error_rate = (
                        (errors / requests) * 100
                        if requests
                        else 0
                    )

                    services.append({
                        "id": row[1] or str(row[0]),
                        "name": row[1] or "Service",
                        "environment": row[2] or "production",
                        "status": (row[3] or "ACTIVE").lower(),
                        "requests": requests,
                        "error_rate": round(error_rate, 2),
                        "latency_ms": round(latency, 2),
                        "incident_count": int(row[6] or 0),
                        "last_activity": (
                            metric[3].isoformat()
                            if metric[3]
                            else None
                        ),
                        "api_key_hash": row[4],
                        "created_at": row[5].isoformat() if row[5] else None,
                        "owner_id": str(row[7]) if row[7] else None,
                    })

                if services:
                    return services
        except Exception as exc:
            logger.error(f"Error querying services: {exc}")

    return []


@app.post(
    "/api/v1/services",
    tags=["Service Registry"],
    summary="Register a new microservice",
)
async def create_service(
    payload: ServiceCreatePayload,
    current_user: dict = Depends(get_current_user),
):
    service_name = payload.id or payload.name
    new_key = f"at_live_{uuid.uuid4().hex[:16]}"

    if not db_engine:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    try:
        async with db_engine.begin() as conn:
            res = await conn.execute(
                text("""
                    INSERT INTO services (name, description, environment, status, api_key_hash, owner_id)
                    VALUES (:name, :desc, :env, 'ACTIVE', :key, :owner_id)
                    RETURNING id, name, environment, status, created_at, owner_id
                """),
                {"name": service_name, "desc": payload.description or f"Microservice {service_name}",
                 "env": payload.environment, "key": new_key, "owner_id": current_user["id"]},
            )
            row = res.mappings().first()
            if row:
                return {"id": row["name"], "name": row["name"], "environment": row["environment"],
                        "status": "active", "api_key": new_key,
                        "created_at": row["created_at"].isoformat() if row["created_at"] else datetime.now(timezone.utc).isoformat(),
                        "owner_id": str(row["owner_id"]) if row["owner_id"] else None,
                        "message": "Service successfully registered in PostgreSQL."}
    except Exception as exc:
        logger.error(f"Error creating service: {exc}")
        if "unique" in str(exc).lower():
            raise HTTPException(status_code=409, detail="A service with this name already exists.")
        raise HTTPException(status_code=500, detail="Failed to register service.")


@app.patch("/api/v1/services/{service_id}", tags=["Service Registry"], summary="Update an owned service or any service as Admin")
async def update_service(service_id: str, payload: ServiceUpdatePayload, current_user: dict = Depends(get_current_user)):
    if not db_engine:
        raise HTTPException(status_code=503, detail="Database unavailable.")
    updates=[]; params: Dict[str,Any]={"service_id":service_id}
    if payload.name is not None: updates.append("name = :name"); params["name"]=payload.name.strip()
    if payload.description is not None: updates.append("description = :description"); params["description"]=payload.description
    if payload.environment is not None: updates.append("environment = :environment"); params["environment"]=payload.environment
    if payload.status is not None: updates.append("status = :status"); params["status"]=payload.status
    if not updates: raise HTTPException(status_code=400, detail="No service fields supplied for update.")
    owner_clause="" if current_user["role"]=="Admin" else " AND owner_id = :owner_id"
    if current_user["role"]!="Admin": params["owner_id"]=current_user["id"]
    try:
        async with db_engine.begin() as conn:
            result=await conn.execute(text(f"""UPDATE services SET {", ".join(updates)}, updated_at=CURRENT_TIMESTAMP
                WHERE (id::text=:service_id OR name=:service_id){owner_clause}
                RETURNING id,name,environment,status,owner_id,created_at"""),params)
            row=result.mappings().first()
            if not row:
                raise HTTPException(status_code=403 if current_user["role"]!="Admin" else 404,
                                    detail="You can only modify services you own." if current_user["role"]!="Admin" else "Service not found.")
            return {"id":row["name"],"name":row["name"],"environment":row["environment"],"status":row["status"].lower(),
                    "owner_id":str(row["owner_id"]) if row["owner_id"] else None,
                    "created_at":row["created_at"].isoformat() if row["created_at"] else None,"message":"Service updated successfully."}
    except HTTPException: raise
    except Exception as exc:
        logger.error(f"Error updating service: {exc}"); raise HTTPException(status_code=500, detail="Failed to update service.")

@app.delete("/api/v1/services/{service_id}", tags=["Service Registry"], summary="Delete an owned service or any service as Admin")
async def delete_service(service_id: str, current_user: dict = Depends(get_current_user)):
    if not db_engine: raise HTTPException(status_code=503, detail="Database unavailable.")
    owner_clause="" if current_user["role"]=="Admin" else " AND owner_id = :owner_id"
    params: Dict[str,Any]={"service_id":service_id}
    if current_user["role"]!="Admin": params["owner_id"]=current_user["id"]
    try:
        async with db_engine.begin() as conn:
            result=await conn.execute(text(f"""DELETE FROM services
                WHERE (id::text=:service_id OR name=:service_id){owner_clause}
                RETURNING id,name"""),params)
            row=result.mappings().first()
            if not row:
                raise HTTPException(status_code=403 if current_user["role"]!="Admin" else 404,
                                    detail="You can only delete services you own." if current_user["role"]!="Admin" else "Service not found.")
            return {"success":True,"id":str(row["id"]),"name":row["name"],"message":"Service deleted successfully."}
    except HTTPException: raise
    except Exception as exc:
        logger.error(f"Error deleting service: {exc}"); raise HTTPException(status_code=500, detail="Failed to delete service.")

# 5. Chaos Testing & Simulation
@app.post(
    "/api/v1/simulate-crash",
    tags=["Chaos & Simulation"],
    summary="Inject simulated crash telemetry event",
    description="Simulates realistic crash scenarios (Timeout, Memory Leak, Socket Drop) to test the ML anomaly pipeline and UI notifications in real time.",
)
@app.post(
    "/api/v1/simulate/crash",
    tags=["Chaos & Simulation"],
    summary="Inject simulated crash telemetry event (alias)",
    include_in_schema=False,
)
async def simulate_crash(
    payload: CrashSimulationPayload,
    current_user: dict = Depends(require_admin),
):
    scenarios = {
        "db_pool_exhaustion": {
            "error_type": "sqlalchemy.exc.TimeoutError",
            "message": "QueuePool limit of size 10 overflow 10 reached, connection timed out",
            "latency_ms": 3200.0,
            "status_code": 500,
            "level": "ERROR",
            "stack_trace": "Traceback (most recent call last):\n  File \"/app/services/checkout.py\", line 142\n    db = engine.connect()\nsqlalchemy.exc.TimeoutError: QueuePool limit exceeded",
        },
        "redis_consumer_lag": {
            "error_type": "redis.exceptions.ConnectionError",
            "message": "Redis stream consumer connection refused on port 6379",
            "latency_ms": 1850.0,
            "status_code": 503,
            "level": "ERROR",
            "stack_trace": "redis.exceptions.ConnectionError: Connection refused",
        },
        "jwt_memory_leak": {
            "error_type": "RuntimeWarning",
            "message": "In-memory LRU key cache exceeded 100,000 items threshold (88% RAM)",
            "latency_ms": 940.0,
            "status_code": 200,
            "level": "WARN",
            "stack_trace": "RuntimeWarning: In-memory cache exceeded max item threshold",
        },
        "socket_timeout": {
            "error_type": "httpx.ReadTimeout",
            "message": "Webhook transport socket timed out after 30000ms",
            "latency_ms": 30000.0,
            "status_code": 504,
            "level": "ERROR",
            "stack_trace": "httpx.ReadTimeout: The read operation timed out",
        },
    }

    selected = scenarios.get(payload.scenario, scenarios["db_pool_exhaustion"])
    event_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    service_id = payload.service_id or "payment-api"

    event = {
        "id": event_id,
        "type": "SIMULATION_CRASH",
        "service_id": service_id,
        "message": selected["message"],
        "log_message": selected["message"],
        "level": selected["level"],
        "error_type": selected["error_type"],
        "stack_trace": selected["stack_trace"],
        "raw_stack_trace": selected["stack_trace"],
        "latency_ms": selected["latency_ms"],
        "status_code": selected["status_code"],
        "anomaly_score": 0.94,
        "timestamp": timestamp,
        "received_at": timestamp,
    }

    # Push to Redis stream & broadcast
    try:
        await redis_client.xadd(STREAM_KEY, {"payload": json.dumps(event)}, maxlen=10000)
    except Exception as e:
        logger.warning(f"Redis Stream simulation push: {e}")

    await manager.broadcast({
        "type": "TELEMETRY_LOG",
        "data": event,
    })

    return {
        "status": "simulated",
        "scenario": payload.scenario,
        "event_id": event_id,
        "service_id": service_id,
        "message": f"Crash simulation '{payload.scenario}' dispatched to ML pipeline and live WebSocket.",
    }


# 6. System Health
@app.get(
    "/api/v1/health",
    tags=["System Health"],
    summary="System health check",
)
@app.get(
    "/health",
    tags=["System Health"],
    summary="System health check (alias)",
    include_in_schema=False,
)
@app.get(
    "/",
    tags=["System Health"],
    summary="Root service ping",
    include_in_schema=False,
)
async def health_check():
    started = time.perf_counter()
    redis_status = "healthy"
    redis_stream_length = None
    redis_memory_used = None
    try:
        redis_stream_length = await redis_client.xlen(STREAM_KEY)
        redis_info = await redis_client.info("memory")
        redis_memory_used = redis_info.get("used_memory_human")
    except Exception as exc:
        redis_status = "offline"
        logger.warning("Health check Redis probe failed: %s", exc)

    postgres_status = "unknown"
    postgres_connections = None
    postgres_vector_indexes = None
    if db_engine is not None:
        try:
            async with db_engine.connect() as conn:
                postgres_connections = int(
                    (await conn.execute(
                        text("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()")
                    )).scalar_one()
                )
                postgres_vector_indexes = int(
                    (await conn.execute(
                        text(
                            "SELECT count(*) FROM pg_indexes "
                            "WHERE schemaname NOT IN ('pg_catalog', 'information_schema') "
                            "AND indexdef ILIKE '%vector%'"
                        )
                    )).scalar_one()
                )
            postgres_status = "healthy"
        except Exception as exc:
            postgres_status = "offline"
            logger.warning("Health check PostgreSQL probe failed: %s", exc)

    latency_ms = round((time.perf_counter() - started) * 1000, 2)
    return {
        "status": "online" if redis_status == "healthy" else "degraded",
        "service": "ingestion-service",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latency_ms": latency_ms,
        "components": {
            "redis": {
                "status": redis_status,
                "stream_key": STREAM_KEY,
                "stream_length": redis_stream_length,
                "memory_used": redis_memory_used,
            },
            "postgres": {
                "status": postgres_status,
                "active_connections": postgres_connections,
                "vector_indexes": postgres_vector_indexes,
            },
        },
    }
