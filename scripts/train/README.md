# AuraTrace Offline Model Training & Benchmark Scripts

This directory contains standalone scripts for training and evaluating machine learning anomaly detection models used in AuraTrace.

---

## 1. HDFS Isolation Forest Benchmark & Training

### Evaluate Model on HDFS_v1 Benchmark Dataset:
```bash
python scripts/train/evaluate_hdfs.py --sample-size 50000 --trees 100
```

### Train and Export Production Model Weights:
```bash
python scripts/train/train_hdfs.py --sample-size 50000 --trees 100
```

---

## 2. Separation of Concerns
- **SDKs (`sdk/python/`, `sdk/nodejs/`)**: Purely lightweight, zero-boilerplate telemetry & crash-capture agents. No ML, RAG, or heavy dependencies.
- **Training (`scripts/train/`)**: Offline evaluation and model training against LogHub datasets.
- **Backend (`backend/ml_anomaly_service/`)**: Production inference runtime, sliding window aggregation, and real-time Isolation Forest worker.
