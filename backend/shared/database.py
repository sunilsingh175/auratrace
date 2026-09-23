import os
import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Double,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
    select,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres_password_123@localhost:5432/trace_db",
)


# ============================================================
# ASYNC DATABASE ENGINE
# ============================================================

engine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
)


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ============================================================
# BASE MODEL
# ============================================================

class Base(DeclarativeBase):
    pass


# ============================================================
# PROJECTS
# ============================================================

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    api_key_hash: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        nullable=False,
    )

    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    services: Mapped[list["Service"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
    )


# ============================================================
# SERVICES
# ============================================================

class Service(Base):
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey(
            "projects.id",
            ondelete="CASCADE",
        ),
        nullable=True,
        index=True,
    )

    service_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    runtime: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="node",
    )

    environment: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="production",
    )

    version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="1.0.0",
    )

    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="ACTIVE",
    )

    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    api_key_hash: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
    )

    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        nullable=True,
    )

    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    project: Mapped[Optional["Project"]] = relationship(
        back_populates="services",
    )

    telemetry_logs: Mapped[list["TelemetryLog"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
    )

    incidents: Mapped[list["Incident"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
    )

    historical_fixes: Mapped[list["HistoricalFix"]] = relationship(
        back_populates="service",
    )


# ============================================================
# TELEMETRY LOGS
# ============================================================

class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey(
            "projects.id",
            ondelete="CASCADE",
        ),
        nullable=True,
        index=True,
    )

    service_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey(
            "services.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    level: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="INFO",
    )

    message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    error_type: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    stack_trace: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    latency_ms: Mapped[Optional[float]] = mapped_column(
        Double,
        nullable=True,
    )

    status_code: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    # IMPORTANT:
    # Python attribute is metadata_
    # PostgreSQL column remains "metadata"
    #
    # SQLAlchemy reserves the name "metadata" on Declarative models.
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        default=dict,
    )

    source: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="sdk",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    service: Mapped["Service"] = relationship(
        back_populates="telemetry_logs",
    )

    incidents: Mapped[list["Incident"]] = relationship(
        back_populates="telemetry",
    )


# ============================================================
# INCIDENTS
# ============================================================

class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    service_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey(
            "services.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    telemetry_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey(
            "telemetry_logs.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    anomaly_score: Mapped[float] = mapped_column(
        Double,
        nullable=False,
        default=0.0,
    )

    severity: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="MEDIUM",
    )

    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="OPEN",
        index=True,
    )

    source: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="sdk",
        index=True,
    )

    error_type: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    stack_trace: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    root_cause: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    suggested_patch: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    similar_fixes: Mapped[Optional[list[dict[str, Any]]]] = mapped_column(
        JSONB,
        nullable=True,
        default=list,
    )

    is_diagnosed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    service: Mapped["Service"] = relationship(
        back_populates="incidents",
    )

    telemetry: Mapped[Optional["TelemetryLog"]] = relationship(
        back_populates="incidents",
    )


# ============================================================
# HISTORICAL FIXES
# ============================================================

class HistoricalFix(Base):
    __tablename__ = "historical_fixes"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    service_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey(
            "services.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    error_type: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    stack_trace: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    root_cause: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    fix_description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    code_patch: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # 384 dimensions because the selected embedding model
    # produces 384-dimensional embeddings.
    embedding: Mapped[Optional[list[float]]] = mapped_column(
        Vector(384),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    service: Mapped[Optional["Service"]] = relationship(
        back_populates="historical_fixes",
    )


# Backward-compatibility alias
IncidentReport = Incident


# ============================================================
# SERVICE RESOLUTION HELPER (SDK Auto-Discovery)
# ============================================================

async def get_or_create_service_id(
    session: AsyncSession,
    identifier: str,
    project_id: Optional[uuid.UUID] = None,
    runtime: str = "node",
    environment: str = "production",
    version: str = "1.0.0",
) -> uuid.UUID:
    """
    Resolve a service identifier (UUID or service name slug) to its database UUID.
    If the service does not exist, it is automatically discovered and created under the project.
    """
    if not identifier:
        identifier = "unknown-service"

    # 1. Try parsing as UUID
    try:
        service_uuid = uuid.UUID(str(identifier))
        result = await session.execute(
            select(Service).where(Service.id == service_uuid)
        )
        existing = result.scalar_one_or_none()
        if existing:
            # Update last_seen_at
            existing.last_seen_at = datetime.now(timezone.utc)
            if project_id and not existing.project_id:
                existing.project_id = project_id
            await session.commit()
            return existing.id
    except (ValueError, TypeError):
        pass

    # 2. Lookup by project_id and service_id / name
    if project_id:
        result = await session.execute(
            select(Service).where(
                Service.project_id == project_id,
                (Service.service_id == str(identifier)) | (Service.name == str(identifier))
            )
        )
        service = result.scalar_one_or_none()
        if service:
            service.last_seen_at = datetime.now(timezone.utc)
            if runtime:
                service.runtime = runtime
            if version:
                service.version = version
            if environment:
                service.environment = environment
            await session.commit()
            return service.id

    # 3. Global lookup by name or service_id
    result = await session.execute(
        select(Service).where(
            (Service.name == str(identifier)) | (Service.service_id == str(identifier))
        )
    )
    service = result.scalar_one_or_none()
    if service:
        service.last_seen_at = datetime.now(timezone.utc)
        if project_id and not service.project_id:
            service.project_id = project_id
        if runtime:
            service.runtime = runtime
        if version:
            service.version = version
        await session.commit()
        return service.id

    # 4. Automatically discover and create new service
    new_service = Service(
        project_id=project_id,
        service_id=str(identifier),
        name=str(identifier),
        description=f"Auto-discovered {runtime} service: {identifier}",
        runtime=runtime or "node",
        environment=environment or "production",
        version=version or "1.0.0",
        status="ACTIVE",
    )
    session.add(new_service)
    await session.commit()
    await session.refresh(new_service)
    return new_service.id


# ============================================================
# DATABASE DEPENDENCY
# ============================================================

async def get_db():
    """
    FastAPI dependency that provides an async SQLAlchemy session.
    """

    async with AsyncSessionLocal() as session:
        yield session


# ============================================================
# INITIALIZE DATABASE
# ============================================================

async def init_db() -> None:
    """
    Create database tables if they do not already exist.
    """

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ============================================================
# CLOSE DATABASE
# ============================================================

async def close_db() -> None:
    """
    Dispose the async database engine.
    """

    await engine.dispose()