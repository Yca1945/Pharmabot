"""Couche d'accès à la base vectorielle (ChromaDB) + embeddings.

C'est le "Retrieval" du RAG : on indexe les fiches médicaments sous forme de
vecteurs sémantiques, puis on récupère les plus proches d'une requête patient.
"""
from __future__ import annotations

import chromadb
from chromadb.utils import embedding_functions

from .config import settings


class VectorStore:
    def __init__(self) -> None:
        self._client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        self._embedder = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=settings.embedding_model
        )
        self._collection = self._client.get_or_create_collection(
            name=settings.collection_name,
            embedding_function=self._embedder,
            metadata={"hnsw:space": "cosine"},  # distance cosinus
        )

    def add(self, doc_id: str, medicament: str, contenu: str, metadata: dict) -> None:
        meta = {"medicament": medicament, **metadata}
        self._collection.upsert(ids=[doc_id], documents=[contenu], metadatas=[meta])

    def search(self, query: str, top_k: int | None = None) -> list[dict]:
        """Retourne les documents proches avec leur similarité cosinus (0..1)."""
        res = self._collection.query(
            query_texts=[query],
            n_results=top_k or settings.top_k,
            include=["documents", "metadatas", "distances"],
        )
        docs = res.get("documents", [[]])[0]
        metas = res.get("metadatas", [[]])[0]
        dists = res.get("distances", [[]])[0]

        out: list[dict] = []
        for doc, meta, dist in zip(docs, metas, dists):
            # Chroma renvoie une distance cosinus -> similarité = 1 - distance
            similarity = 1.0 - float(dist)
            out.append(
                {
                    "medicament": meta.get("medicament", "?"),
                    "extrait": doc,
                    "similarite": round(similarity, 4),
                    "metadata": meta,
                }
            )
        return out

    def count(self) -> int:
        return self._collection.count()

    def delete(self, doc_id: str) -> None:
        """Retire une fiche de la base vectorielle (catalogue synchronisé)."""
        self._collection.delete(ids=[str(doc_id)])

    def all_medicament_names(self) -> list[str]:
        """Liste des designations indexees (sert de gazetteer au NER)."""
        data = self._collection.get(include=["metadatas"])
        metas = data.get("metadatas", []) or []
        noms = {m.get("medicament") for m in metas if m.get("medicament")}
        return sorted(noms)


# Instance partagée (chargée une fois au démarrage)
store = VectorStore()
