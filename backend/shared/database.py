"""
AuraTrace Shared Database Layer
Provides async SQLAlchemy 2.0 models, connection pooling, and session management.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional
from sqlalchemy import (
    String,
    Text,
    Float,
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    select,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
    AsyncEngine,
)
from pgvector.sqlalchemy import Vector


# ==============================================================================
# Database Configuration & Engine Initialization
# ==============================================================================
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres_password_123@localhost:5432/auratrace_db"
)

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


# ==============================================================================
# SQLAlchemy 2.0 ORM Models
# ==============================================================================
class Service(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    api_key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    environment: Mapped[str] = mapped_column(String(32), default="production")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    telemetry_logs: Mapped[list["TelemetryLog"]] = relationship(
        "TelemetryLog", back_populates="service", cascade="all, delete-orphan"
    )
    incident_reports: Mapped[list["IncidentReport"]] = relationship(
        "IncidentReport", back_populates="service", cascade="all, delete-orphan"
    )


class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    service_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    level: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    error_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stack_trace: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    service: Mapped["Service"] = relationship("Service", back_populates="telemetry_logs")


class IncidentKnowledgeBase(Base):
    __tablename__ = "incident_knowledge_base"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    error_type: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    stack_trace_pattern: Mapped[str] = mapped_column(Text, nullable=False)
    root_cause: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_patch: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(384), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class IncidentReport(Base):
    __tablename__ = "incident_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    service_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True
    )
    anomaly_score: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="OPEN", index=True)
    error_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    raw_stack_trace: Mapped[str] = mapped_column(Text, nullable=False)
    ai_root_cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_suggested_patch: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    service: Mapped["Service"] = relationship("Service", back_populates="incident_reports")


# ==============================================================================
# Helper Dependency Injection
# ==============================================================================
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI and worker dependency yielding an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
