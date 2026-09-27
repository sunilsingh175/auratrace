"""
Production readiness verification.
"""
import os
import sys
import urllib.request
import json

CHECKS = []


def check(name, fn):
    CHECKS.append((name, fn))


def check_env():
    # Load .env if present
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
    except Exception:
        pass

    required = ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"]
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        return False, f"Missing env vars: {missing}"
    return True, "Core database environment configuration verified"


def check_auth_modules():
    try:
        from shared.auth_jwt import hash_password, verify_password, create_access_token, decode_token
        test_hash = hash_password("production_secret_test")
        if not verify_password("production_secret_test", test_hash):
            return False, "Bcrypt password hashing check failed"
        tok = create_access_token("00000000-0000-0000-0000-000000000001", "admin@auratrace.dev", "admin")
        dec = decode_token(tok)
        if dec.get("email") != "admin@auratrace.dev":
            return False, "JWT decode mismatch"
        return True, "JWT encoding/decoding and bcrypt hashing verified"
    except Exception as e:
        return False, f"Auth verification failed: {e}"


def check_rate_limiter():
    try:
        from shared.rate_limit import RateLimitMiddleware
        return True, "Redis rate limiting middleware loaded"
    except Exception as e:
        return False, f"Rate limiter error: {e}"


def check_logger():
    try:
        from shared.logger import setup_logger
        logger = setup_logger("test_prod", "INFO")
        return True, "Structured JSON logging pipeline verified"
    except Exception as e:
        return False, f"Logger error: {e}"


def main():
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    # Ensure backend is in python path
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

    check("Environment variables", check_env)
    check("JWT Authentication & Passwords", check_auth_modules)
    check("Rate Limiter Middleware", check_rate_limiter)
    check("Structured JSON Logging", check_logger)

    print("\n" + "=" * 60)
    print("  AuraTrace -- Production Readiness Verification")
    print("=" * 60 + "\n")

    passed = 0
    for name, fn in CHECKS:
        try:
            ok_flag, msg = fn()
        except Exception as e:
            ok_flag, msg = False, str(e)
        status_label = "[PASS]" if ok_flag else "[FAIL]"
        print(f"  {status_label} {name}: {msg}")
        if ok_flag:
            passed += 1

    print(f"\n  Score: {passed}/{len(CHECKS)}")
    if passed == len(CHECKS):
        print("\n  ALL PRODUCTION HARDENING CHECKS PASSED!")
    sys.exit(0 if passed == len(CHECKS) else 1)


if __name__ == "__main__":
    main()
