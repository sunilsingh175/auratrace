from fastapi import FastAPI, Header, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import hashlib
import hmac
import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from .producer import push_log_to_stream
except (ImportError, ValueError):
    from producer import push_log_to_stream

try:
    from backend.shared.database import AsyncSessionLocal, IncidentReport, Service
except ImportError:
    from shared.database import AsyncSessionLocal, IncidentReport, Service

from sqlalchemy import select, func, desc

app = FastAPI(title="AuraTrace Ingestion Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MASTER_API_KEY = os.getenv("AURA_MASTER_API_KEY", "")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                dead.append(connection)
        for connection in dead:
            self.disconnect(connection)

manager = ConnectionManager()

class TelemetryPayload(BaseModel):
    service_id: str
    message: Optional[str] = None
    error_type: Optional[str] = None
    raw_stack_trace: Optional[str] = None
    anomaly_score: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class ServiceCreate(BaseModel):
    id: str
    name: str
    environment: str = "production"

class StatusUpdate(BaseModel):
    status: str


def require_master_key(x_api_key: Optional[str]) -> None:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API Key missing")
    if not MASTER_API_KEY or not hmac.compare_digest(x_api_key, MASTER_API_KEY):
        raise HTTPException(status_code=403, detail="Invalid API Key")


def service_key_hash(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()

@app.post("/api/v1/telemetry", status_code=status.HTTP_201_CREATED)
async def ingest_telemetry(payload: TelemetryPayload, x_api_key: Optional[str] = Header(None)):
    require_master_key(x_api_key)

    log_event = {
        "id": str(uuid.uuid4()),
        "type": "LOG_ENTRY",
        "service_id": payload.service_id,
        "message": payload.message or "No message provided",
        "log_message": payload.message or "No message provided",
        "level": "ERROR" if payload.error_type else "INFO",
        "error_type": payload.error_type,
        "raw_stack_trace": payload.raw_stack_trace,
        "anomaly_score": payload.anomaly_score or 0.0,
        "metadata": payload.metadata or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    await manager.broadcast(log_event)
    await push_log_to_stream(log_event)
    return {"status": "success", "message": "Telemetry event ingested successfully", "service_id": payload.service_id}

@app.get("/api/v1/stats")
async def get_cluster_stats(x_api_key: Optional[str] = Header(None)):
    require_master_key(x_api_key)
    async with AsyncSessionLocal() as session:
        total = await session.scalar(select(func.count()).select_from(IncidentReport))
        open_count = await session.scalar(select(func.count()).select_from(IncidentReport).where(IncidentReport.status == "OPEN"))
        services = await session.scalar(select(func.count()).select_from(Service))
    return {
        "total_logs_ingested": int(total or 0),
        "ingestion_rate_per_sec": 0,
        "error_rate_percent": 0,
        "p95_latency_ms": 0,
        "open_incidents_count": int(open_count or 0),
        "active_services_count": int(services or 0)
    }

@app.get("/api/v1/incidents")
async def get_incidents(limit: int = 50, status_filter: Optional[str] = None, service_id: Optional[str] = None, x_api_key: Optional[str] = Header(None)):
    require_master_key(x_api_key)
    limit = max(1, min(limit, 200))
    async with AsyncSessionLocal() as session:
        query = select(IncidentReport).order_by(desc(IncidentReport.created_at)).limit(limit)
        if status_filter:
            query = query.where(IncidentReport.status == status_filter.upper())
        if service_id:
            query = query.where(IncidentReport.service_id == service_id)
        rows = (await session.execute(query)).scalars().all()
        return [incident_to_dict(x) for x in rows]

@app.get("/api/v1/incidents/{incident_id}")
async def get_incident(incident_id: str, x_api_key: Optional[str] = Header(None)):
    require_master_key(x_api_key)
    try:
        parsed_id = uuid.UUID(incident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID")
    async with AsyncSessionLocal() as session:
        incident = await session.get(IncidentReport, parsed_id)
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        return incident_to_dict(incident)

@app.patch("/api/v1/incidents/{incident_id}/status")
async def update_incident_status(incident_id: str, body: StatusUpdate, x_api_key: Optional[str] = Header(None)):
    require_master_key(x_api_key)
    if body.status not in {"OPEN", "INVESTIGATING", "RESOLVED"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    try:
        parsed_id = uuid.UUID(incident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID")
    async with AsyncSessionLocal() as session:
        incident = await session.get(IncidentReport, parsed_id)
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        incident.status = body.status
        incident.resolved_at = datetime.now(timezone.utc) if body.status == "RESOLVED" else None
        await session.commit()
        await session.refresh(incident)
        return incident_to_dict(incident)

@app.get("/api/v1/services")
async def get_services(x_api_key: Optional[str] = Header(None)):
    require_master_key(x_api_key)
    async with AsyncSessionLocal() as session:
        rows = (await session.execute(select(Service).order_by(desc(Service.created_at)))).scalars().all()
        return [{"id": x.id, "name": x.name, "environment": x.environment, "api_key": "********", "created_at": x.created_at.isoformat()} for x in rows]

@app.post("/api/v1/services", status_code=201)
async def register_service(payload: ServiceCreate, x_api_key: Optional[str] = Header(None)):
    require_master_key(x_api_key)
    service_key = f"aura_{uuid.uuid4().hex}"
    async with AsyncSessionLocal() as session:
        if await session.get(Service, payload.id):
            raise HTTPException(status_code=409, detail="Service ID already exists")
        service = Service(id=payload.id.strip(), name=payload.name.strip(), environment=payload.environment.strip(), api_key_hash=service_key_hash(service_key))
        session.add(service)
        await session.commit()
        return {"id": service.id, "name": service.name, "environment": service.environment, "api_key": service_key, "created_at": service.created_at.isoformat()}

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy"}

@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

def incident_to_dict(incident: IncidentReport) -> dict:
    return {
        "id": str(incident.id),
        "service_id": incident.service_id,
        "anomaly_score": incident.anomaly_score or 0.0,
        "status": incident.status,
        "error_type": incident.error_type,
        "raw_stack_trace": incident.stack_trace or "",
        "ai_root_cause": incident.ai_root_cause,
        "ai_suggested_patch": incident.ai_suggested_patch,
        "created_at": incident.created_at.isoformat() if incident.created_at else None,
        "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
