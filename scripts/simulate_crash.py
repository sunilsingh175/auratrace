import os
import sys
import time
import random
import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "datasets", "HDFS_v1", "HDFS.log")
INGESTION_URL = "http://127.0.0.1:8000/api/v1/telemetry"
API_KEY = os.getenv("AURA_MASTER_API_KEY", "aura_secret_key_123")


def stream_logs(max_lines=500):
    print(f"Streaming Dataset: {DATASET_PATH}")

    if not os.path.exists(DATASET_PATH):
        print(f"Dataset file not found: {DATASET_PATH}")
        return

    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
    }

    with open(DATASET_PATH, "r", encoding="utf-8", errors="ignore") as file:
        for idx, line in enumerate(file):
            if max_lines and idx >= max_lines:
                print(f"Finished streaming {max_lines} telemetry events.")
                break

            if not line.strip():
                continue

            # Normal traffic vs crash spike
            is_error = any(
                term in line.lower()
                for term in [
                    "error",
                    "exception",
                    "fail",
                    "warn",
                    "timed out",
                ]
            ) or (50 <= idx <= 75) or (180 <= idx <= 205)

            # Simulate realistic latency.
            if is_error:
                latency_ms = random.uniform(1200, 5000)
                status_code = random.choice([500, 502, 503, 504])
                level = "ERROR"
                error_type = "DataNodeException"
            else:
                latency_ms = random.uniform(80, 220)
                status_code = 200
                level = "INFO"
                error_type = None

            payload = {
                "service_id": (
                    "hdfs-datanode"
                    if "DataNode" in line
                    else "hdfs-namenode"
                ),
                "message": line.strip(),
                "error_type": error_type,
                "raw_stack_trace": line.strip() if is_error else None,
                "latency_ms": round(latency_ms, 2),
                "status_code": status_code,
                "level": level,
                "metadata": {
                    "line_idx": idx,
                    "simulation": True,
                },
            }

            try:
                res = requests.post(
                    INGESTION_URL,
                    json=payload,
                    headers=headers,
                    timeout=5,
                )

                if res.status_code != 202:
                    print(
                        f"API returned {res.status_code}: "
                        f"{res.text[:120]}"
                    )
                    continue

                if is_error:
                    print(
                        f"[ERROR #{idx}] "
                        f"{status_code} | "
                        f"{latency_ms:.0f}ms | "
                        f"{line.strip()[:60]}..."
                    )
                elif idx % 20 == 0:
                    print(
                        f"[NORMAL #{idx}] "
                        f"{status_code} | "
                        f"{latency_ms:.0f}ms"
                    )

                time.sleep(0.05)

            except requests.exceptions.ConnectionError:
                print("Ingestion API offline. Retrying in 2s...")
                time.sleep(2)

            except requests.exceptions.RequestException as exc:
                print(f"Request failed: {exc}")


if __name__ == "__main__":
    stream_logs()