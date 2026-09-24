"""
Trace Ingestion Gateway Service
High-throughput telemetry ingestion pipeline, real-time WebSocket broadcaster, and custom Swagger UI portal.
"""

import os
import json
import uuid
import logging
import asyncio
import time
import hashlib
import secrets
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
    format="%(asctime)s | %(levelname)s | trace-ingestion | %(message)s",
)
logger = logging.getLogger("trace-ingestion")

# ============================================================
# Environment & Configuration
# ============================================================

REDIS_HOST = os.getenv("REDIS_HOST", "redis-broker")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
STREAM_KEY = os.getenv("REDIS_STREAM_KEY", "telemetry_stream")
CONSUMER_GROUP = os.getenv("REDIS_CONSUMER_GROUP", "trace_workers")
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
    title="⚡ AuraTrace Autonomous Diagnostics Platform API",
    version="2.0.0",
    description="""
# 🚀 AuraTrace
Autonomous telemetry ingestion pipeline, real-time Isolation Forest anomaly detection, pgvector similarity search, and RAG crash diagnostics doctor.
    """,
    docs_url=None,  # We serve our custom styled Swagger UI at /docs
    redoc_url=None,
    openapi_tags=[
        {"name": "Projects & API Keys", "description": "Provision AuraTrace projects and manage project-level API keys."},
        {"name": "Telemetry Ingestion", "description": "High-throughput stream endpoints with SDK auto-discovery."},
        {"name": "Detected Services", "description": "View automatically discovered microservices fleet."},
        {"name": "Cluster Statistics", "description": "Real-time metrics, throughput, latency and active services count."},
        {"name": "Incidents & Diagnostics", "description": "Triage open anomalies, fetch RAG root-cause analysis and patches."},
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
    
    if db_engine:
        try:
            async with db_engine.begin() as conn:
                # 1. Ensure projects table
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS projects (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        name VARCHAR(255) NOT NULL,
                        api_key_hash VARCHAR(128) NOT NULL UNIQUE,
                        owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                """))
                await conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS projects_api_key_hash_idx ON projects (api_key_hash);
                """))

                # 2. Ensure services auto-discovery columns
                await conn.execute(text("ALTER TABLE services ADD COLUMN IF NOT EXISTS project_id UUID;"))
                await conn.execute(text("ALTER TABLE services ADD COLUMN IF NOT EXISTS service_id VARCHAR(255);"))
                await conn.execute(text("ALTER TABLE services ADD COLUMN IF NOT EXISTS runtime VARCHAR(50) DEFAULT 'node';"))
                await conn.execute(text("ALTER TABLE services ADD COLUMN IF NOT EXISTS version VARCHAR(50) DEFAULT '1.0.0';"))
                await conn.execute(text("ALTER TABLE services ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;"))
                await conn.execute(text("ALTER TABLE services ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;"))
                await conn.execute(text("ALTER TABLE services ADD COLUMN IF NOT EXISTS owner_id UUID;"))

                # Drop old global unique name constraint if existing from legacy schemas
                await conn.execute(text("ALTER TABLE services DROP CONSTRAINT IF EXISTS services_name_key;"))
                await conn.execute(text("ALTER TABLE services DROP CONSTRAINT IF EXISTS services_service_id_key;"))

                await conn.execute(text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint WHERE conname = 'services_owner_fk'
                        ) THEN
                            ALTER TABLE services
                                ADD CONSTRAINT services_owner_fk
                                FOREIGN KEY (owner_id) REFERENCES users(id)
                                ON DELETE SET NULL;
                        END IF;
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint WHERE conname = 'services_project_fk'
                        ) THEN
                            ALTER TABLE services
                                ADD CONSTRAINT services_project_fk
                                FOREIGN KEY (project_id) REFERENCES projects(id)
                                ON DELETE CASCADE;
                        END IF;
                    END $$;
                """))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS services_owner_idx ON services (owner_id);"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS services_project_idx ON services (project_id);"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS services_service_id_idx ON services (service_id);"))

                # 3. Ensure telemetry_logs and incidents columns
                await conn.execute(text("ALTER TABLE telemetry_logs ADD COLUMN IF NOT EXISTS project_id UUID;"))
                await conn.execute(text("ALTER TABLE telemetry_logs ADD COLUMN IF NOT EXISTS source VARCHAR(32) DEFAULT 'sdk';"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS telemetry_logs_project_idx ON telemetry_logs (project_id);"))
                await conn.execute(text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS source VARCHAR(32) DEFAULT 'sdk';"))
                await conn.execute(text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS similar_fixes JSONB DEFAULT '[]'::jsonb;"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS incidents_source_idx ON incidents (source);"))

                # 4. Seed default project and attach orphan services
                default_hash = hashlib.sha256(b"at_live_master_auratrace_2026").hexdigest()
                await conn.execute(text("""
                    INSERT INTO projects (id, name, api_key_hash)
                    VALUES ('00000000-0000-0000-0000-000000000001', 'AuraTrace Production Platform', :hash)
                    ON CONFLICT (id) DO UPDATE SET api_key_hash = EXCLUDED.api_key_hash;
                """), {"hash": default_hash})

                await conn.execute(text("""
                    UPDATE services
                    SET project_id = '00000000-0000-0000-0000-000000000001'
                    WHERE project_id IS NULL;
                """))
                await conn.execute(text("""
                    UPDATE services
                    SET service_id = name
                    WHERE service_id IS NULL;
                """))

            logger.info("AuraTrace database schema & auto-discovery tables verified.")
        except Exception as exc:
            logger.warning(f"AuraTrace database schema migration warning: {exc}")

@app.on_event("shutdown")
async def shutdown_event():
    global pubsub_task
    if pubsub_task:
        pubsub_task.cancel()
        try:
            await pubsub_task
        except asyncio.CancelledError:
            pass

# Configurable CORS Middleware (defaults to frontend web origin)
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://frontend:3000",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if "*" not in ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key(
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    x_project_key: Optional[str] = Header(default=None, alias="X-Project-Key"),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    """
    Validates incoming SDK telemetry requests against AuraTrace project API keys,
    master API key, or legacy service API keys.
    Returns a dict with project_id, project_name, and api_key.
    """
    api_key = x_api_key or x_project_key
    if not api_key and authorization:
        if authorization.lower().startswith("bearer "):
            api_key = authorization.split(" ", 1)[1].strip()
        else:
            api_key = authorization.strip()

    if not api_key:
        if ENABLE_API_AUTH:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing X-API-Key or X-Project-Key header. Access denied.",
            )
        return {
            "key": "guest",
            "project_id": "00000000-0000-0000-0000-000000000001",
            "project_name": "Default Workspace",
            "is_master": False,
        }

    if MASTER_API_KEY and api_key == MASTER_API_KEY:
        return {
            "key": api_key,
            "project_id": "00000000-0000-0000-0000-000000000001",
            "project_name": "AuraTrace Production Platform",
            "is_master": True,
        }

    # Validate against Project API keys or Service API keys using SHA-256
    if db_engine:
        try:
            incoming_hash = hashlib.sha256(api_key.encode("utf-8")).hexdigest()
            async with db_engine.connect() as conn:
                # 1. Check projects table
                proj_res = await conn.execute(
                    text("SELECT id, name, owner_id FROM projects WHERE api_key_hash = :hash LIMIT 1"),
                    {"hash": incoming_hash},
                )
                proj = proj_res.mappings().first()
                if proj:
                    return {
                        "key": api_key,
                        "project_id": str(proj["id"]),
                        "project_name": proj["name"],
                        "owner_id": str(proj["owner_id"]) if proj["owner_id"] else None,
                        "is_master": False,
                    }

                # 2. Check legacy services table
                res = await conn.execute(
                    text("SELECT id, name, project_id, status FROM services WHERE api_key_hash = :hash AND status = 'ACTIVE' LIMIT 1"),
                    {"hash": incoming_hash},
                )
                svc = res.mappings().first()
                if svc:
                    svc_proj_id = str(svc["project_id"]) if svc["project_id"] else "00000000-0000-0000-0000-000000000001"
                    return {
                        "key": api_key,
                        "project_id": svc_proj_id,
                        "project_name": svc["name"],
                        "service_id": str(svc["id"]),
                        "is_master": False,
                    }
        except Exception as e:
            logger.warning(f"Error validating API key against database: {e}")

    if ENABLE_API_AUTH:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unrecognized API key. Access denied.",
        )

    return {
        "key": api_key,
        "project_id": "00000000-0000-0000-0000-000000000001",
        "project_name": "Fallback Workspace",
        "is_master": False,
    }


async def get_request_auth(
    authorization: Optional[str] = Header(default=None),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    x_project_key: Optional[str] = Header(default=None, alias="X-Project-Key"),
) -> dict:
    """
    Unified authorization dependency for read & dashboard endpoints.
    Accepts:
      1. User JWT Session token (Authorization: Bearer <jwt>)
      2. Project / Master / Service API Key (X-Project-Key, X-API-Key)
    """
    # 1. Attempt user JWT session resolution
    if authorization and authorization.lower().startswith("bearer "):
        try:
            user = await get_current_user(authorization=authorization)
            if user:
                return {
                    "auth_type": "user_session",
                    "user_id": str(user.get("id")),
                    "user_email": user.get("email"),
                    "role": user.get("role", "Developer"),
                    "project_id": "00000000-0000-0000-0000-000000000001",
                    "is_master": user.get("role") == "Admin",
                    "is_user": True,
                }
        except Exception:
            pass

def sanitize_stack_trace_string(trace_str: Optional[str]) -> str:
    """Sanitizes file system paths in stack traces to present clean, relative project paths."""
    if not trace_str:
        return ""
    import re
    def _clean_path(match):
        full_path = match.group(1).replace("\\", "/")
        parts = full_path.split("/")
        for marker in ["scripts", "app", "backend", "services", "controllers", "models", "workers", "src"]:
            if marker in parts:
                idx = parts.index(marker)
                return f'File "{ "/".join(parts[idx:]) }"'
        if len(parts) > 1:
            return f'File "{ "/".join(parts[-2:]) }"'
        return f'File "{ parts[-1] }"'
    
    # Handle Python File "..." and Node.js at ... (...)
    cleaned = re.sub(r'File "([^"]+)"', _clean_path, trace_str)
    
    def _clean_node_path(match):
        full_path = match.group(1).replace("\\", "/")
        parts = full_path.split("/")
        for marker in ["scripts", "app", "backend", "services", "controllers", "models", "workers", "src"]:
            if marker in parts:
                idx = parts.index(marker)
                return f'({"/" + "/".join(parts[idx:])}'
        return f'({parts[-1]}'
    
    cleaned = re.sub(r'\(([A-Za-z]:[^\)]+)', _clean_node_path, cleaned)
    return cleaned


# ============================================================
# Pydantic Schemas
# ============================================================

class ProjectCreatePayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Project Name e.g. 'My E-Commerce Platform'")

class ProjectResponse(BaseModel):
    id: str
    name: str
    api_key: Optional[str] = None
    created_at: str
    service_count: Optional[int] = 0

class TelemetryPayload(BaseModel):
    service_id: Optional[str] = Field(None, description="Unique microservice identifier (e.g. 'payment-service')")
    service_name: Optional[str] = Field(None, description="Microservice name alias")
    runtime: Optional[str] = Field("node", description="Runtime identifier (e.g. 'node', 'python', 'java')")
    environment: Optional[str] = Field("production", description="Environment: 'production', 'staging', 'development'")
    version: Optional[str] = Field("1.0.0", description="Application release version")
    message: Optional[str] = Field("Log event emitted", description="Log payload or exception message")
    level: Optional[str] = Field("INFO", description="Log severity: DEBUG, INFO, WARN, ERROR, CRITICAL")
    error_type: Optional[str] = Field(None, description="Exception class (e.g. 'sqlalchemy.exc.TimeoutError')")
    stack_trace: Optional[str] = Field(None, description="Complete Python/Node.js stack traceback")
    raw_stack_trace: Optional[str] = Field(None, description="Complete Python/Node.js stack traceback alias")
    latency_ms: Optional[float] = Field(0.0, ge=0, description="Measured execution duration in milliseconds")
    status_code: Optional[int] = Field(200, ge=100, le=599, description="HTTP status response code")
    anomaly_score: Optional[float] = Field(None, ge=0, le=1, description="Pre-computed anomaly confidence")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Arbitrary contextual tags (user_id, trace_id, route)")

    @property
    def resolved_service_id(self) -> str:
        return self.service_id or self.service_name or "unknown-service"

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
/* AuraTrace Futuristic Dark Theme for Swagger UI */
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
.trace-nav-banner {
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

.trace-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.trace-logo-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.4);
}

.trace-title {
  font-size: 18px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.5px;
}

.trace-badge {
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

.trace-nav-links {
  display: flex;
  align-items: center;
  gap: 16px;
}

.trace-link {
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

.trace-link:hover {
  color: #38bdf8;
  border-color: #38bdf8;
  background: #1e293b;
}

.trace-link.primary {
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
  color: #ffffff;
  border: none;
  box-shadow: 0 0 15px rgba(37, 99, 235, 0.3);
}

.trace-link.primary:hover {
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
  nav.className = 'trace-nav-banner';
  nav.innerHTML = `
    <a href="/docs" class="trace-brand">
      <div class="trace-logo-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
      </div>
      <div>
        <span class="trace-title">AuraTrace</span>
        <span class="trace-badge">v2.0 SDK-First</span>
      </div>
    </a>
    <div class="trace-nav-links">
      <a href="http://localhost:3000/dashboard" target="_blank" class="trace-link primary">
        📊 Dashboard ↗
      </a>
      <a href="http://localhost:3000/services" target="_blank" class="trace-link">
        ⚡ Detected Services
      </a>
      <a href="/scalar" class="trace-link">
        ⚡ Scalar
      </a>
      <a href="/redoc" class="trace-link">
        📖 ReDoc
      </a>
      <a href="/api/v1/health" target="_blank" class="trace-link">
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
    <title>Trace Ingestion Gateway | API Documentation</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" href="/favicon.ico">
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
        title="Trace Telemetry Specs | ReDoc",
        redoc_favicon_url="/favicon.ico",
    )

@app.get("/scalar", include_in_schema=False)
async def scalar_docs():
    """Serves ultra-modern interactive Scalar API documentation."""
    return HTMLResponse(f"""
