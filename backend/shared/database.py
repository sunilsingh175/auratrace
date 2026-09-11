import os
import uuid
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Text, Boolean, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID

try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    from sqlalchemy import NullType as Vector

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres_password_123@localhost:5432/auratrace_db")

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class Service(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    environment: Mapped[str] = mapped_column(String(50), nullable=False, default="production")
    api_key_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class IncidentReport(Base):
    __tablename__ = "incident_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_id: Mapped[str] = mapped_column(String(255), nullable=False)
    error_type: Mapped[str] = mapped_column(String(255), nullable=False)
    stack_trace: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)
    ai_root_cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)
    ai_suggested_patch: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default=None)
    anomaly_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="OPEN")
    is_diagnosed: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    embedding: Mapped[Optional[Any]] = mapped_column(Vector(384), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
