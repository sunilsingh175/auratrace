"""
AuraTrace High-Performance Ingestion Gateway (FastAPI)
Handles non-blocking telemetry ingestion, API authentication, incident querying, and live WebSocket streaming.
"""

import time
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import (
    FastAPI,
    HTTPException,
    Header,
    Security,
    Depends,
    WebSocket,
    WebSocketDisconnect,
    Query,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from .config import settings
    from .schemas import (
        TelemetryItem,
        TelemetryBatch,
        IngestionResponse,
        IncidentResponse,
        IncidentStatusUpdate,
        ServiceRegister,
        StatsResponse,
    )
    from .producer import producer
except ImportError:
    from config import settings
    from schemas import (
        TelemetryItem,
        TelemetryBatch,
        IngestionResponse,
        IncidentResponse,
        IncidentStatusUpdate,
        ServiceRegister,
        StatsResponse,
    )
    from producer import producer
from backend.shared.database import (
    get_db_session,
    Service,
    TelemetryLog,
    IncidentReport,
)
from backend.shared.logger import get_logger

logger = get_logger("ingestion-gateway")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages application startup and teardown lifecycle."""
    logger.info("Initializing AuraTrace Ingestion Gateway...")
    await producer.connect()
    yield
    logger.info("Shutting down AuraTrace Ingestion Gateway...")
    await producer.close()


app = FastAPI(
    title="AuraTrace Telemetry Gateway",
    description="High-throughput telemetry ingestion and real-time observability gateway",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory sliding stats window for instant /api/v1/stats calculation
STATS_WINDOW: List[dict] = []
TOTAL_LOGS_INGESTED = 0


# ==============================================================================
# Authentication & Verification Dependency
# ==============================================================================
async def verify_api_key(
    x_api_key: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db_session)
) -> str:
    """
    Validates the X-API-Key header against master key or database service keys.
    """
    # Allow master key bypass for development and root services
    if x_api_key == settings.AURA_MASTER_API_KEY:
        return "master"

    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key authentication header.",
        )

    # Check registered services in database
    result = await db.execute(
        select(Service).where(Service.api_key == x_api_key)
    )
    service = result.scalars().first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or unrecognized API key.",
        )

    return service.id


# ==============================================================================
# Telemetry Ingestion Endpoints
# ==============================================================================
@app.post(
    "/api/v1/telemetry",
    response_model=IngestionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest single telemetry log",
)
async def ingest_telemetry(
    item: TelemetryItem,
    api_key_auth: str = Depends(verify_api_key),
):
    """
    Non-blocking endpoint buffering incoming log telemetry into Redis Stream (`<20ms`).
    """
    global TOTAL_LOGS_INGESTED
    TOTAL_LOGS_INGESTED += 1

    # Record metric in rolling memory for rapid stat gauge reporting
    now_ts = time.time()
    STATS_WINDOW.append({
        "time": now_ts,
        "latency_ms": item.latency_ms,
        "is_error": item.level.upper() in ("ERROR", "CRITICAL"),
    })

    # Buffer directly into Redis Stream
    await producer.produce_event(item)

    return IngestionResponse(
        status="success",
        ingested_count=1,
    )


@app.post(
    "/api/v1/telemetry/batch",
    response_model=IngestionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest batch telemetry logs",
)
async def ingest_telemetry_batch(
    batch: TelemetryBatch,
    api_key_auth: str = Depends(verify_api_key),
):
    """
    Bulk ingestion endpoint for high-frequency client SDK batches.
    """
    global TOTAL_LOGS_INGESTED
    TOTAL_LOGS_INGESTED += len(batch.events)

    now_ts = time.time()
    for itm in batch.events:
        STATS_WINDOW.append({
            "time": now_ts,
            "latency_ms": itm.latency_ms,
            "is_error": itm.level.upper() in ("ERROR", "CRITICAL"),
        })

    await producer.produce_batch(batch.events)

    return IngestionResponse(
        status="success",
        ingested_count=len(batch.events),
    )


# ==============================================================================
# Incident Management Endpoints
# ==============================================================================
@app.get(
    "/api/v1/incidents",
    response_model=List[IncidentResponse],
    summary="Query incidents",
)
async def list_incidents(
    status_filter: Optional[str] = Query(None, alias="status"),
    service_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Returns list of AI-diagnosed incident reports with pagination.
    """
    query = select(IncidentReport).order_by(desc(IncidentReport.created_at)).offset(offset).limit(limit)

    if status_filter:
        query = query.where(IncidentReport.status == status_filter.upper())
    if service_id:
        query = query.where(IncidentReport.service_id == service_id)

    result = await db.execute(query)
    incidents = result.scalars().all()
    return incidents


@app.get(
    "/api/v1/incidents/{incident_id}",
    response_model=IncidentResponse,
    summary="Get incident detail",
)
async def get_incident(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Retrieves full details of a specific incident, including root cause and code diff patch.
    """
    result = await db.execute(
        select(IncidentReport).where(IncidentReport.id == incident_id)
    )
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID {incident_id} not found.",
        )
    return incident


@app.patch(
    "/api/v1/incidents/{incident_id}/status",
    response_model=IncidentResponse,
    summary="Update incident status",
)
async def update_incident_status(
    incident_id: uuid.UUID,
    update_data: IncidentStatusUpdate,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Updates the triage status of an incident (e.g. OPEN -> RESOLVED).
    """
    result = await db.execute(
        select(IncidentReport).where(IncidentReport.id == incident_id)
    )
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID {incident_id} not found.",
        )

    incident.status = update_data.status
    if update_data.status == "RESOLVED":
        incident.resolved_at = datetime.now(timezone.utc)
    else:
        incident.resolved_at = None

    await db.commit()
    await db.refresh(incident)
    return incident


# ==============================================================================
# Services & Platform Statistics Endpoints
# ==============================================================================
@app.get(
    "/api/v1/services",
    summary="List registered services",
)
async def list_services(db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(Service))
    services = result.scalars().all()
    return services


@app.post(
    "/api/v1/services",
    summary="Register a new microservice",
)
async def register_service(
    service: ServiceRegister,
    db: AsyncSession = Depends(get_db_session),
):
    generated_key = service.api_key or f"aura_{uuid.uuid4().hex[:16]}"
    new_service = Service(
        id=service.id,
        name=service.name,
        api_key=generated_key,
        environment=service.environment,
    )
    db.add(new_service)
    try:
        await db.commit()
        await db.refresh(new_service)
        return new_service
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to register service: {str(e)}",
        )