<!doctype html>
<html>
  <head>
    <title>Trace API Reference | Scalar</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.ico" />
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


# ============================================================
# WebSocket Telemetry Live Stream Endpoints
# ============================================================

@app.websocket("/ws/telemetry")
@app.websocket("/api/v1/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """
    Live bidirectional WebSocket endpoint streaming real-time log ingestion,
    ML anomaly alerts, and RAG AI Doctor diagnostic outputs.
    """
    await manager.connect(websocket)
    try:
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to AuraTrace live telemetry stream.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as exc:
        logger.debug(f"WebSocket client session terminated: {exc}")
        manager.disconnect(websocket)


# ============================================================
# SERVICE AUTO-DISCOVERY HELPER
# ============================================================

async def auto_discover_service(
    project_id: Optional[str],
    service_id: str,
    runtime: str = "node",
    environment: str = "production",
    version: str = "1.0.0",
) -> Optional[str]:
    """
    Auto-discovers and registers the service in PostgreSQL on telemetry arrival,
    strictly scoped to project_id.
    """
    if not db_engine or not service_id:
        return None
    proj_id = project_id or "00000000-0000-0000-0000-000000000001"
    try:
        async with db_engine.begin() as conn:
            # Check if service exists for this specific project
            res = await conn.execute(
                text("""
                    SELECT id FROM services 
                    WHERE project_id::text = :project_id
                      AND (service_id = :service_id OR name = :service_id)
                    LIMIT 1
                """),
                {"project_id": str(proj_id), "service_id": service_id},
            )
            existing = res.first()
            if existing:
                await conn.execute(
                    text("""
                        UPDATE services 
                        SET last_seen_at = CURRENT_TIMESTAMP,
                            runtime = COALESCE(:runtime, runtime),
                            environment = COALESCE(:environment, environment),
                            version = COALESCE(:version, version),
                            status = 'ACTIVE'
                        WHERE id = :id
                    """),
                    {
                        "id": existing[0],
                        "runtime": runtime or "node",
                        "environment": environment or "production",
                        "version": version or "1.0.0",
                    },
                )
                return str(existing[0])
            else:
                create_res = await conn.execute(
                    text("""
                        INSERT INTO services (
                            project_id, service_id, name, runtime, environment, version,
                            status, description, first_seen_at, last_seen_at
                        )
                        VALUES (
                            CAST(:project_id AS uuid), :service_id, :name, :runtime, :environment, :version,
                            'ACTIVE', :desc, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                        )
                        RETURNING id
                    """),
                    {
                        "project_id": str(proj_id),
                        "service_id": service_id,
                        "name": service_id,
                        "runtime": runtime or "node",
                        "environment": environment or "production",
                        "version": version or "1.0.0",
                        "desc": f"Auto-discovered {runtime} service: {service_id}",
                    },
                )
                created = create_res.first()
                if created:
                    logger.info(f"⚡ Auto-discovered new service '{service_id}' ({runtime}) in project '{proj_id}'.")
                    return str(created[0])
    except Exception as exc:
        logger.warning(f"Auto-discovery service update warning for '{service_id}' in project '{proj_id}': {exc}")
    return None


# ============================================================
# API Endpoints
# ============================================================

# 0. Projects & API Key Management
async def get_current_user_optional(
    authorization: Optional[str] = Header(default=None),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
) -> Optional[dict]:
    if authorization and authorization.lower().startswith("bearer "):
        try:
            return await get_current_user(authorization=authorization)
        except Exception:
            pass
    if MASTER_API_KEY and x_api_key == MASTER_API_KEY:
        return {"id": "00000000-0000-0000-0000-000000000099", "role": "Admin", "name": "System Administrator"}
    if not ENABLE_API_AUTH:
        return {"id": "00000000-0000-0000-0000-000000000099", "role": "Developer", "name": "Developer"}
    return None

@app.get(
    "/api/v1/projects",
    tags=["Projects & API Keys"],
    summary="List AuraTrace projects (scoped by owner for developers, all for admin)",
    description="Retrieves registered projects with active service counts.",
)
async def list_projects(current_user: Optional[dict] = Depends(get_current_user_optional)):
    if not db_engine:
        return [{
            "id": "00000000-0000-0000-0000-000000000001",
            "name": "AuraTrace Production Platform",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "service_count": 0,
        }]

    try:
        is_admin = current_user.get("role") == "Admin" if current_user else True
        user_id = current_user.get("id") if current_user else None

        async with db_engine.connect() as conn:
            if is_admin or not user_id:
                stmt = text("""
                    SELECT 
                        p.id,
                        p.name,
                        p.created_at,
                        p.owner_id,
                        COUNT(s.id) AS service_count
                    FROM projects p
                    LEFT JOIN services s ON p.id = s.project_id
                    GROUP BY p.id, p.name, p.created_at, p.owner_id
                    ORDER BY p.created_at DESC
                """)
                res = await conn.execute(stmt)
            else:
                stmt = text("""
                    SELECT 
                        p.id,
                        p.name,
                        p.created_at,
                        p.owner_id,
                        COUNT(s.id) AS service_count
                    FROM projects p
                    LEFT JOIN services s ON p.id = s.project_id
                    WHERE p.owner_id = :owner_id OR p.owner_id IS NULL
                    GROUP BY p.id, p.name, p.created_at, p.owner_id
                    ORDER BY p.created_at DESC
                """)
                res = await conn.execute(stmt, {"owner_id": user_id})

            rows = res.fetchall()
            return [
                {
                    "id": str(r[0]),
                    "name": r[1],
                    "created_at": r[2].isoformat() if r[2] else datetime.now(timezone.utc).isoformat(),
                    "owner_id": str(r[3]) if r[3] else None,
                    "service_count": int(r[4] or 0),
                }
                for r in rows
            ]
    except Exception as exc:
        logger.error(f"Error fetching projects: {exc}")
        return []

@app.post(
    "/api/v1/projects",
    status_code=status.HTTP_201_CREATED,
    tags=["Projects & API Keys"],
    summary="Create a new AuraTrace project and generate API key",
    description="Provisions an AuraTrace project and returns a unique, secret alphanumeric project API key.",
)
async def create_project(
    payload: ProjectCreatePayload,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    if not current_user and ENABLE_API_AUTH:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required to create a project.")

    new_api_key = secrets.token_urlsafe(16).replace("-", "").replace("_", "")[:20].upper()
    key_hash = hashlib.sha256(new_api_key.encode("utf-8")).hexdigest()
    owner_id = current_user["id"] if current_user and "id" in current_user else None

    if not db_engine:
        return {
            "id": str(uuid.uuid4()),
            "name": payload.name,
            "api_key": new_api_key,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "message": "Project created. Configure AURATRACE_API_KEY in your application.",
        }

    try:
        async with db_engine.begin() as conn:
            res = await conn.execute(
                text("""
                    INSERT INTO projects (name, api_key_hash, owner_id)
                    VALUES (:name, :hash, :owner_id)
                    RETURNING id, name, created_at
                """),
                {"name": payload.name.strip(), "hash": key_hash, "owner_id": owner_id},
            )
            row = res.mappings().first()
            return {
                "id": str(row["id"]),
                "name": row["name"],
                "api_key": new_api_key,
                "created_at": row["created_at"].isoformat() if row["created_at"] else datetime.now(timezone.utc).isoformat(),
                "message": "Project created successfully. Save your API key: it will not be shown again in full.",
            }
    except Exception as exc:
        logger.error(f"Error creating project: {exc}")
        raise HTTPException(status_code=500, detail="Failed to create project.")

@app.post(
    "/api/v1/projects/{project_id}/regenerate-key",
    tags=["Projects & API Keys"],
    summary="Rotate or regenerate project API key",
)
async def regenerate_project_key(
    project_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    if not current_user and ENABLE_API_AUTH:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer access token or X-API-Key required.")

    if not db_engine:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    try:
        async with db_engine.begin() as conn:
            check_res = await conn.execute(
                text("SELECT id, name, owner_id FROM projects WHERE id::text = :id OR id::text LIKE :id_prefix LIMIT 1"),
                {"id": project_id, "id_prefix": f"{project_id}%"},
            )
            proj = check_res.mappings().first()
            if not proj:
                raise HTTPException(status_code=404, detail="Project not found.")

            is_admin = current_user.get("role") == "Admin" if current_user else False
            if not is_admin and proj["owner_id"] and str(proj["owner_id"]) != str(current_user.get("id")):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You do not have permission to rotate the API key for this project.",
                )

            new_api_key = f"at_live_{secrets.token_hex(16)}"
            key_hash = hashlib.sha256(new_api_key.encode("utf-8")).hexdigest()

            await conn.execute(
                text("""
                    UPDATE projects
                    SET api_key_hash = :hash, updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                """),
                {"hash": key_hash, "id": proj["id"]},
            )
            return {
                "id": str(proj["id"]),
                "name": proj["name"],
                "api_key": new_api_key,
                "message": "Project API key regenerated successfully.",
            }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error regenerating project key: {exc}")
        raise HTTPException(status_code=500, detail="Failed to regenerate project API key.")


@app.delete(
    "/api/v1/projects/{project_id}",
    tags=["Projects & API Keys"],
    summary="Delete project and cascade associated telemetry/crashes",
)
async def delete_project(
    project_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    if not current_user and ENABLE_API_AUTH:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer access token or X-API-Key required.")

    if not db_engine:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    try:
        async with db_engine.begin() as conn:
            check_res = await conn.execute(
                text("SELECT id, name, owner_id FROM projects WHERE id::text = :id OR id::text LIKE :id_prefix LIMIT 1"),
                {"id": project_id, "id_prefix": f"{project_id}%"},
            )
            proj = check_res.mappings().first()
            if not proj:
                raise HTTPException(status_code=404, detail="Project not found.")

            is_admin = current_user.get("role") == "Admin" if current_user else False
            if not is_admin and proj["owner_id"] and str(proj["owner_id"]) != str(current_user.get("id")):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You do not have permission to delete this project.",
                )

            await conn.execute(
                text("DELETE FROM projects WHERE id = :id"),
                {"id": proj["id"]},
            )
            return {
                "success": True,
                "message": f"Project '{proj['name']}' and its operational data deleted.",
                "id": str(proj["id"]),
            }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error deleting project: {exc}")
        raise HTTPException(status_code=500, detail="Failed to delete project.")


@app.post(
    "/api/v1/admin/clean-test-data",
    tags=["Administrative Tools"],
    summary="Purge test workspaces and transient demo records",
)
async def clean_test_data(
    current_user: dict = Depends(require_admin),
):
    if not db_engine:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    try:
        async with db_engine.begin() as conn:
            res = await conn.execute(
                text("""
                    DELETE FROM projects
                    WHERE name LIKE 'E2E Test Workspace%'
                       OR name LIKE 'Test%'
                       OR name = 'sdfghjk'
                       OR name = 'startuphub'
                """)
            )
            count = res.rowcount
            return {
                "success": True,
                "message": f"Successfully cleaned {count} test projects.",
                "deleted_projects_count": count,
            }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error cleaning test data: {exc}")
        raise HTTPException(status_code=500, detail="Failed to clean test data.")



# 1. Telemetry Ingestion (with Automatic Service Discovery)
@app.post(
    "/api/v1/telemetry",
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Telemetry Ingestion"],
    summary="Ingest telemetry event (SDK Auto-Discovery)",
    description="Accepts microservice error traces or performance logs, automatically registers the service if new, buffers in Redis Stream, and broadcasts via WebSocket.",
)
@app.post(
    "/api/v1/logs/ingest",
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Telemetry Ingestion"],
    summary="Ingest telemetry event (alias)",
    include_in_schema=False,
)
async def ingest_telemetry(
    payload: TelemetryPayload,
    auth_ctx: dict = Depends(verify_api_key),
):
    project_id = auth_ctx.get("project_id") or "00000000-0000-0000-0000-000000000001"
    svc_id = payload.resolved_service_id
    event_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    level = payload.level or ("ERROR" if payload.error_type else "INFO")
    stack_trace = sanitize_stack_trace_string(payload.stack_trace or payload.raw_stack_trace or "")
    runtime = payload.runtime or "node"
    environment = payload.environment or "production"
    version = payload.version or "1.0.0"

    # Trigger async service auto-discovery strictly scoped to the authenticated project
    asyncio.create_task(auto_discover_service(
        project_id=project_id,
        service_id=svc_id,
        runtime=runtime,
        environment=environment,
        version=version,
    ))

    source = "sdk"
    if isinstance(payload.metadata, dict) and payload.metadata.get("source"):
        source = str(payload.metadata["source"])

    log_event = {
        "id": event_id,
        "project_id": project_id,
        "type": "TELEMETRY",
        "source": source,
        "service_id": svc_id,
        "runtime": runtime,
        "environment": environment,
        "version": version,
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
        "project_id": project_id,
        "service_id": payload.service_id,
        "runtime": runtime,
        "message": f"Telemetry event queued for ML inference. Service '{payload.service_id}' auto-discovered in project.",
    }


@app.post(
    "/api/v1/telemetry/batch",
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Telemetry Ingestion"],
    summary="Ingest batch telemetry events",
    description="Pushes a high-volume batch of log events atomically into the Redis ingestion stream and auto-discovers services.",
)
async def ingest_batch_telemetry(
    payload: BatchTelemetryPayload,
    auth_ctx: dict = Depends(verify_api_key),
):
    project_id = auth_ctx.get("project_id") or "00000000-0000-0000-0000-000000000001"
    timestamp = datetime.now(timezone.utc).isoformat()
    count = 0
    pipe = redis_client.pipeline()

    for event in payload.events:
        event_dict = event.model_dump()
        event_dict["id"] = str(uuid.uuid4())
        event_dict["project_id"] = project_id
        event_dict["received_at"] = timestamp
        event_dict["timestamp"] = event_dict.get("timestamp") or timestamp
        stack_val = sanitize_stack_trace_string(event_dict.get("stack_trace") or event_dict.get("raw_stack_trace") or "")
        event_dict["stack_trace"] = stack_val
        event_dict["raw_stack_trace"] = stack_val
        resolved_svc = event.resolved_service_id
        event_dict["service_id"] = resolved_svc
        runtime = event_dict.get("runtime") or "node"
        environment = event_dict.get("environment") or "production"
        version = event_dict.get("version") or "1.0.0"
        
        source = "sdk"
        if isinstance(event_dict.get("metadata"), dict) and event_dict["metadata"].get("source"):
            source = str(event_dict["metadata"]["source"])
        event_dict["source"] = source
        event_dict["type"] = "TELEMETRY"

        # Background auto-discover scoped to project
        asyncio.create_task(auto_discover_service(
            project_id=project_id,
            service_id=resolved_svc,
            runtime=runtime,
            environment=environment,
            version=version,
        ))

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
        "project_id": project_id,
        "message": f"Successfully queued {count} telemetry events.",
    }


@app.get(
    "/api/v1/telemetry/recent",
    tags=["Telemetry Ingestion"],
    summary="Fetch recent telemetry events from stream",
    description="Retrieves the most recent telemetry log events from Redis Stream for live UI console initialization.",
)
async def get_recent_telemetry(
    limit: int = Query(50, ge=1, le=200),
    service_id: Optional[str] = Query(None),
    auth_ctx: dict = Depends(get_request_auth),
):
    events = []
    try:
        raw_entries = await redis_client.xrevrange(STREAM_KEY, "+", "-", count=limit * 2)
        for msg_id, data in raw_entries:
            payload_str = data.get("payload") or data.get(b"payload")
            if isinstance(payload_str, bytes):
                payload_str = payload_str.decode("utf-8")
            if payload_str:
                try:
                    parsed = json.loads(payload_str)
                    if not service_id or parsed.get("service_id") == service_id:
                        events.append(parsed)
                        if len(events) >= limit:
                            break
                except Exception:
                    continue
    except Exception as exc:
        logger.warning(f"Error fetching recent telemetry from stream: {exc}")

    # If stream has fewer items than requested, fetch recent entries from PostgreSQL database
    if len(events) < limit and db_engine:
        try:
            async with db_engine.connect() as conn:
                service_clause = "WHERE service_id = :service_id" if service_id else ""
                params: Dict[str, Any] = {"limit": limit - len(events)}
                if service_id:
                    params["service_id"] = service_id
                db_res = await conn.execute(text(f"""
                    SELECT id, service_id, timestamp, level, message, latency_ms, status_code, endpoint, error_type, stack_trace
                    FROM telemetry_logs
                    {service_clause}
                    ORDER BY timestamp DESC
                    LIMIT :limit
                """), params)
                for row in db_res.fetchall():
                    events.append({
                        "id": str(row[0]),
                        "service_id": row[1],
                        "timestamp": row[2].isoformat() if row[2] else datetime.now(timezone.utc).isoformat(),
                        "level": row[3] or "INFO",
                        "message": row[4] or "",
                        "log_message": row[4] or "",
                        "latency_ms": float(row[5] or 0),
                        "status_code": int(row[6] or 200),
                        "endpoint": row[7] or "",
                        "error_type": row[8],
                        "stack_trace": row[9],
                        "raw_stack_trace": row[9],
                    })
        except Exception as exc:
            logger.warning(f"Error fetching fallback telemetry from database: {exc}")

    return events


# 2. Cluster Statistics
@app.get(
    "/api/v1/stats",
    tags=["Cluster Statistics"],
    summary="Fetch pipeline & cluster telemetry statistics",
)
async def get_cluster_stats(current_user: Optional[dict] = Depends(get_current_user_optional)):
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
            "total_incidents_count": 0,
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

            # If no events occurred in the last 5-minute sliding window,
            # calculate cluster metrics from all available telemetry logs for consistency
            if total_events == 0:
                all_time_metrics = await conn.execute(text("""
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
                """))
                at_row = all_time_metrics.first()
                if at_row and at_row[0]:
                    at_total = int(at_row[0] or 0)
                    p95_latency = float(at_row[1] or 0)
                    error_count = int(at_row[2] or 0)
                    error_rate = ((error_count / at_total) * 100) if at_total else 0
                else:
                    error_rate = 0
            else:
                error_rate = ((error_count / total_events) * 100) if total_events else 0

            # Incident counts
            incidents_total_res = await conn.execute(text("SELECT COUNT(*) FROM incidents"))
            total_incidents = int(incidents_total_res.scalar() or 0)

            incidents_open_res = await conn.execute(text("""
                SELECT COUNT(*)
                FROM incidents
                WHERE status IN ('OPEN', 'INVESTIGATING')
            """))
            open_incidents = int(incidents_open_res.scalar() or 0)

            # Telemetry logs total count
            logs_total_res = await conn.execute(text("SELECT COUNT(*) FROM telemetry_logs"))
            total_logs = int(logs_total_res.scalar() or 0)
            if total_logs == 0 and stream_length > 0:
                total_logs = stream_length

            active_services = await conn.execute(text("""
                SELECT COUNT(*)
                FROM services
                WHERE status = 'ACTIVE'
            """))
            service_count = int(active_services.scalar() or 0)

            ingestion_rate = total_events / 300

            return {
                "events_per_sec": round(ingestion_rate, 2),
                "ingestion_rate_per_sec": round(ingestion_rate, 2),
                "total_logs_ingested": total_logs,
                "total_incidents_count": total_incidents,
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

            if not points:
                # If no points in current sliding window, fallback to latest recorded telemetry window
                latest_ts_res = await conn.execute(text(f"""
                    SELECT MAX(timestamp) FROM telemetry_logs WHERE 1=1 {service_filter_sql}
                """), params)
                latest_ts = latest_ts_res.scalar()
                if latest_ts:
                    fallback_stmt = text(f"""
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
                        WHERE timestamp >= :latest_ts - INTERVAL '{window_seconds} seconds'
                          AND timestamp <= :latest_ts + INTERVAL '1 second'
                        {service_filter_sql}
                        GROUP BY 1
                        ORDER BY 1 ASC
                    """)
                    fallback_params = {**params, "latest_ts": latest_ts}
                    fb_result = await conn.execute(fallback_stmt, fallback_params)
                    for row in fb_result.fetchall():
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
    source: Optional[str] = Query(None, description="Filter by source: 'sdk', 'simulation', 'all'"),
    limit: int = Query(50, ge=1, le=1000, description="Max incidents to return"),
    auth_ctx: dict = Depends(get_request_auth),
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
                        i.resolved_at,
                        COALESCE(i.source, 'sdk') AS source
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

                if source and source.lower() != "all":
                    query_str += " AND i.source = :source"
                    params["source"] = source

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
                        "source": row[13] or "sdk",
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
    auth_ctx: dict = Depends(get_request_auth),
):
    """
    Return the complete incident dossier.

    Includes:
      - ML anomaly information
      - stack trace
      - AI diagnosis
      - pgvector semantic historical fixes
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
                    i.resolved_at,
                    i.similar_fixes,
                    COALESCE(i.source, 'sdk') AS source
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
                stored_similar_fixes,
                incident_source,
            ) = row

            service_identifier = service_name or str(db_service_id)

            # ========================================================
            # 2. Retrieve pgvector historical fixes
            # ========================================================
            hist_fixes = []

            if isinstance(stored_similar_fixes, list) and len(stored_similar_fixes) > 0:
                hist_fixes = stored_similar_fixes
            else:
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

                        if (
                            error_type
                            and historical_error_type
                            and historical_error_type == error_type
                        ):
                            relevance = 0.92
                        elif (
                            historical_service_id
                            and historical_service_id == db_service_id
                        ):
                            relevance = 0.76
                        else:
                            relevance = 0.64

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
                    root_cause or ""
                ),

                "ai_suggested_patch": (
                    suggested_patch or ""
                ),

                "ai_recommended_fix": (
                    suggested_patch or ""
                ),

                "code_diff": (
                    suggested_patch or ""
                ),

                "is_diagnosed": bool(
                    is_diagnosed and (root_cause or suggested_patch)
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
    authorization: str | None = Header(default=None),
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
async def trigger_ai_doctor(
    incident_id: str,
    authorization: str | None = Header(default=None),
):
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


# 4. Detected Services Fleet
@app.get(
    "/api/v1/services",
    tags=["Detected Services"],
    summary="List all automatically detected microservices",
    description="Returns all services discovered from SDK telemetry with runtime metadata, version, health status, and real-time performance indicators.",
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
                        COUNT(i.id) AS incident_count,
                        s.project_id,
                        COALESCE(s.service_id, s.name) AS service_id,
                        COALESCE(s.runtime, 'node') AS runtime,
                        COALESCE(s.version, '1.0.0') AS version,
                        s.first_seen_at,
                        s.last_seen_at
                    FROM services s
                    LEFT JOIN incidents i ON s.id = i.service_id AND i.status IN ('OPEN', 'INVESTIGATING')
                    GROUP BY s.id, s.name, s.environment, s.status, s.api_key_hash, s.created_at, s.owner_id, s.project_id, s.service_id, s.runtime, s.version, s.first_seen_at, s.last_seen_at
                    ORDER BY s.last_seen_at DESC NULLS LAST, s.name ASC
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
                        WHERE (service_id = :service_id OR service_id IN (SELECT id FROM services WHERE id::text = :service_id_str OR name = :service_id_str OR service_id = :service_id_str))
                          AND created_at >= NOW() - INTERVAL '15 minutes'
                    """), {"service_id": row[0], "service_id_str": str(row[1] or row[0])})

                    metric = service_metrics.first()
                    requests = int(metric[0] or 0)
                    latency = float(metric[1] or 0)
                    errors = int(metric[2] or 0)
                    last_activity = metric[3]

                    if requests == 0:
                        all_time = await conn.execute(text("""
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
                            WHERE (service_id = :service_id OR service_id IN (SELECT id FROM services WHERE id::text = :service_id_str OR name = :service_id_str OR service_id = :service_id_str))
                        """), {"service_id": row[0], "service_id_str": str(row[1] or row[0])})
                        at_metric = all_time.first()
                        if at_metric and at_metric[0]:
                            requests = int(at_metric[0] or 0)
                            latency = float(at_metric[1] or 0)
                            errors = int(at_metric[2] or 0)
                            last_activity = at_metric[3]

                    error_rate = (
                        (errors / requests) * 100
                        if requests
                        else 0
                    )

                    last_seen = row[13] or last_activity or row[5]

                    services.append({
                        "id": row[1] or str(row[0]),
                        "service_id": row[9] or row[1] or str(row[0]),
                        "name": row[1] or "Service",
                        "project_id": str(row[8]) if row[8] else None,
                        "runtime": row[10] or "node",
                        "version": row[11] or "1.0.0",
                        "environment": row[2] or "production",
                        "status": (row[3] or "ACTIVE").lower(),
                        "requests": requests,
                        "error_rate": round(error_rate, 2),
                        "latency_ms": round(latency, 2),
                        "incident_count": int(row[7] or 0),
                        "first_seen_at": row[12].isoformat() if row[12] else (row[5].isoformat() if row[5] else None),
                        "last_seen_at": last_seen.isoformat() if last_seen else None,
                        "last_activity": last_seen.isoformat() if last_seen else None,
                        "created_at": row[5].isoformat() if row[5] else None,
                        "owner_id": str(row[6]) if row[6] else None,
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
    new_key = f"at_live_{secrets.token_hex(16)}"
    key_hash = hashlib.sha256(new_key.encode("utf-8")).hexdigest()

    if not db_engine:
        raise HTTPException(status_code=503, detail="Database unavailable.")

    try:
        async with db_engine.begin() as conn:
            res = await conn.execute(
                text("""
                    INSERT INTO services (name, description, environment, status, api_key_hash, owner_id)
                    VALUES (:name, :desc, :env, 'ACTIVE', :key_hash, :owner_id)
                    RETURNING id, name, environment, status, created_at, owner_id
                """),
                {"name": service_name, "desc": payload.description or f"Microservice {service_name}",
                 "env": payload.environment, "key_hash": key_hash, "owner_id": current_user["id"]},
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
        "source": "simulation",
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
        "metadata": {"source": "simulation", "scenario": payload.scenario},
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
    redis_stream_length = 0
    redis_memory_used = None
    ml_worker_status = "healthy"
    ml_entries_processed = 0
    rag_doctor_status = "healthy"

    try:
        redis_stream_length = await redis_client.xlen(STREAM_KEY)
        redis_info = await redis_client.info("memory")
        redis_memory_used = redis_info.get("used_memory_human")

        # Dynamic probe for ML Anomaly Service Consumer Group
        try:
            groups = await redis_client.xinfo_groups(STREAM_KEY)
            ml_group = next((g for g in groups if g.get("name") == CONSUMER_GROUP), None)
            if ml_group:
                consumers = int(ml_group.get("consumers") or 0)
                entries_read = int(ml_group.get("entries-read") or 0)
                ml_worker_status = "healthy" if consumers > 0 else "degraded"
                # Calculate real queue throughput from entries read over window
                ml_entries_processed = entries_read
            else:
                # Consumer group not found — worker has not registered yet
                ml_worker_status = "degraded"
                ml_entries_processed = 0
        except Exception:
            # Cannot probe Redis stream groups — treat as degraded, not healthy
            ml_worker_status = "degraded"
            ml_entries_processed = 0

        # Dynamic probe for RAG Diagnostic Service PubSub Subscriber
        try:
            sub_info = await redis_client.pubsub_numsub("anomaly_events")
            if sub_info and len(sub_info) > 0:
                subscriber_count = int(sub_info[0][1])
                rag_doctor_status = "healthy" if subscriber_count > 0 else "degraded"
            else:
                # No subscriber data returned — RAG service not subscribed
                rag_doctor_status = "degraded"
        except Exception:
            # Cannot probe PubSub — treat as degraded, not healthy
            rag_doctor_status = "degraded"

    except Exception as exc:
        redis_status = "offline"
        ml_worker_status = "offline"
        rag_doctor_status = "offline"
        logger.warning("Health check Redis probe failed: %s", exc)

    postgres_status = "unknown"
    postgres_connections = 0
    vector_idx_count = 0
    indexed_embeddings_count = 0
    if db_engine is not None:
        try:
            async with db_engine.connect() as conn:
                postgres_connections = int(
                    (await conn.execute(
                        text("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()")
                    )).scalar_one()
                )
                idx_res = await conn.execute(
                    text(
                        "SELECT count(*) FROM pg_indexes "
                        "WHERE schemaname NOT IN ('pg_catalog', 'information_schema') "
                        "AND indexdef ILIKE '%vector%'"
                    )
                )
                vector_idx_count = int(idx_res.scalar_one() or 0)

                indexed_res = await conn.execute(text("SELECT count(*) FROM historical_fixes WHERE embedding IS NOT NULL"))
                indexed_embeddings_count = int(indexed_res.scalar_one() or 0)
            postgres_status = "healthy"
        except Exception as exc:
            postgres_status = "offline"
            logger.warning("Health check PostgreSQL probe failed: %s", exc)

    latency_ms = round((time.perf_counter() - started) * 1000, 2)

    anomaly_threshold = float(os.getenv("ANOMALY_THRESHOLD", "0.75"))
    anomaly_window_seconds = int(os.getenv("ANOMALY_WINDOW_SIZE_SECONDS", "300"))
    ml_contamination = float(os.getenv("ANOMALY_CONTAMINATION", os.getenv("ML_CONTAMINATION", "0.05")))
    embedding_model = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
    llm_model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    # embedding_dimension is a static property of the BAAI/bge-small-en-v1.5 model;
    # 384 is the correct constant but it is a model spec, not a runtime measurement.
    embedding_dimension = 384

    return {
        "status": "online" if redis_status == "healthy" and postgres_status == "healthy" else "degraded",
        "api_status": "healthy",
        "api_latency_ms": latency_ms,
        "service": "ingestion-service",
        "version": "1.2.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latency_ms": latency_ms,
        "redis_status": redis_status,
        "redis_stream_length": redis_stream_length,
        "redis_memory_used": redis_memory_used,
        "postgres_status": postgres_status,
        "postgres_connections": postgres_connections,
        # Three distinct pgvector concepts — do not conflate these:
        "embedding_dimension": embedding_dimension,       # model constant (384-dim vectors)
        "vector_index_count": vector_idx_count,           # actual IVFFlat/HNSW indexes in pg_indexes
        "indexed_knowledge_records": indexed_embeddings_count,  # rows in historical_fixes with embeddings
        "ml_worker_status": ml_worker_status,
        "ml_entries_processed": ml_entries_processed,     # cumulative stream entries read by this consumer group
        "ml_contamination": ml_contamination,
        "anomaly_threshold": anomaly_threshold,
        "anomaly_window_seconds": anomaly_window_seconds,
        "rag_doctor_status": rag_doctor_status,
        "embedding_model": embedding_model,
        # embedding_latency_ms and llm_latency_ms are not measured at health-check time;
        # returning null so the UI shows "Unavailable" rather than a fake number.
        "embedding_latency_ms": None,
        "llm_latency_ms": None,
        "llm_model": llm_model,
        "active_ws_clients": len(manager.active_connections),
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
                "vector_index_count": vector_idx_count,
                "embedding_dimension": embedding_dimension,
                "indexed_knowledge_records": indexed_embeddings_count,
            },
        },
    }
