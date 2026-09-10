import re
import numpy as np

# Signature keywords for HDFS event templates E1 through E29
TEMPLATE_SIGNATURES = [
    "adding an already existing block",      # E1
    "verification succeeded",                # E2
    "served block",                          # E3
    "got exception while serving",           # E4 (Exception)
    "receiving block",                       # E5
    "received block",                        # E6
    "writeblock received exception",         # E7 (Exception)
    "interrupted",                           # E8 (Exception)
    "of size",                               # E9
    "packetresponder.*exception",            # E10 (Exception)
    "terminating",                           # E11
    "exception writing block to mirror",     # E12 (Exception)
    "receiving empty packet",                # E13
    "exception in receiveblock",             # E14 (Exception)
    "changing block file offset",            # E15
    "transmitted block",                     # E16
    "failed to transfer",                    # E17 (Exception)
    "starting thread to transfer",           # E18
    "reopen block",                          # E19
    "blockinfo not found in volumemap",      # E20 (Anomaly)
    "deleting block",                        # E21
    "allocateblock",                         # E22
    "is added to invalidset",                # E23
    "removing block from neededreplications",# E24
    "ask.*to replicate",                     # E25
    "addstoredblock: blockmap updated",      # E26
    "redundant addstoredblock",              # E27
    "does not belong to any file",           # E28 (Anomaly)
    "timed out block",                       # E29 (Anomaly)
]

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
        Extracts a 29-dimensional feature vector (E1 to E29) from the log buffer
        to match the trained HDFS IsolationForest model.
        """
        counts = [0.0] * 29
        
        # Count occurrences of each event template across the buffer
        for log in self.logs:
            msg = str(log.get("log_message", "") or log.get("message", "")).lower()
            for idx, pattern in enumerate(TEMPLATE_SIGNATURES):
                if re.search(pattern, msg):
                    counts[idx] += 1.0
                    break
        
        # If no template matched (e.g. synthetic or generic error stream), 
        # project error metrics into the anomalous template slots
        total_matched = sum(counts)
        if total_matched == 0 and self.logs:
            error_count = sum(1 for log in self.logs if log.get("level") == "ERROR")
            counts[3] = float(error_count)  # E4: Got exception
            counts[19] = 1.0 if error_count > 0 else 0.0  # E20: BlockInfo not found
            counts[21] = float(len(self.logs))  # E22: Log volume baseline
            
        return np.array([counts[:29]], dtype=np.float32)