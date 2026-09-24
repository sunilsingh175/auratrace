# AuraTrace Benchmark & Knowledge Datasets

This directory contains benchmark datasets and templates used for offline model evaluation, training, and testing within the AuraTrace platform.

---

## 1. RAG AI Doctor Knowledge Base Dataset
- **Database Seed Location**: [`database/02-seed.sql`](../../database/02-seed.sql)
- **Vector Model**: `BAAI/bge-small-en-v1.5` (384-dimensional dense embeddings)
- **Database**: Cloud PostgreSQL + `pgvector`
- **Contents**: Curated real-world failure patterns, root causes, stack traces, and verified code remediation patches.

---

## 2. LogHub HDFS_v1 Benchmark Dataset
- **Location**: `scripts/datasets/HDFS_v1/`
- **Evaluation Script**: [`backend/ml_anomaly_service/evaluate_hdfs.py`](../../backend/ml_anomaly_service/evaluate_hdfs.py)
- **Log Event Templates**: [`scripts/datasets/HDFS_v1/preprocessed/HDFS.log_templates.csv`](HDFS_v1/preprocessed/HDFS.log_templates.csv)

### Benchmark Execution:
```bash
python backend/ml_anomaly_service/evaluate_hdfs.py --sample-size 50000 --trees 100
```

### Dataset Citation:
- Wei Xu, Ling Huang, Armando Fox, David Patterson, Michael Jordan. *Detecting Large-Scale System Problems by Mining Console Logs*, SOSP 2009.
- Jieming Zhu, Shilin He, Pinjia He, Jinyang Liu, Michael R. Lyu. *Loghub: A Large Collection of System Log Datasets for AI-driven Log Analytics*, IEEE ISSRE 2023.
