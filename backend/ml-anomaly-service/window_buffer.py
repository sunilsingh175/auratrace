import numpy as np

class LogBuffer:
    def __init__(self, max_size=100):
        self.logs = []
        self.max_size = max_size

    def add_log(self, log_payload: dict):
        self.logs.append(log_payload)
        if len(self.logs) > self.max_size:
            self.logs.pop(0)

    def extract_features(self):
        """
        Extracts numerical features from the log buffer and ensures 
        it always returns a fixed length of 6 features to match the 
        IsolationForest model expectation.
        """
        # Calculate dynamic attributes based on current buffer contents
        error_count = sum(1 for log in self.logs if log.get("level") == "ERROR")
        total_logs = len(self.logs) if len(self.logs) > 0 else 1
        error_ratio = error_count / total_logs
        
        latest_message = self.logs[-1].get("log_message", "") if self.logs else ""
        msg_length = len(latest_message)
        
        # Base raw features extracted from the window
        raw_features = [
            float(total_logs),
            float(error_count),
            float(error_ratio),
            float(msg_length),
            float(hash(latest_message) % 1000) / 1000.0, # pseudo-categorical hash scalar
            1.0 if error_count > 0 else 0.0             # binary error flag state
        ]

        # Safety padding fallback to strictly satisfy the 6-feature requirement
        while len(raw_features) < 6:
            raw_features.append(0.0)

        # Truncate or return exactly 6 features formatted as a 2D array for scikit-learn
        return np.array([raw_features[:6]])