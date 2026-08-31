import collections

class LogBuffer:
    def __init__(self, maxlen: int = 100):
        self.logs = collections.deque(maxlen=maxlen)

    def add_log(self, log_entry: dict):
        self.logs.append(log_entry)

    def extract_features(self) -> list:
        if not self.logs:
            return [0.0, 0.0]
        recent = list(self.logs)
        avg_len = sum(len(str(l.get("log_message", ""))) for l in recent) / len(recent)
        err_ratio = sum(1 for l in recent if str(l.get("level", "")).upper() in ("ERROR", "CRITICAL")) / len(recent)
        return [float(avg_len), float(err_ratio)]