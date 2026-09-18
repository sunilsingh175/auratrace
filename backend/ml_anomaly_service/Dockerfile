FROM python:3.11-slim

WORKDIR /app

COPY backend/ml_anomaly_service/requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt

COPY backend/shared/ /app/backend/shared/
COPY backend/ml_anomaly_service/ /app/backend/ml_anomaly_service/

COPY scripts/ /app/scripts/

ENV PYTHONPATH=/app

CMD ["python", "-u", "-m", "backend.ml_anomaly_service.worker"]