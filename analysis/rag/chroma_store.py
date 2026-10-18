"""
ChromaDB persistent store for ARGUS RAG layer.

Uses a local on-disk collection so MITRE ATT&CK data is embedded once
and reused across all investigation sessions — no internet required
after the initial load.

Store location: analysis/rag/chroma_data/
Collection: mitre_attack_mobile
"""

import os
from pathlib import Path

# Chromadb is an optional dependency — handle ImportError gracefully
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False

# Persistent store lives next to this file
_STORE_DIR = Path(__file__).parent / "chroma_data"
_COLLECTION_NAME = "mitre_attack_mobile"

_client = None
_collection = None


def get_collection():
    """Return the ChromaDB collection, creating it if needed.

    Returns None if chromadb is not installed.
    """
    global _client, _collection

    if not CHROMADB_AVAILABLE:
        return None

    if _collection is not None:
        return _collection

    _STORE_DIR.mkdir(parents=True, exist_ok=True)
    _client = chromadb.PersistentClient(path=str(_STORE_DIR))
    _collection = _client.get_or_create_collection(
        name=_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    return _collection


def is_populated() -> bool:
    """Return True if the collection has documents in it."""
    col = get_collection()
    if col is None:
        return False
    return col.count() > 0


def collection_count() -> int:
    """Return the number of documents in the collection."""
    col = get_collection()
    if col is None:
        return 0
    return col.count()
