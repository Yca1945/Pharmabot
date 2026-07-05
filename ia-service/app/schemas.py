"""Schémas Pydantic = contrat d'échange JSON avec le backend Laravel."""
from pydantic import BaseModel, Field


class ProfilMedical(BaseModel):
    allergies: str | None = None
    antecedents: str | None = None
    age: int | None = None
    poids: float | None = None
    sexe: str | None = None          # "M" | "F" | "autre"
    groupe_sanguin: str | None = None


class TourConversation(BaseModel):
    """Un échange (question + réponse) de l'historique récent."""
    question: str
    reponse: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Message du patient")
    patient_id: int | None = Field(None, description="ID patient (traçabilité)")
    profil_medical: ProfilMedical | None = Field(None, description="Profil médical du patient pour personnaliser la réponse")
    historique: list[TourConversation] = Field(default_factory=list, description="Derniers échanges (mémoire conversationnelle, ordre chronologique)")


class SourceDoc(BaseModel):
    medicament: str
    extrait: str
    similarite: float


class ExtractedEntity(BaseModel):
    """Entité extraite (NER) : médicament + posologie le cas échéant."""
    medicament: str
    dosage: str | None = None
    frequence: str | None = None


class ChatResponse(BaseModel):
    reponse: str
    sources: list[SourceDoc] = []
    entites: list[ExtractedEntity] = []
    # True si le garde-fou a refusé de répondre faute de contexte fiable.
    abstention: bool = False
    fidelite_estimee: float | None = None
    # True pour un échange conversationnel (salutation, remerciement,
    # demande de clarification) : pas une réponse médicale sourcée, donc le
    # frontend ne doit pas proposer de feedback dessus.
    conversationnel: bool = False


class IngestRequest(BaseModel):
    medicament: str
    contenu: str
    metadata: dict = {}
