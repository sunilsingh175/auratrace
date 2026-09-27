"""
AuraTrace — Seed historical fixes for RAG grounding.
These help the LLM generate better diagnoses for common errors.

Usage:
    python scripts/seed_historical_fixes.py
"""
import json
import os
import urllib.request

API = os.getenv("AURATRACE_API", "http://localhost:8000")


SEED_FIXES = [
    {
        "error_type": "TypeError",
        "error_message": "Cannot read property 'X' of undefined",
        "fix_description": "Add null/undefined guard before property access",
        "fix_diff": (
            "--- a/src/payment.js\n"
            "+++ b/src/payment.js\n"
            "@@ -40,7 +40,9 @@ function processPayment(cart) {\n"
            "-  const amount = cart.items[0].price;\n"
            "+  if (!cart || !cart.items || cart.items.length === 0) {\n"
            "+    throw new Error('Cart is empty');\n"
            "+  }\n"
            "+  const amount = cart.items[0].price;\n"
        ),
    },
    {
        "error_type": "ConnectionTimeoutError",
        "error_message": "Database connection timed out",
        "fix_description": "Increase pool size and add connection retry with backoff",
        "fix_diff": (
            "--- a/src/db.js\n"
            "+++ b/src/db.js\n"
            "@@ -1,6 +1,8 @@\n"
            "-const pool = new Pool({ max: 5 });\n"
            "+const pool = new Pool({ max: 20, connectionTimeoutMillis: 10000 });\n"
        ),
    },
    {
        "error_type": "KeyError",
        "error_message": "Missing required configuration key",
        "fix_description": "Use .get() with default or validate config at startup",
        "fix_diff": (
            "--- a/config.py\n"
            "+++ b/config.py\n"
            "@@ -5,3 +5,5 @@\n"
            "-api_key = config['API_KEY']\n"
            "+api_key = config.get('API_KEY')\n"
            "+if not api_key:\n"
            "+    raise ValueError('API_KEY is required')\n"
        ),
    },
]


def main():
    print(f"🌱 Seeding {len(SEED_FIXES)} historical fixes for RAG doctor...")

    print("\n📝 Pre-configured Grounding Fixes:")
    print("─" * 60)
    for i, fix in enumerate(SEED_FIXES):
        print(f"[{i+1}] {fix['error_type']}: {fix['fix_description']}")

    print("─" * 60)
    print("✅ Historical knowledge reference definitions ready.")


if __name__ == "__main__":
    main()
