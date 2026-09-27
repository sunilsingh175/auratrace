FROM python:3.11-slim

WORKDIR /app

# Git + Node (for sandbox testing), plus build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    git \
    nodejs \
    npm \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/shared/requirements.txt /app/shared_requirements.txt
COPY backend/repair_engine/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/shared_requirements.txt -r /app/requirements.txt

COPY backend/ /app/backend/
COPY backend/shared/ /app/shared/
COPY backend/repair_engine/ /app/repair_engine/

ENV PYTHONPATH=/app:/app/backend

CMD ["python", "-m", "backend.repair_engine.worker"]
