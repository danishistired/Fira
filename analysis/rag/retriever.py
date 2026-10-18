"""
RAG retriever for ARGUS — MITRE ATT&CK technique lookup.

Primary entry point: retrieve_techniques(query, n=5)

Semantically searches the ChromaDB collection for ATT&CK Mobile techniques
relevant to the query string. The query is typically a concatenation of
evidence signals (suspicious APIs, permissions, flags found so far).

Returns a compact list of dicts suitable for injecting into the planner
system prompt as threat intelligence context.
"""

from typing import Optional
import threading

_init_lock = threading.Lock()
_initialized = False


def _ensure_initialized():
    """Ensure the ChromaDB collection is populated (thread-safe, once)."""
    global _initialized
    if _initialized:
        return
    with _init_lock:
        if _initialized:
            return
        try:
            from rag.mitre_loader import load_mitre_into_chroma
            load_mitre_into_chroma()
        except Exception as e:
            print(f"[RAG] MITRE load failed: {e}", flush=True)
        _initialized = True


def retrieve_techniques(query: str, n: int = 5) -> list[dict]:
    """Retrieve the top-N most relevant MITRE ATT&CK Mobile techniques.

    Args:
        query: Evidence-based query string (e.g., "SMS interception DexClassLoader Runtime.exec")
        n: Number of results to return (default 5)

    Returns:
        List of dicts: [{technique_id, name, tactic, relevance_snippet}, ...]
        Returns empty list if ChromaDB is unavailable or query fails.
    """
    if not query or not query.strip():
        return []

    _ensure_initialized()

    try:
        from rag.chroma_store import get_collection, is_populated
        collection = get_collection()
        if collection is None or not is_populated():
            return []

        results = collection.query(
            query_texts=[query],
            n_results=min(n, collection.count()),
            include=["documents", "metadatas", "distances"],
        )

        techniques = []
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for doc, meta, dist in zip(docs, metas, distances):
            # cosine distance → similarity (lower distance = more similar)
            similarity = round(1 - dist, 3)
            techniques.append({
                "technique_id": meta.get("technique_id", ""),
                "name": meta.get("name", ""),
                "tactic": meta.get("tactic", ""),
                "snippet": doc[:200],  # first 200 chars as context
                "similarity": similarity,
            })

        return techniques

    except Exception as e:
        print(f"[RAG] retrieve_techniques failed: {e}", flush=True)
        return []


def format_rag_context(techniques: list[dict]) -> str:
    """Format retrieved techniques as a prompt-ready string.

    Returns empty string if no techniques found.
    """
    if not techniques:
        return ""

    lines = ["## Threat Intelligence Context (MITRE ATT&CK Mobile)"]
    lines.append("The following techniques are relevant to the evidence found so far:")
    for t in techniques:
        lines.append(
            f"- **{t['technique_id']} — {t['name']}** ({t['tactic']}): "
            f"{t['snippet'][:150]}"
        )
    lines.append(
        "\nWhen forming hypotheses and selecting tools, cross-reference findings "
        "against these techniques. Cite technique IDs (e.g. T1412) in reasoning."
    )
    return "\n".join(lines)


def initialize_rag_background():
    """Start RAG initialization in a background thread.

    Called at app startup so the first analysis doesn't wait for MITRE load.
    """
    t = threading.Thread(target=_ensure_initialized, daemon=True, name="rag-init")
    t.start()
    return t
