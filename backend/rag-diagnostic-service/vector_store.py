import os
import sys
from typing import Any, List, Dict, Optional

from sqlalchemy import select


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
    from .embeddings import embedder
except (ImportError, ValueError):

    from embeddings import embedder


try:
    from backend.shared.database import (
        AsyncSessionLocal,
        IncidentReport,
    )
except ImportError:

    from shared.database import (
        AsyncSessionLocal,
        IncidentReport,
    )


# ---------------------------------------------------------
# Vector Store
# ---------------------------------------------------------

class VectorStore:

    async def search_similar_incidents(
        self,
        stack_trace: str,
        error_type: str,
        top_k: int = 3,
    ) -> List[Dict[str, Any]]:

        try:

            search_query = (
                f"{error_type} {stack_trace}"
            ).strip()

            if not search_query:
                return []

            # Generate query embedding.
            query_embedding = (
                embedder.get_embedding(
                    search_query
                )
            )

            async with AsyncSessionLocal() as session:

                embedding_col: Any = (
                    IncidentReport.embedding
                )

                # -------------------------------------------------
                # pgvector cosine similarity search
                # -------------------------------------------------

                stmt = (
                    select(
                        IncidentReport
                    )
                    .where(
                        embedding_col.isnot(None)
                    )
                    .order_by(
                        embedding_col.cosine_distance(
                            query_embedding
                        )
                    )
                    .limit(
                        top_k
                    )
                )

                result = await session.execute(
                    stmt
                )

                incidents = (
                    result.scalars().all()
                )

                # -------------------------------------------------
                # Fallback when no embeddings exist
                # -------------------------------------------------

                if not incidents:

                    fallback_stmt = (
                        select(
                            IncidentReport
                        )
                        .where(
                            IncidentReport.is_diagnosed == True,
                            IncidentReport.ai_root_cause.isnot(None),
                        )
                        .order_by(
                            IncidentReport.created_at.desc()
                        )
                        .limit(
                            top_k
                        )
                    )

                    fallback_result = (
                        await session.execute(
                            fallback_stmt
                        )
                    )

                    incidents = (
                        fallback_result.scalars().all()
                    )

                # -------------------------------------------------
                # Return useful RAG context
                # -------------------------------------------------

                return [
                    {
                        "root_cause": incident.ai_root_cause,
                        "patch": incident.ai_suggested_patch,
                        "service_id": incident.service_id,
                        "error_type": incident.error_type,
                        "anomaly_score": float(
                            incident.anomaly_score or 0.0
                        ),
                    }
                    for incident in incidents
                    if incident.ai_root_cause
                ]

        except Exception as exc:

            print(
                f"Vector search failed: {exc}"
            )

            return []

    async def search_similar(
        self,
        query: str,
        limit: int = 3,
    ) -> List[Dict[str, Any]]:

        return await (
            self.search_similar_incidents(
                stack_trace=query,
                error_type="",
                top_k=limit,
            )
        )

    async def similar_incidents(
        self,
        query: str,
        limit: int = 3,
    ) -> List[Dict[str, Any]]:

        return await (
            self.search_similar_incidents(
                stack_trace=query,
                error_type="",
                top_k=limit,
            )
        )

    async def add_incident(
        self,
        incident_id: Any,
        text: str,
        embedding: Optional[List[float]] = None,
    ) -> None:

        try:

            if embedding is None:

                embedding = (
                    embedder.get_embedding(
                        text
                    )
                )

            async with AsyncSessionLocal() as session:

                result = await session.execute(
                    select(
                        IncidentReport
                    ).where(
                        IncidentReport.id == incident_id
                    )
                )

                incident = (
                    result.scalar_one_or_none()
                )

                if incident is None:
                    return

                incident.embedding = (
                    embedding
                )

                await session.commit()

        except Exception as exc:

            print(
                f"Embedding storage failed: {exc}"
            )


vector_store = VectorStore()