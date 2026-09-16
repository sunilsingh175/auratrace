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

                logger.info(f"Computing embeddings for {len(unembedded_fixes)} historical fixes...")
                for fix in unembedded_fixes:
                    text_content = f"{fix.error_type or ''} {fix.stack_trace or ''} {fix.root_cause or ''}".strip()
                    if text_content:
                        vector = embedder.get_embedding(text_content)
                        fix.embedding = vector
                        updated_count += 1

                await session.commit()
                logger.info(f"Successfully generated and saved embeddings for {updated_count} historical fixes.")
        except Exception as exc:
            logger.warning(f"Historical embedding synchronization encountered an issue: {exc}")

        return updated_count

    async def search_similar_fixes(
        self,
        stack_trace: str,
        error_type: str = "",
        top_k: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Perform pgvector HNSW cosine similarity search against HistoricalFix table.
        """
        try:
            search_query = f"{error_type} {stack_trace}".strip()
            if not search_query:
                return []

            query_embedding = embedder.get_embedding(search_query)

            async with AsyncSessionLocal() as session:
                # 1. Cosine similarity query on HistoricalFix
                stmt = (
                    select(HistoricalFix)
                    .where(HistoricalFix.embedding.isnot(None))
                    .order_by(HistoricalFix.embedding.cosine_distance(query_embedding))
                    .limit(top_k)
                )

                result = await session.execute(stmt)
                fixes = result.scalars().all()

                # 2. Fallback if no embeddings are populated
                if not fixes:
                    fallback_stmt = (
                        select(HistoricalFix)
                        .order_by(HistoricalFix.created_at.desc())
                        .limit(top_k)
                    )
                    fallback_res = await session.execute(fallback_stmt)
                    fixes = fallback_res.scalars().all()

                return [
                    {
                        "error_type": fix.error_type or "UnknownError",
                        "stack_trace": fix.stack_trace or "",
                        "root_cause": fix.root_cause or "",
                        "fix_description": fix.fix_description or "",
                        "code_patch": fix.code_patch or "",
                    }
                    for fix in fixes
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