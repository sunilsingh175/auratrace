import os
import sys
from typing import Any, List, Dict
from sqlalchemy import select

# Ensure workspace and current dir are in sys.path for standalone and package execution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from .embeddings import embedder
except (ImportError, ValueError):
    from embeddings import embedder

try:
    from backend.shared.database import AsyncSessionLocal, IncidentReport
except ImportError:
    from shared.database import AsyncSessionLocal, IncidentReport

class VectorStore:
    async def search_similar_incidents(self, stack_trace: str, error_type: str, top_k: int = 3) -> List[Dict[str, Any]]:
        try:
            search_query = f"{error_type} {stack_trace}".strip()
            if not search_query:
                return []
            
            query_embedding = embedder.get_embedding(search_query)
            
            async with AsyncSessionLocal() as session:
                # Query pgvector for cosine similarity using hnsw index
                embedding_col: Any = IncidentReport.embedding
                stmt = select(IncidentReport).where(
                    embedding_col.isnot(None)
                ).order_by(
                    embedding_col.cosine_distance(query_embedding)
                ).limit(top_k)
                
                result = await session.execute(stmt)
                incidents = result.scalars().all()
                
                return [
                    {"root_cause": inc.ai_root_cause, "patch": inc.ai_suggested_patch}
                    for inc in incidents if inc.ai_root_cause
                ]
        except Exception:
            return []

vector_store = VectorStore()