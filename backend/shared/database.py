import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    from sqlalchemy import NullType as Vector
from datetime import datetime, timezone
import uuid

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres_password_123@localhost:5432/auratrace_db")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

class IncidentReport(Base):
    __tablename__ = "incident_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_id = Column(String(255), nullable=False)
    error_type = Column(String(255), nullable=False)
    stack_trace = Column(Text)
    reason = Column(Text)
    ai_root_cause = Column(Text)
    ai_suggested_patch = Column(Text)
    embedding = Column(Vector(384))
    is_diagnosed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))