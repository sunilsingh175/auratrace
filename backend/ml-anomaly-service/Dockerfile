FROM python:3.11-slim
WORKDIR /app
COPY backend/ml-anomaly-service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY backend/shared/ /app/backend/shared/
COPY backend/ml-anomaly-service/ /app/backend/ml-anomaly-service/
COPY scripts/ /app/scripts/
CMD ["python", "/app/backend/ml-anomaly-service/worker.py"]
