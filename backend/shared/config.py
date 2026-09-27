"""
Central configuration loaded from environment variables.
"""
from typing import Optional
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Core
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "dev-secret-change-in-prod"

    # Database
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres_password_123"
    POSTGRES_DB: str = "auratrace_db"
    POSTGRES_HOST: str = "postgres-db"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql://postgres:postgres_password_123@postgres-db:5432/auratrace_db"

    # Redis
    REDIS_HOST: str = "redis-broker"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://redis-broker:6379/0"
    REDIS_STREAM_KEY: str = "telemetry_stream"
    STREAM_KEY: str = "telemetry_stream"
    DIAGNOSE_STREAM: str = "diagnose_stream"
    REPAIR_STREAM: str = "repair_stream"
    REDIS_ANOMALY_CHANNEL: str = "anomaly_events"
    REDIS_CONSUMER_GROUP: str = "trace_workers"

    # Consumer groups
    STREAM_GROUP_ML: str = "ml-workers"
    STREAM_GROUP_RAG: str = "rag-workers"
    STREAM_GROUP_REPAIR: str = "repair-workers"

    # Security & Auth
    ENCRYPTION_KEY: str = ""
    API_KEY_PREFIX: str = "aura_live_"
    AURA_MASTER_API_KEY: str = "aura_secret_key_123"
    AURA_AUTH_SECRET: str = "aura_auth_super_secret_key_123"
    AURA_ADMIN_REGISTRATION_KEY: str = "admin_secret_key_123"
    ENABLE_API_AUTH: bool = True

    # ML Anomaly Detection
    ANOMALY_CONTAMINATION: float = 0.05
    ANOMALY_THRESHOLD: float = 0.75
    ANOMALY_WINDOW_SIZE_SECONDS: int = 300
    ANOMALY_POLL_INTERVAL_MS: int = 1000
    WINDOW_SECONDS: int = 60

    # LLM & RAG
    LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"
    LLM_MODEL: str = "gemini-2.0-flash-exp"
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"

    # Integrations
    SLACK_WEBHOOK_URL: Optional[str] = None
    DISCORD_WEBHOOK_URL: Optional[str] = None
    GITHUB_TOKEN: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
