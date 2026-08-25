FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU directly first to avoid huge GPU binary overhead
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install
COPY backend/rag-diagnostic-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared utilities and service source code
COPY backend/shared/ /app/backend/shared/
COPY backend/rag-diagnostic-service/ /app/backend/rag-diagnostic-service/

ENV PYTHONPATH=/app:/app/backend/rag-diagnostic-service
ENV SERVICE_NAME=rag-diagnostic-service

CMD ["python", "-u", "backend/rag-diagnostic-service/worker.py"]