@app.get(
    "/api/v1/stats",
    response_model=StatsResponse,
    summary="Real-time platform metrics",
)
async def get_system_stats(db: AsyncSession = Depends(get_db_session)):
    """
    Calculates live throughput (req/s), P95 latency, and error percentage.
    """
    global STATS_WINDOW, TOTAL_LOGS_INGESTED

    # Clean up stats older than 60 seconds
    cutoff = time.time() - 60.0
    STATS_WINDOW = [s for s in STATS_WINDOW if s["time"] >= cutoff]

    window_count = len(STATS_WINDOW)
    rate_per_sec = round(window_count / 60.0, 2) if window_count > 0 else 0.0

    if window_count > 0:
        latencies = sorted([s["latency_ms"] for s in STATS_WINDOW])
        p95_idx = int(0.95 * len(latencies))
        p95_latency = round(latencies[min(p95_idx, len(latencies) - 1)], 2)
        error_count = sum(1 for s in STATS_WINDOW if s["is_error"])
        error_rate = round((error_count / window_count) * 100.0, 2)
    else:
        p95_latency = 0.0
        error_rate = 0.0

    # Count open incidents and services from DB
    incident_count_res = await db.execute(
        select(func.count(IncidentReport.id)).where(IncidentReport.status == "OPEN")
    )
    open_incidents = incident_count_res.scalar() or 0

    services_count_res = await db.execute(select(func.count(Service.id)))
    active_services = services_count_res.scalar() or 0

    return StatsResponse(
        total_logs_ingested=TOTAL_LOGS_INGESTED,
        ingestion_rate_per_sec=rate_per_sec,
        error_rate_percent=error_rate,
        p95_latency_ms=p95_latency,
        open_incidents_count=open_incidents,
        active_services_count=active_services,
    )


@app.get("/health", summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "service": "auratrace-ingestion",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ==============================================================================
# Live WebSocket Endpoint for Dashboard
# ==============================================================================
@app.websocket("/ws/telemetry")
async def telemetry_websocket(websocket: WebSocket):
    """
    Subscribes the frontend client to the real-time log and anomaly stream.
    """
    await producer.register_websocket(websocket)
    try:
        while True:
            # Keep-alive heartbeat listener
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        producer.unregister_websocket(websocket)
    except Exception:
        producer.unregister_websocket(websocket)
