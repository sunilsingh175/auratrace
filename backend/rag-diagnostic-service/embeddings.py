"""
AuraTrace Stack Trace Embedding Generator
Vectorizes stack traces and error messages into 384-dimensional dense vectors.
"""

import os
import hashlib
import numpy as np
from typing import List
from backend.shared.logger import get_logger

logger = get_logger("rag-embeddings")

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")


class EmbeddingEngine:
    def __init__(self):
        self.model = None
        self.dim = 384
        self._load_model()

    def _load_model(self):
        """Attempts to load sentence-transformers model with fallback."""
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading embedding model '%s'...", MODEL_NAME)
            self.model = SentenceTransformer(MODEL_NAME)
            logger.info("Embedding model '%s' successfully loaded.", MODEL_NAME)
        except Exception as e:
            logger.warning(
                "Could not load SentenceTransformer ('%s'): %s. Using high-dimensional hash projection fallback.",
                MODEL_NAME, str(e)
            )
            self.model = None

    def embed_text(self, text: str) -> List[float]:
        """
        Embeds a single stack trace or error text into a 384-dim normalized float list.
        """
        if not text:
            return [0.0] * self.dim

        if self.model:
            try:
                vec = self.model.encode(text, normalize_embeddings=True)
                return vec.tolist()
            except Exception as e:
                logger.error("Embedding generation failed: %s", str(e))

        # Fallback deterministic projection to 384 dimensions
        return self._hash_projection_embedding(text)

    def _hash_projection_embedding(self, text: str) -> List[float]:
        """
        Deterministic 384-dimension pseudo-semantic projection for offline/fallback mode.
        """
        vec = np.zeros(self.dim, dtype=np.float32)
        words = text.lower().split()
        for idx, word in enumerate(words):
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            slot = h % self.dim
            val = (h >> 8) % 100 / 100.0 - 0.5
            vec[slot] += val

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0

        return vec.tolist()


# Global Singleton Instance
embedding_engine = EmbeddingEngine()
