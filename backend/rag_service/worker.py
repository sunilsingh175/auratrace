"""
AuraTrace RAG Diagnostic Worker.

Flow:
  1. Consume incident from diagnose_stream
  2. Generate 384-d embedding for the incident
  3. Find similar past incidents (pgvector)
  4. Find historical fixes that worked (pgvector)
  5. Call Gemini for root-cause diagnosis + code patch
  6. Save diagnosis and unified diff patch into incidents table (status='fix_ready')
  7. Push to repair_stream (for autonomous repair engine) and broadcast to WebSockets
"""
import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone

import redis.asyncio as aioredis

try:
    from backend.shared.config import get_settings
    from backend.shared.database import get_db_pool
    from backend.rag_service.embeddings import embed_text, build_incident_text, get_model
    from backend.rag_service.vector_store import find_similar_incidents, find_similar_fixes, vector_store
    from backend.rag_service.llm_pipeline import generate_diagnosis
except (ImportError, ModuleNotFoundError):
    from shared.config import get_settings
    from shared.database import get_db_pool
    from rag_service.embeddings import embed_text, build_incident_text, get_model
    from rag_service.vector_store import find_similar_incidents, find_similar_fixes, vector_store
    from rag_service.llm_pipeline import generate_diagnosis

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] rag-worker: %(message)s",
)
log = logging.getLogger("rag-worker")

settings = get_settings()


