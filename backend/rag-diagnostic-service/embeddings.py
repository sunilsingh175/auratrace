import os
import sys
from sentence_transformers import SentenceTransformer

# Ensure workspace is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

try:
    from backend.shared.logger import get_logger
except ImportError:
    from shared.logger import get_logger

logger = get_logger("embeddings")

class EmbeddingService:
    def __init__(self):
        logger.info("Loading embedding model 'all-MiniLM-L6-v2'...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Embedding model loaded.")

    def get_embedding(self, text: str) -> list:
        return self.model.encode(text).tolist()

embedder = EmbeddingService()