"""
AuraTrace — Reset demo data.
WARNING: Deletes ALL incidents, telemetry, and audit logs.
Preserves: projects (unless --drop-projects)

Usage:
    python scripts/reset_demo_db.py
    python scripts/reset_demo_db.py --drop-projects
"""
import argparse
import subprocess

PG = "docker exec trace-postgres psql -U postgres -d auratrace_db -c"


def run(sql: str):
    subprocess.run(f'{PG} "{sql}"', shell=True, check=False)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--drop-projects", action="store_true")
    args = parser.parse_args()

    print("🧹 Resetting demo data...")
    run("TRUNCATE incidents CASCADE;")
    print("  ✅ Truncated incidents")
    run("TRUNCATE telemetry_events CASCADE;")
    print("  ✅ Truncated telemetry_events")
    run("TRUNCATE historical_fixes CASCADE;")
    print("  ✅ Truncated historical_fixes")
    run("TRUNCATE repair_audit CASCADE;")
    print("  ✅ Truncated repair_audit")

    if args.drop_projects:
        run("TRUNCATE projects CASCADE;")
        print("  ✅ Truncated projects")

    # Clear Redis streams
    subprocess.run(
        "docker exec trace-redis redis-cli DEL telemetry_stream diagnose_stream repair_stream",
        shell=True,
    )
    print("  ✅ Cleared Redis streams")
    print("\n🎉 Done!")


if __name__ == "__main__":
    main()
