"""
pgvector similarity search against past incidents and historical fixes.
"""
import logging
from typing import List, Dict, Any, Optional
from shared.database import get_db_pool

log = logging.getLogger("rag.vector_store")


async def find_similar_incidents(
    project_id: str,
    embedding: List[float],
    exclude_id: str,
    limit: int = 5,
    min_similarity: float = 0.6,
) -> List[Dict[str, Any]]:
    """
    Find past incidents similar to the current one.
    Uses cosine similarity (pgvector `<=>` distance operator).
    """
    if not embedding or all(v == 0.0 for v in embedding):
        return []

    pool = await get_db_pool()
    vec_literal = "[" + ",".join(f"{x:.6f}" for x in embedding) + "]"

    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    id,
                    error_type,
                    COALESCE(error_message, root_cause) AS error_message,
                    COALESCE(suggested_patch, suggested_fix) AS suggested_fix,
                    fix_explanation,
                    1 - (embedding <=> $1::vector) AS similarity
                FROM incidents
                WHERE (project_id::text = $2 OR $2 IS NULL)
                  AND id::text != $3
                  AND embedding IS NOT NULL
                  AND (1 - (embedding <=> $1::vector)) > $4
                ORDER BY embedding <=> $1::vector ASC
                LIMIT $5
                """,
                vec_literal,
                str(project_id) if project_id else None,
                str(exclude_id),
                float(min_similarity),
                int(limit),
            )
            return [dict(r) for r in rows]
    except Exception as exc:
        log.warning("find_similar_incidents query warning: %s", exc)
        return []


async def find_similar_fixes(
    project_id: str,
    embedding: List[float],
    limit: int = 3,
    min_similarity: float = 0.65,
) -> List[Dict[str, Any]]:
    """
    Find historical fixes that worked for similar errors.
    These ground the LLM's diagnosis in known verified solutions.
    """
    if not embedding or all(v == 0.0 for v in embedding):
        return []

    pool = await get_db_pool()
    vec_literal = "[" + ",".join(f"{x:.6f}" for x in embedding) + "]"

    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    id,
                    error_type,
                    COALESCE(fix_diff, code_patch) AS fix_diff,
                    COALESCE(fix_description, root_cause) AS fix_description,
                    COALESCE(did_fix_work, TRUE) AS did_fix_work,
                    1 - (embedding <=> $1::vector) AS similarity
                FROM historical_fixes
                WHERE embedding IS NOT NULL
                  AND (1 - (embedding <=> $1::vector)) > $2
                ORDER BY embedding <=> $1::vector ASC
                LIMIT $3
                """,
                vec_literal,
                float(min_similarity),
                int(limit),
            )
            return [dict(r) for r in rows]
    except Exception as exc:
        log.warning("find_similar_fixes query warning: %s", exc)
        return []


class VectorStore:
    """Class wrapper for similarity search and knowledge base sync."""

    async def search_similar_fixes(self, embedding: List[float], top_k: int = 3) -> List[Dict[str, Any]]:
        return await find_similar_fixes("", embedding, limit=top_k, min_similarity=0.5)

    async def sync_historical_embeddings(self) -> int:
        from rag_service.embeddings import embed_text
        pool = await get_db_pool()
        updated = 0
        try:
            async with pool.acquire() as conn:
                fixes = await conn.fetch(
                    "SELECT id, error_type, stack_trace, root_cause FROM historical_fixes WHERE embedding IS NULL"
                )
                for f in fixes:
                    content = f"{f.get('error_type') or ''} {f.get('stack_trace') or ''} {f.get('root_cause') or ''}"
                    emb = embed_text(content)
                    vec_literal = "[" + ",".join(f"{x:.6f}" for x in emb) + "]"
                    await conn.execute(
                        "UPDATE historical_fixes SET embedding = $1::vector WHERE id = $2",
                        vec_literal,
                        f["id"],
                    )
                    updated += 1
            if updated > 0:
                log.info("Synced embeddings for %d historical fixes.", updated)
        except Exception as e:
            log.warning("sync_historical_embeddings warning: %s", e)
        return updated


vector_store = VectorStore()
