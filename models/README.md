# Trained Machine Learning Artifacts

This directory stores serialized models and preprocessors used by the `ml_anomaly_service`:

- `isolation_forest.pkl` — Scikit-Learn Isolation Forest model for unsupervised anomaly scoring
- `scaler.pkl` — StandardScaler for normalizing 10-dimensional rolling window metrics
- `feature_names.pkl` — Feature column index and ordering metadata

## Note on Git Tracking
Serialized `.pkl` binaries are excluded from version control via `.gitignore`. 

To generate or retrain the baseline model:
```bash
python -m backend.ml_anomaly_service.train_model
```
