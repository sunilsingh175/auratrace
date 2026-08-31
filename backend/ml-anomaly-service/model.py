import pickle
import os
import numpy as np
try:
    import joblib
except ImportError:
    joblib = None

class AnomalyDetector:
    def __init__(self):
        self.model_path_pkl = os.path.join(os.path.dirname(__file__), "isolation_forest.pkl")
        self.model_path_joblib = os.path.join(os.path.dirname(__file__), "isolation_forest.joblib")
        self.model = None
        self._load_model()

    def _load_model(self):
        if os.path.exists(self.model_path_pkl):
            with open(self.model_path_pkl, 'rb') as f:
                self.model = pickle.load(f)
        elif joblib and os.path.exists(self.model_path_joblib):
            try:
                self.model = joblib.load(self.model_path_joblib)
            except Exception:
                pass

    def predict(self, features: list) -> bool:
        if not self.model:
            return False # Failsafe if model isn't trained
        score = self.model.predict(np.array(features).reshape(1, -1))
        return score[0] == -1  # -1 indicates anomaly in Isolation Forest