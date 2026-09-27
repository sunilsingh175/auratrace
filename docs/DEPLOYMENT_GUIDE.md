# 🌐 AuraTrace Deployment Guide

## Quick Start Deploy

```bash
git clone https://github.com/your-org/auratrace.git
cd auratrace
cp .env.production .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## Infrastructure Scaling
- **Ingestion Gateway**: Scale horizontally behind load balancer with multiple pods.
- **Worker Scaling**: Add more consumer group workers (`ml-workers`, `rag-workers`, `repair-workers`) without code modifications.
- **Redis High Availability**: Redis Sentinel or Redis Cluster.
- **Vector Storage**: pgvector IVFFlat / HNSW index scaling for >100,000 incident embeddings.
