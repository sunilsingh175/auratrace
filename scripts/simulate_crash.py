import time
import requests

DATASET_PATH = "scripts/datasets/OpenStack/openstack_abnormal.log"
INGESTION_URL = "http://127.0.0.1:8000/api/v1/telemetry/logs"

def stream_logs():
    print(f"🚀 Streaming Dataset: {DATASET_PATH}")
    with open(DATASET_PATH, "r") as file:
        for idx, line in enumerate(file):
            if not line.strip():
                continue
            
            is_error = "ERROR" in line or "Traceback" in line
            payload = {
                "service_id": "nova-compute" if "nova-compute" in line else "nova-api",
                "log_message": line.strip(),
                "level": "ERROR" if is_error else "INFO",
                "timestamp": time.time()
            }

            try:
                requests.post(INGESTION_URL, json=payload)
                if is_error:
                    print(f"🔥 [CRASH SENT #{idx}] {line[:60]}...")
                elif idx % 40 == 0:
                    print(f"🟢 [NORMAL SENT #{idx}] {line[:60]}...")
            except requests.exceptions.ConnectionError:
                print("⚠️ Ingestion API offline. Retrying...")
                time.sleep(2)

if __name__ == "__main__":
    stream_logs()