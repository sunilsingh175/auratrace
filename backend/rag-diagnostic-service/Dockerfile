FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
COPY backend/rag-diagnostic-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/shared/ /app/backend/shared/
COPY backend/rag-diagnostic-service/ /app/backend/rag-diagnostic-service/
CMD ["python", "-m", "backend.rag-diagnostic-service.worker"]