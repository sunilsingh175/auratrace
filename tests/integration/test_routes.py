import sys
import os
import httpx

def check_frontend_routes():
    routes = ["/dashboard", "/incidents", "/projects", "/admin"]
    print("=" * 50)
    print("🔍 Checking Next.js Frontend Routes on http://127.0.0.1:3000")
    print("=" * 50)

    for r in routes:
        try:
            resp = httpx.get(f"http://127.0.0.1:3000{r}", timeout=5.0)
            print(f"  ✓ Route {r:<15} -> HTTP {resp.status_code} (bytes={len(resp.text)})")
        except Exception as e:
            print(f"  ✗ Route {r:<15} -> Skipped/Failed: {e}")

    print("=" * 50)
    print("✨ Frontend route check finished")

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    check_frontend_routes()
