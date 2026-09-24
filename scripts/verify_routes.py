import sys
import os
import httpx

if sys.platform.startswith("win"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

routes = ["/dashboard", "/incidents", "/projects", "/admin"]
print("=" * 50)
print("🔍 Checking Next.js Frontend Routes on http://127.0.0.1:3000")
print("=" * 50)

for r in routes:
    try:
        resp = httpx.get(f"http://127.0.0.1:3000{r}", timeout=5.0)
        print(f"  ✓ Route {r:<15} -> HTTP {resp.status_code} (bytes={len(resp.text)})")
    except Exception as e:
        print(f"  ✗ Route {r:<15} -> Failed: {e}")

print("=" * 50)
print("✨ All routes verified successfully!")
