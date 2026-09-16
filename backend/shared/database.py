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
    "postgresql+asyncpg://postgres:postgres_password_123@localhost:5432/auratrace_db",
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
# SERVICES
# ============================================================

class Service(Base):
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    environment: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="production",
    )

    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="ACTIVE",
    )

    api_key_hash: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
        unique=True,
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
# SERVICE RESOLUTION HELPER
# ============================================================

async def get_or_create_service_id(session: AsyncSession, identifier: str) -> uuid.UUID:
    """
    Resolve a service identifier (UUID or service name slug) to its database UUID.
    If the service does not exist, it is automatically created.
    """
    if not identifier:
        identifier = "unknown-service"

    # Try parsing as UUID
    try:
        service_uuid = uuid.UUID(str(identifier))
        result = await session.execute(
            select(Service).where(Service.id == service_uuid)
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing.id
    except (ValueError, TypeError):
        pass

    # Lookup by name/slug
    from sqlalchemy import select
    result = await session.execute(
        select(Service).where(Service.name == str(identifier))
    )
    service = result.scalar_one_or_none()
    if service:
        return service.id

    # Create new service
    new_service = Service(
        name=str(identifier),
        description=f"Auto-registered service for {identifier}",
        environment="production",
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