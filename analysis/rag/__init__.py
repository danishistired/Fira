"""
RAG layer for ARGUS — MITRE ATT&CK Mobile threat intelligence.

This package provides:
- chroma_store.py  — ChromaDB client (persistent local store)
- mitre_loader.py  — Downloads + embeds MITRE ATT&CK Mobile matrix
- retriever.py     — retrieve_techniques(query) → top-N relevant techniques
"""
