"""
Sentence-transformer embeddings for incident similarity search.
Uses BAAI/bge-small-en-v1.5 — 384-dim, fast, high quality.
"""
import json
import logging
from typing import List, Optional
from sentence_transformers import SentenceTransformer
from shared.config import get_settings

log = logging.getLogger("rag.embeddings")
settings = get_settings()

MODEL_NAME = getattr(settings, "EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5") or "BAAI/bge-small-en-v1.5"
_model: Optional[SentenceTransformer] = None


def get_model() -> SentenceTransformer:
    """Lazy-load the embedding model (thread-safe singleton)."""
    global _model
    if _model is None:
        print(f"📥 Loading embedding model: {MODEL_NAME}")
        try:
            _model = SentenceTransformer(MODEL_NAME)
            print(f"✅ Model loaded (dim={_model.get_sentence_embedding_dimension()})")
        except Exception as exc:
            log.warning("SentenceTransformer failed to load '%s': %s. Using fallback.", MODEL_NAME, exc)
            _model = None
    return _model


def embed_text(text: str) -> List[float]:
    """Encode text → normalized 384-d vector (list of floats)."""
    if not text or not text.strip():
        return [0.0] * 384
    model = get_model()
    if model is not None:
        try:
            vec = model.encode(text, normalize_embeddings=True)
            return vec.tolist()
        except Exception as e:
            log.warning("Embedding encoding exception: %s", e)
    return [0.0] * 384


def build_incident_text(incident: dict) -> str:
    """
    Construct the canonical text representation of an incident.
    This is what gets embedded for similarity search.
    """
    parts = [
        f"Error: {incident.get('error_type') or 'Unknown'}",
        f"Message: {incident.get('error_message') or incident.get('root_cause') or ''}",
        f"Service: {incident.get('service_name') or 'unknown'}",
    ]

    runtime = incident.get("runtime") or {}
    if isinstance(runtime, str):
        try:
            runtime = json.loads(runtime)
        except Exception:
            runtime = {}

    if isinstance(runtime, dict) and runtime:
        lang = runtime.get("language", "")
        fw = runtime.get("framework", "")
        if lang or fw:
            parts.append(f"Runtime: {lang} {fw}".strip())

    stack = incident.get("stack_trace") or ""
    if stack:
        # Top 10 frames only (keeps embedding focused)
        frames = "\n".join(stack.split("\n")[:10])
        parts.append("Stack:\n" + frames)

    return "\n".join(parts)[:2000]


# Backwards compatibility helper class
class EmbeddingService:
    def get_embedding(self, text: str) -> List[float]:
        return embed_text(text)

    def embed(self, text: str) -> List[float]:
        return embed_text(text)


embedder = EmbeddingService()