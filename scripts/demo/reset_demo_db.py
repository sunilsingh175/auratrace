"""
AuraTrace - Demo Database Reset Utility
Safely clears active incidents and telemetry while preserving user accounts,
projects, and the pgvector historical fixes knowledge base for demo recordings.
Supports both direct Docker container execution and local asyncpg fallback.
"""

import asyncio
import os
import subprocess
import sys
from dotenv import load_dotenv

if sys.platform.startswith("win"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("POSTGRES_DB", "auratrace_db")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "postgres_password_123")

SQL_RESET_COMMANDS = """
TRUNCATE TABLE incidents CASCADE;
TRUNCATE TABLE telemetry_logs CASCADE;
DELETE FROM services WHERE name IN ('payment-gateway-node', 'order-fulfillment-python', 'demo-service');
"""

def reset_via_docker():
    """Attempt reset via docker exec into trace-postgres and trace-redis containers."""
    cmd = [
        "docker", "exec", "-i", "trace-postgres",
        "psql", "-U", DB_USER, "-d", DB_NAME, "-c",
        SQL_RESET_COMMANDS + "SELECT COUNT(*) FROM historical_fixes; SELECT COUNT(*) FROM projects; SELECT COUNT(*) FROM users;"
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        # Flush Redis telemetry stream
        subprocess.run(["docker", "exec", "trace-redis", "redis-cli", "DEL", "telemetry_stream"], capture_output=True, text=True)
        return True, res.stdout
    except Exception as e:
        return False, str(e)

async def reset_via_asyncpg():
    """Attempt reset via direct asyncpg connection."""
    import asyncpg
    conn = await asyncpg.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        timeout=5.0
    )
    await conn.execute("TRUNCATE TABLE incidents CASCADE;")
    await conn.execute("TRUNCATE TABLE telemetry_logs CASCADE;")
    await conn.execute(
        "DELETE FROM services WHERE name IN ('payment-gateway-node', 'order-fulfillment-python', 'demo-service');"
    )
    kb_count = await conn.fetchval("SELECT COUNT(*) FROM historical_fixes;")
    user_count = await conn.fetchval("SELECT COUNT(*) FROM users;")
    project_count = await conn.fetchval("SELECT COUNT(*) FROM projects;")
    await conn.close()
    return kb_count, user_count, project_count

def main():
    print("==================================================")
    print("🧹 AuraTrace Demo Database Reset Utility")
    print("==================================================")

    # 1. Try Docker exec first
    docker_success, docker_out = reset_via_docker()
    if docker_success:
        print("✅ Demo state successfully reset via Docker container (trace-postgres)!")
        print("   • Active Incidents: 0")
        print("   • Telemetry Logs: 0")
        print("   • Retained: User Accounts, Projects, and pgvector Historical Knowledge Base")
        print("\n✨ Ready for a clean demo recording!")
        return

    # 2. Fallback to asyncpg
    print("Docker exec skipped, attempting direct TCP connection...")
    try:
        kb_count, user_count, project_count = asyncio.run(reset_via_asyncpg())
        print("✅ Demo state reset complete via asyncpg!")
        print(f"   • Active Incidents: 0")
        print(f"   • Telemetry Logs: 0")
        print(f"   • pgvector Historical Knowledge Base: {kb_count} vectorized solutions retained")
        print(f"   • Registered Projects: {project_count} retained")
        print(f"   • Registered Users: {user_count} retained")
        print("\n✨ Ready for a clean demo recording!")
    except Exception as e:
        print(f"\n❌ Failed to reset database: {e}")
        print("Tip: Ensure Docker is running (`docker compose up -d postgres-db`).")
        sys.exit(1)

if __name__ == "__main__":
    main()
