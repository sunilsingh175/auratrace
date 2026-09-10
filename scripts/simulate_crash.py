import os
import sys
import time
import requests

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "datasets", "HDFS_v1", "HDFS.log")
INGESTION_URL = "http://127.0.0.1:8000/api/v1/telemetry"
API_KEY = "aura_secret_key_123"

def stream_logs(max_lines=500):
    print(f"🚀 Streaming Dataset: {DATASET_PATH}")
    if not os.path.exists(DATASET_PATH):
        print(f"❌ Dataset file not found at: {DATASET_PATH}")
        return

    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY
    }

    with open(DATASET_PATH, "r", encoding="utf-8", errors="ignore") as file:
        for idx, line in enumerate(file):
            if max_lines and idx >= max_lines:
                print(f"✅ Finished streaming {max_lines} telemetry events.")
                break

            if not line.strip():
                continue
            
            is_error = any(term in line.lower() for term in ["error", "exception", "fail", "warn", "timed out"])
            payload = {
                "service_id": "hdfs-datanode" if "DataNode" in line else "hdfs-namenode",
                "message": line.strip(),
                "error_type": "DataNodeException" if is_error else None,
                "raw_stack_trace": line.strip() if is_error else None,
                "metadata": {"line_idx": idx}
            }

            try:
                res = requests.post(INGESTION_URL, json=payload, headers=headers)
                if is_error:
                    print(f"🔥 [CRASH SENT #{idx}] {line.strip()[:70]}...")
                elif idx % 20 == 0:
                    print(f"🟢 [NORMAL SENT #{idx}] {line.strip()[:70]}...")
                time.sleep(0.05)
            except requests.exceptions.ConnectionError:
                print("⚠️ Ingestion API offline. Retrying in 2s...")
                time.sleep(2)

if __name__ == "__main__":
    stream_logs()