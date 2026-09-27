import os
import sys
import subprocess
import shutil
import tempfile
from pathlib import Path

# Force utf-8 encoding on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

def find_browser():
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None

def main():
    browser = find_browser()
    if not browser:
        print("[ERROR] No browser found.")
        return

    out_dir = Path(__file__).resolve().parent.parent / "docs" / "screenshots"
    out_dir.mkdir(parents=True, exist_ok=True)
    temp_profile = Path(tempfile.gettempdir()) / "edge_headless_shot_profile"
    temp_profile.mkdir(parents=True, exist_ok=True)

    targets = [
        ("01-dashboard.png", "http://localhost:3000", 1440, 900),
        ("02-incident-diagnosis.png", "http://localhost:3000/incidents/b626c341-8601-47cd-acc7-b5d3ee629229", 1440, 1100),
        ("03-similar-incidents.png", "http://localhost:3000/incidents", 1440, 900),
        ("04-settings.png", "http://localhost:3000/projects/02069d82-c01e-433a-9882-031512cd45f9/settings", 1440, 900),
        ("05-api-docs.png", "http://localhost:8000/docs", 1440, 900),
    ]

    for name, url, w, h in targets:
        dest = out_dir / name
        print(f"[CAPTURE] {name} from {url}...", flush=True)
        cmd = [
            browser,
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            "--hide-scrollbars",
            "--virtual-time-budget=3000",
            f"--user-data-dir={str(temp_profile)}",
            f"--window-size={w},{h}",
            f"--screenshot={str(dest)}",
            url,
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, timeout=10)
            if dest.exists() and dest.stat().st_size > 0:
                kb = round(dest.stat().st_size / 1024, 1)
                print(f"   ✅ [SUCCESS] Saved: {dest.name} ({kb} KB)", flush=True)
            else:
                print(f"   ❌ [FAILED] to capture {name}", flush=True)
        except Exception as e:
            print(f"   ❌ [ERROR] {e}", flush=True)

    # Cleanup temp profile
    try:
        shutil.rmtree(temp_profile, ignore_errors=True)
    except Exception:
        pass

    print("\n[ALL DONE] Screenshots captured successfully!", flush=True)

if __name__ == "__main__":
    main()
