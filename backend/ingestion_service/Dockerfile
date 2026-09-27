FROM python:3.11-slim

WORKDIR /app

# System dependencies for asyncpg, psycopg, bcrypt compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/shared/requirements.txt /app/shared_requirements.txt
COPY backend/ingestion_service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/shared_requirements.txt -r /app/requirements.txt

COPY backend/ /app/backend/
COPY backend/shared/ /app/shared/
COPY backend/ingestion_service/ /app/ingestion_service/

ENV PYTHONPATH=/app:/app/backend
EXPOSE 8000

CMD ["uvicorn", "backend.ingestion_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
