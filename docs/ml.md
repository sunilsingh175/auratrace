# AuraTrace Machine Learning Anomaly Detection

AuraTrace uses unsupervised tree-based anomaly detection (Isolation Forest) to continuously score service telemetry streams and detect failures before cascading outages occur.

---

## 1. Feature Engineering (8 Real-Time Features)

Every 5-minute rolling window per service buffer computes eight operational features:

| Feature | Type | Description |
| :--- | :--- | :--- |
| `error_count` | `float` | Total count of errors and HTTP 5xx events in window |
| `request_count` | `float` | Total count of requests logged in window |
| `error_rate` | `float` | Ratio of errors to total requests (`error_count / request_count`) |
| `avg_latency_ms` | `float` | Mean response time in milliseconds |
| `max_latency_ms` | `float` | Maximum single-request latency recorded in window |
| `p95_latency_ms` | `float` | 95th percentile response time |
| `status_5xx_rate` | `float` | Ratio of HTTP status $\ge 500$ responses |
| `unique_error_types` | `float` | Count of distinct error class names / exceptions |

---

## 2. Production Model vs. Offline Benchmark

AuraTrace maintains a strict separation between the **live production telemetry detector** and the **HDFS offline research benchmark**.

### 2.1 Production Model (`models/production/isolation_forest.joblib`)
- **Dataset:** 12,000 synthetic rolling window telemetry samples reflecting healthy baseline traffic + 6 realistic operational fault scenarios (database pool exhaustion, memory leaks, exception storms, downstream cascade timeouts, disk saturation, thread deadlocks).
- **Evaluation:** Strict 80/20 train/test split with **zero data leakage**.

```text
======================================================================
PRODUCTION MODEL EVALUATION METRICS SUMMARY (Unseen Test Set):
======================================================================
  • Test Sample Size:    2,400 (80/20 Split)
  • Accuracy:            99.96%
  • Precision:           100.00%
  • Recall:              99.72%
  • F1-Score:            99.86%
  • ROC-AUC:             100.00%
  • PR-AUC:              100.00%
  • Confusion Matrix:
      TN=2040   FP=0     
      FN=1      TP=359   
  • Inference Duration:  26.02ms
======================================================================
```

### 2.2 HDFS Offline Benchmark (`models/benchmarks/hdfs_isolation_forest.joblib`)
- **Dataset:** Standardized LogHub HDFS_v1 dataset (575,061 log block sequences).
- **Features:** 29-dimensional count matrix of structured log template events.
- **Evaluation:** 80/20 split evaluated on 1,000 unseen test samples.
  - **Accuracy:** `98.40%`
  - **ROC-AUC:** `97.69%`
  - **PR-AUC:** `79.21%`

---

## 3. Training & Evaluation Scripts

```bash
# Generate production 8-feature dataset
python scripts/train/generate_production_dataset.py

# Train production model and save to models/production/
python scripts/train/train_production.py

# Evaluate production model on unseen test split
python scripts/train/evaluate_production.py

# Train & evaluate HDFS benchmark
python scripts/train/train_hdfs.py
python scripts/train/evaluate_hdfs.py --sample-size 5000
```
