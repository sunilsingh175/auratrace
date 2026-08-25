"""
AuraTrace Ingestion Service Configuration
"""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SERVICE_NAME: str = "ingestion-service"
    ENVIRONMENT: str = "production"
    INGESTION_SERVICE_PORT: int = 8000
    AURA_MASTER_API_KEY: str = "aura_secret_key_123"

    # Database
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres_password_123@localhost:5432/auratrace_db"
    )

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_STREAM_KEY: str = "telemetry_stream"
    REDIS_ANOMALY_CHANNEL: str = "anomaly_alerts"
    REDIS_MAX_STREAM_LEN: int = 100000

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
