FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency definition and install
COPY backend/ingestion-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared utilities and service source code
COPY backend/shared/ /app/backend/shared/
COPY backend/ingestion-service/ /app/backend/ingestion-service/

ENV PYTHONPATH=/app
ENV SERVICE_NAME=ingestion-service

EXPOSE 8000

CMD ["uvicorn", "main:app", "--app-dir", "/app/backend/ingestion-service", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
