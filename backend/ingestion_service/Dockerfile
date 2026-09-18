FROM python:3.11-slim
WORKDIR /app
COPY backend/ingestion_service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY backend/shared/ /app/backend/shared/
COPY backend/ingestion_service/ /app/backend/ingestion_service/
CMD ["uvicorn", "backend.ingestion_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
