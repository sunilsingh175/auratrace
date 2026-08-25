FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies and install
COPY backend/ml-anomaly-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared utilities and service source code
COPY backend/shared/ /app/backend/shared/
COPY backend/ml-anomaly-service/ /app/backend/ml-anomaly-service/

ENV PYTHONPATH=/app:/app/backend/ml-anomaly-service
ENV SERVICE_NAME=ml-anomaly-service

CMD ["python", "-u", "backend/ml-anomaly-service/worker.py"]
