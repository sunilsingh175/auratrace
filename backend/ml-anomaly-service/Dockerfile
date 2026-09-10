FROM python:3.11-slim
WORKDIR /app
COPY backend/ml-anomaly-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/shared/ /app/backend/shared/
COPY backend/ml-anomaly-service/ /app/backend/ml-anomaly-service/
COPY scripts/datasets/ /app/scripts/datasets/
RUN python /app/backend/ml-anomaly-service/train_model.py || true
CMD ["python", "-m", "backend.ml-anomaly-service.worker"]