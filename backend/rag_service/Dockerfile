FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/shared/requirements.txt /app/shared_requirements.txt
COPY backend/rag_service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/shared_requirements.txt -r /app/requirements.txt

COPY backend/ /app/backend/
COPY backend/shared/ /app/shared/
COPY backend/rag_service/ /app/rag_service/

ENV PYTHONPATH=/app:/app/backend
ENV HF_HOME=/app/.cache/huggingface

# Pre-download embedding model during build for fast startup
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-en-v1.5')" || true

CMD ["python", "-m", "backend.rag_service.worker"]
