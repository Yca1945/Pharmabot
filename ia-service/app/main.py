"""Point d'entree FastAPI du microservice IA Pharmabot.

Expose au backend Laravel uniquement (reseau Docker interne).
"""
from fastapi import FastAPI, HTTPException

from .logging_config import configure_logging
from .middleware import RequestContextMiddleware
from .rag import answer, extract_entities
from .schemas import ChatRequest, ChatResponse, ExtractedEntity, IngestRequest, ProfilMedical, TourConversation
from .vector_store import store

configure_logging()

app = FastAPI(
    title="Pharmabot - Microservice IA (RAG)",
    version="0.1.0",
    description="Pipeline RAG medical avec garde-fou anti-hallucination.",
)
app.add_middleware(RequestContextMiddleware)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "documents_indexes": store.count()}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    try:
        return await answer(req.message, req.profil_medical, req.historique)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Erreur moteur IA: {exc}")


@app.post("/extract", response_model=list[ExtractedEntity])
def extract(req: ChatRequest) -> list[ExtractedEntity]:
    """Extraction d'entites (NER) seule, sans appel LLM."""
    return extract_entities(req.message)


@app.post("/ingest")
def ingest(req: IngestRequest) -> dict:
    """Indexe ou met a jour une fiche medicament dans la base vectorielle."""
    doc_id = req.metadata.get("id") or req.medicament.lower().replace(" ", "_")
    store.add(str(doc_id), req.medicament, req.contenu, req.metadata)
    return {"indexe": True, "id": str(doc_id), "total": store.count()}


@app.delete("/ingest/{doc_id}")
def remove(doc_id: str) -> dict:
    """Retire une fiche du catalogue vectoriel (sync suppression Laravel)."""
    store.delete(doc_id)
    return {"supprime": True, "total": store.count()}
