"""
AuraTrace pgvector Similarity Search
Performs Approximate Nearest Neighbor (ANN) cosine distance queries on the Knowledge Base.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.shared.database import AsyncSessionLocal, IncidentKnowledgeBase
try:
    from .embeddings import embedding_engine
except ImportError:
    from embeddings import embedding_engine
from backend.shared.logger import get_logger

logger = get_logger("rag-vector-store")


class VectorStore:
    async def search_similar_incidents(
        self,
        stack_trace: str,
        error_type: Optional[str] = None,
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Computes the vector embedding of the query stack trace and performs
        cosine distance similarity search against PostgreSQL pgvector index.
        """
        query_vector = embedding_engine.embed_text(stack_trace)
        results = []

        try:
            async with AsyncSessionLocal() as session:
                # pgvector cosine distance operator is <=>
                # 1 - cosine_distance gives cosine similarity
                stmt = select(
                    IncidentKnowledgeBase.id,
                    IncidentKnowledgeBase.error_type,
                    IncidentKnowledgeBase.stack_trace_pattern,
                    IncidentKnowledgeBase.root_cause,
                    IncidentKnowledgeBase.recommended_patch,
                    IncidentKnowledgeBase.embedding.cosine_distance(query_vector).label("distance"),
                ).order_by(
                    IncidentKnowledgeBase.embedding.cosine_distance(query_vector)
                ).limit(top_k)

                res = await session.execute(stmt)
                rows = res.all()

                for row in rows:
                    similarity = max(0.0, 1.0 - float(row.distance if row.distance is not None else 1.0))
                    results.append({
                        "id": row.id,
                        "error_type": row.error_type,
                        "stack_trace_pattern": row.stack_trace_pattern,
                        "root_cause": row.root_cause,
                        "recommended_patch": row.recommended_patch,
                        "similarity_score": round(similarity, 3),
                    })

                logger.info(
                    "Retrieved %d matching knowledge base records for error '%s' (Top similarity: %.2f)",
                    len(results), error_type or "Unknown", results[0]["similarity_score"] if results else 0.0
                )

        except Exception as e:
            logger.error("Vector search failed in pgvector: %s", str(e), exc_info=True)

        return results


# Global Singleton VectorStore
vector_store = VectorStore()