async def handle_incident(r: aioredis.Redis, data: dict):
    """Process one incident through the RAG pipeline."""
    incident_id = str(data.get("incident_id") or "")
    project_id = str(data.get("project_id") or "")

    if not incident_id:
        return

    pool = await get_db_pool()

    # ── 1. Load incident ─────────────────────────────────
    row = None
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM incidents WHERE id::text = $1",
            incident_id,
        )

    if not row:
        log.warning("Incident %s not found in database", incident_id)
        return

    incident = dict(row)
    error_type = incident.get("error_type") or data.get("error_type") or "Unknown"
    log.info("🔍 Diagnosing incident %s (%s)", incident_id[:8], error_type)

    # Skip if already diagnosed or resolved
    if str(incident.get("status", "")).lower() in ("fix_ready", "pr_created", "merged", "resolved"):
        log.info("⏭️ Incident %s already processed (status=%s)", incident_id[:8], incident.get("status"))
        return

    # ── 2. Generate Embedding ────────────────────────────
    text = build_incident_text(incident)
    embedding = embed_text(text)
    log.info("📊 Embedding generated (dim=%d)", len(embedding))

    # Store embedding in incidents table
    vec_literal = "[" + ",".join(f"{x:.6f}" for x in embedding) + "]"
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE incidents SET embedding = $1::vector WHERE id::text = $2",
                vec_literal,
                incident_id,
            )
    except Exception as e:
        log.warning("Incident embedding update note: %s", e)

    # ── 3. Find Similar Past Incidents ───────────────────
    similar_incidents = []
    try:
        similar_incidents = await find_similar_incidents(
            project_id=project_id,
            embedding=embedding,
            exclude_id=incident_id,
            limit=5,
        )
        log.info("🔎 Found %d similar incidents in vector memory", len(similar_incidents))
    except Exception as e:
        log.warning("Similarity search note: %s", e)

    # ── 4. Find Historical Fixes ─────────────────────────
    historical_fixes = []
    try:
        historical_fixes = await find_similar_fixes(
            project_id=project_id,
            embedding=embedding,
            limit=3,
        )
        log.info("📚 Found %d historical fixes in knowledge base", len(historical_fixes))
    except Exception as e:
        log.warning("Historical fixes search note: %s", e)

    # ── 5. Call Gemini AI Doctor ─────────────────────────
    try:
        diagnosis = await generate_diagnosis(
            incident=incident,
            similar_incidents=similar_incidents,
            historical_fixes=historical_fixes,
        )
    except Exception as e:
        log.exception("Gemini diagnosis failed: %s", e)
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE incidents SET status = 'diagnosis_failed' WHERE id::text = $1",
                incident_id,
            )
        return

    # ── 6. Save Diagnosis to Incidents Table ─────────────
    diagnosis_json = {
        "what_happened": diagnosis.get("what_happened", ""),
        "root_cause": diagnosis.get("root_cause", ""),
        "fix_explanation": diagnosis.get("fix_explanation", ""),
        "similar_incidents": [
            {
                "id": str(s.get("id")),
                "error_type": s.get("error_type"),
                "similarity": float(s.get("similarity") or 0.0),
            }
            for s in similar_incidents
        ],
        "historical_fixes_used": len(historical_fixes),
    }

    code_patch = diagnosis.get("code_patch", "")
    fix_explanation = diagnosis.get("fix_explanation", "")
    confidence = float(diagnosis.get("confidence") or 0.85)
    affected_files = diagnosis.get("affected_files") or []

    async with pool.acquire() as conn:
        try:
            await conn.execute(
                """
                UPDATE incidents
                SET diagnosis = $1::jsonb,
                    suggested_patch = $2,
                    suggested_fix = $2,
                    fix_explanation = $3,
                    root_cause = $4,
                    fix_confidence = $5,
                    is_diagnosed = TRUE,
                    status = 'fix_ready'
                WHERE id::text = $6
                """,
                json.dumps(diagnosis_json),
                code_patch,
                fix_explanation,
                diagnosis.get("root_cause", ""),
                confidence,
                incident_id,
            )
        except Exception as update_err:
            log.warning("Detailed update fallback: %s", update_err)
            await conn.execute(
                """
                UPDATE incidents
                SET diagnosis = $1::jsonb,
                    suggested_patch = $2,
                    fix_explanation = $3,
                    fix_confidence = $4,
                    status = 'fix_ready'
                WHERE id::text = $5
                """,
                json.dumps(diagnosis_json),
                code_patch,
                fix_explanation,
                confidence,
                incident_id,
            )

    log.info(
        "✅ Diagnosis saved for %s (confidence=%.2f, patch=%d bytes)",
        incident_id[:8], confidence, len(code_patch),
    )

    # ── 7. Broadcast Diagnosis to WebSockets ─────────────
    try:
        ws_event = {
            "type": "INCIDENT_DIAGNOSED",
            "incident_id": incident_id,
            "project_id": project_id,
            "error_type": error_type,
            "what_happened": diagnosis.get("what_happened"),
            "root_cause": diagnosis.get("root_cause"),
            "fix_explanation": fix_explanation,
            "code_patch": code_patch,
            "suggested_patch": code_patch,
            "confidence": confidence,
            "status": "fix_ready",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await r.publish(getattr(settings, "REDIS_ANOMALY_CHANNEL", "anomaly_events"), json.dumps(ws_event))
    except Exception as pub_err:
        log.warning("WebSocket pubsub broadcast warning: %s", pub_err)

    # ── 8. Push to Repair Stream ─────────────────────────
    repair_stream = getattr(settings, "REPAIR_STREAM", "repair_stream")
    if code_patch and confidence >= 0.5:
        await r.xadd(
            repair_stream,
            {
                "incident_id": str(incident_id),
                "project_id": str(project_id),
                "error_type": str(error_type),
                "code_patch": str(code_patch),
                "confidence": str(confidence),
            },
            maxlen=100_000,
            approximate=True,
        )
        log.info("🔧 Pushed incident %s to %s", incident_id[:8], repair_stream)
    else:
        log.info("⚠️ No patch or low confidence (%.2f) — skipping repair stream", confidence)


async def ensure_consumer_group(r: aioredis.Redis):
    diagnose_stream = getattr(settings, "DIAGNOSE_STREAM", "diagnose_stream")
    group_name = getattr(settings, "STREAM_GROUP_RAG", "rag-workers")
    try:
        await r.xgroup_create(
            diagnose_stream,
            group_name,
            id="0",
            mkstream=True,
        )
        log.info("✅ Created consumer group %s on %s", group_name, diagnose_stream)
    except Exception as e:
        if "BUSYGROUP" not in str(e):
            log.warning("Consumer group note: %s", e)


async def main():
    log.info("🎧 RAG Diagnostic Worker starting...")

    # Pre-load embedding model singleton
    try:
        get_model()
    except Exception as e:
        log.warning("Initial embedding model load note: %s", e)

    # Sync any un-embedded historical fixes in database
    try:
        await vector_store.sync_historical_embeddings()
    except Exception as e:
        log.warning("Initial vector sync note: %s", e)

    r = await aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_timeout=30,
        socket_connect_timeout=10,
        socket_keepalive=True,
        health_check_interval=15,
        retry_on_timeout=True,
    )
    await ensure_consumer_group(r)

    diagnose_stream = getattr(settings, "DIAGNOSE_STREAM", "diagnose_stream")
    group_name = getattr(settings, "STREAM_GROUP_RAG", "rag-workers")
    consumer_name = f"rag-{os.getpid()}"

    log.info(
        "Listening on stream=%s group=%s consumer=%s",
        diagnose_stream, group_name, consumer_name,
    )

    while True:
        try:
            msgs = await r.xreadgroup(
                group_name,
                consumer_name,
                {diagnose_stream: ">"},
                count=5,
                block=2000,
            )

            if not msgs:
                continue

            for _, entries in msgs:
                for msg_id, data in entries:
                    try:
                        await handle_incident(r, data)
                        await r.xack(
                            diagnose_stream,
                            group_name,
                            msg_id,
                        )
                    except Exception as e:
                        log.exception("Incident handling failed for %s: %s", msg_id, e)

        except aioredis.ConnectionError as e:
            log.error("Redis connection lost: %s — retrying in 5s", e)
            await asyncio.sleep(5)
        except (aioredis.TimeoutError, asyncio.TimeoutError):
            await asyncio.sleep(0.1)
        except Exception as e:
            if "timeout" in str(e).lower():
                await asyncio.sleep(0.1)
            else:
                log.exception("Consumer loop error: %s", e)
                await asyncio.sleep(3)


if __name__ == "__main__":
    asyncio.run(main())