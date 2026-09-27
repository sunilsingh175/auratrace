"""
AuraTrace — Ingestion throughput benchmark.

Usage:
    python scripts/stress_test.py --count 1000 --concurrency 20
"""
import argparse
import json
import os
import sys
import threading
import time
import urllib.request

API = os.getenv("AURATRACE_API", "http://localhost:8000")
API_KEY = os.getenv("AURATRACE_API_KEY", "aura_live_master_auratrace_2026")

counter_lock = threading.Lock()
counters = {"ok": 0, "err": 0, "bytes": 0}


def send_one(i: int):
    payload = {
        "event_type": "crash",
        "service_name": f"stress-{i % 10}",
        "error_type": "StressTestError",
        "error_message": f"Synthetic event {i}",
        "stack_trace": f"at test (stress.py:{i})",
        "runtime": {"language": "python", "version": "3.11"},
    }
    body = json.dumps(payload).encode()
    req = urllib.request.Request(f"{API}/v1/ingest", data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("X-API-Key", API_KEY)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            r.read()
        with counter_lock:
            counters["ok"] += 1
            counters["bytes"] += len(body)
    except Exception:
        with counter_lock:
            counters["err"] += 1


def worker(start: int, end: int):
    for i in range(start, end):
        send_one(i)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=500)
    parser.add_argument("--concurrency", type=int, default=10)
    args = parser.parse_args()

    if not API_KEY:
        print("⚠️  Set AURATRACE_API_KEY env var")
        sys.exit(1)

    print(f"🔥 Stress test: {args.count} events, {args.concurrency} threads")
    print("─" * 60)

    per_thread = max(args.count // args.concurrency, 1)
    threads = []
    start = time.time()

    for t in range(args.concurrency):
        s = t * per_thread
        e = min(s + per_thread, args.count)
        thread = threading.Thread(target=worker, args=(s, e))
        thread.start()
        threads.append(thread)

    # Progress
    while any(t.is_alive() for t in threads):
        time.sleep(1)
        with counter_lock:
            ok = counters["ok"]
        elapsed = time.time() - start
        rate = ok / elapsed if elapsed > 0 else 0
        print(f"  [{int(elapsed):3d}s] sent={ok} rate={rate:.0f}/s")

    for t in threads:
        t.join()

    total = max(time.time() - start, 0.001)
    with counter_lock:
        ok = counters["ok"]
        err = counters["err"]
        bytes_sent = counters["bytes"]

    print("─" * 60)
    print(f"✅ Sent:       {ok}")
    print(f"❌ Failed:     {err}")
    print(f"⏱️  Duration:   {total:.1f}s")
    print(f"⚡ Throughput: {ok / total:.0f} events/sec")
    print(f"📦 Bytes sent: {bytes_sent / 1024:.1f} KB")


if __name__ == "__main__":
    main()
