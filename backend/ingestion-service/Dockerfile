FROM python:3.11-slim
WORKDIR /app
COPY backend/ingestion-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/shared/ /app/backend/shared/
COPY backend/ingestion-service/ /app/backend/ingestion-service/
CMD ["uvicorn", "backend.ingestion-service.main:app", "--host", "0.0.0.0", "--port", "8000"]