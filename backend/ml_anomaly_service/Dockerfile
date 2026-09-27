FROM python:3.11-slim

WORKDIR /app

# Build deps for scikit-learn + asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/shared/requirements.txt /app/shared_requirements.txt
COPY backend/ml_anomaly_service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/shared_requirements.txt -r /app/requirements.txt

COPY backend/ /app/backend/
COPY backend/shared/ /app/shared/
COPY backend/ml_anomaly_service/ /app/ml_anomaly_service/

# Persist models here
RUN mkdir -p /app/models

ENV PYTHONPATH=/app:/app/backend

CMD ["python", "-m", "backend.ml_anomaly_service.worker"]