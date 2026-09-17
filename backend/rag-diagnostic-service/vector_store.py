import os
import sys
from typing import Any, List, Dict, Optional

from sqlalchemy import select, update


# ---------------------------------------------------------
# Path setup
# ---------------------------------------------------------

CURRENT_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

WORKSPACE_DIR = os.path.abspath(
    os.path.join(
        CURRENT_DIR,
        "..",
        ".."
    )
)

sys.path.insert(
    0,
    WORKSPACE_DIR
)

sys.path.insert(
    0,
    CURRENT_DIR
)


# ---------------------------------------------------------
# Imports
# ---------------------------------------------------------

try:
    from backend.shared.logger import get_logger
except ImportError:
    try:
        from shared.logger import get_logger
    except ImportError:
        import logging
        get_logger = lambda name: logging.getLogger(name)

logger = get_logger("vector-store")

try:
    from .embeddings import embedder
except (ImportError, ValueError):
    from embeddings import embedder


try:
    from backend.shared.database import (
        AsyncSessionLocal,
        HistoricalFix,
        Incident,
    )
except ImportError:
    from shared.database import (
        AsyncSessionLocal,
        HistoricalFix,
        Incident,
    )


# ---------------------------------------------------------
# Vector Store
# ---------------------------------------------------------

class VectorStore:

    async def sync_historical_embeddings(self) -> int:
        """
        Populate vector embeddings for any seeded or newly inserted
        HistoricalFix records that do not yet have an embedding.
        """
        updated_count = 0
        try:
            async with AsyncSessionLocal() as session:
                stmt = select(HistoricalFix).where(HistoricalFix.embedding.is_(None))
                result = await session.execute(stmt)
                unembedded_fixes = result.scalars().all()

                if not unembedded_fixes:
                    logger.info("All historical fixes already have embeddings.")
                    return 0

                logger.info(
                    "Computing embeddings for %d historical fixes...",
                    len(unembedded_fixes),
                )
                for fix in unembedded_fixes:
                    text_content = (
                        f"{fix.error_type or ''} "
                        f"{fix.stack_trace or ''} "
                        f"{fix.root_cause or ''}"
                    ).strip()
                    if text_content:
                        vector = embedder.get_embedding(text_content)
                        fix.embedding = vector
                        updated_count += 1

                await session.commit()
                logger.info(
                    "Successfully generated and saved embeddings for %d historical fixes.",
                    updated_count,
                )
        except Exception as exc:
            logger.warning(
                "Historical embedding synchronization encountered an issue: %s",
                exc,
            )

        return updated_count

    async def search_similar_fixes(
        self,
        stack_trace: str,
        error_type: str = "",
        top_k: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Perform pgvector HNSW cosine similarity search against HistoricalFix.

        The knowledge base is backfilled before searching so seeded records
        cannot silently disappear from the vector-search candidate set.
        If the vector query still returns fewer than top_k records, the
        remaining slots are filled from the newest HistoricalFix records.
        """
        try:
            search_query = f"{error_type} {stack_trace}".strip()
            if not search_query:
                return []

            # Ensure all seeded/new historical fixes have vectors before
            # executing the similarity query. This also repairs databases
            # where the worker started before seed embeddings were generated.
            await self.sync_historical_embeddings()

            query_embedding = embedder.get_embedding(search_query)

            async with AsyncSessionLocal() as session:
                stmt = (
                    select(HistoricalFix)
                    .where(HistoricalFix.embedding.isnot(None))
                    .order_by(HistoricalFix.embedding.cosine_distance(query_embedding))
                    .limit(top_k)
                )

                result = await session.execute(stmt)
                fixes = list(result.scalars().all())

                # Defensive fallback: if an embedding could not be generated
                # for one or more records, still return exactly top_k historical
                # fixes whenever the knowledge base contains enough records.
                if len(fixes) < top_k:
                    existing_ids = {fix.id for fix in fixes}
                    fallback_stmt = (
                        select(HistoricalFix)
                        .order_by(HistoricalFix.created_at.desc())
                        .limit(top_k)
                    )
                    fallback_res = await session.execute(fallback_stmt)
                    fallback_fixes = fallback_res.scalars().all()

                    for fix in fallback_fixes:
                        if fix.id not in existing_ids:
                            fixes.append(fix)
                            existing_ids.add(fix.id)
                        if len(fixes) >= top_k:
                            break

                logger.info(
                    "Returning %d/%d historical fixes for similarity search.",
                    len(fixes),
                    top_k,
                )

                return [
                    {
                        "error_type": fix.error_type or "UnknownError",
                        "stack_trace": fix.stack_trace or "",
                        "root_cause": fix.root_cause or "",
                        "fix_description": fix.fix_description or "",
                        "code_patch": fix.code_patch or "",
                    }
                    for fix in fixes[:top_k]
                ]

        except Exception as exc:
            logger.error(f"Vector search failed: {exc}", exc_info=True)
            return []

    async def search_similar_incidents(
        self,
        stack_trace: str,
        error_type: str,
        top_k: int = 3,
    ) -> List[Dict[str, Any]]:
        """Compatibility wrapper calling search_similar_fixes."""
        return await self.search_similar_fixes(
            stack_trace=stack_trace,
            error_type=error_type,
            top_k=top_k,
        )

    async def search_similar(
        self,
        query: str,
        limit: int = 3,
    ) -> List[Dict[str, Any]]:
        return await self.search_similar_fixes(
            stack_trace=query,
            error_type="",
            top_k=limit,
        )

    async def similar_incidents(
        self,
        query: str,
        limit: int = 3,
    ) -> List[Dict[str, Any]]:
        return await self.search_similar_fixes(
            stack_trace=query,
            error_type="",
            top_k=limit,
        )


vector_store = VectorStore()
