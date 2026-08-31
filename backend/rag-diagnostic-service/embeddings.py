import os
import sys

# Ensure workspace is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

try:
    from backend.shared.logger import get_logger
except ImportError:
    from shared.logger import get_logger

logger = get_logger("embeddings")

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

class EmbeddingService:
    def __init__(self):
        if SentenceTransformer:
            logger.info("Loading embedding model 'all-MiniLM-L6-v2'...")
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Embedding model loaded.")
        else:
            self.model = None
            logger.warning("sentence-transformers not installed; using fallback embedder.")

    def get_embedding(self, text: str) -> list:
        if self.model:
            return self.model.encode(text).tolist()
        return [0.0] * 384

embedder = EmbeddingService()