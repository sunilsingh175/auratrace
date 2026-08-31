import os
import sys
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
    async def search_similar_incidents(self, stack_trace: str, error_type: str, top_k: int = 3):
        search_query = f"{error_type} {stack_trace}"
        query_embedding = embedder.get_embedding(search_query)
        
        async with AsyncSessionLocal() as session:
            # Query pgvector for cosine similarity using hnsw index
            stmt = select(IncidentReport).order_by(
                IncidentReport.embedding.cosine_distance(query_embedding)
            ).limit(top_k)
            
            result = await session.execute(stmt)
            incidents = result.scalars().all()
            
            return [
                {"root_cause": inc.ai_root_cause, "patch": inc.ai_suggested_patch}
                for inc in incidents if inc.ai_root_cause
            ]

vector_store = VectorStore()