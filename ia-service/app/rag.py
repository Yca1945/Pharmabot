"""Pipeline RAG + garde-fou anti-hallucination.

Logique (cœur scientifique du mémoire) :
  1. Retrieval : on récupère les fiches médicaments les plus proches.
  2. Garde-fou : si la meilleure similarité < seuil -> ABSTENTION (on ne
     laisse pas le LLM inventer). C'est ce qui rend l'« étanchéité médicale »
     vérifiable plutôt que de prétendre 0% d'hallucination par magie.
  3. Generation : le LLM répond UNIQUEMENT à partir du contexte fourni,
     avec une consigne stricte de citer ses sources et de ne rien inventer.
"""
from __future__ import annotations

import logging
import re
import time

from .config import settings
from .llm_client import generate
from .ner import extract_entities  # NER deleguee au module dedie (spaCy/regles)
from .schemas import ChatResponse, ExtractedEntity, ProfilMedical, SourceDoc, TourConversation
from .smalltalk import detecter as detecter_smalltalk
from .vector_store import store

SYSTEM_PROMPT = (
    "Tu es l'assistant d'une officine de pharmacie. Tu réponds STRICTEMENT à "
    "partir du CONTEXTE médical fourni ci-dessous. Règles absolues :\n"
    "1. N'invente JAMAIS une posologie, un dosage, une contre-indication ou un "
    "médicament absent du contexte.\n"
    "2. Si le contexte ne contient pas l'information, réponds exactement : "
    "\"Je ne dispose pas de cette information, veuillez consulter votre pharmacien.\"\n"
    "3. Ne donne jamais de diagnostic. Tu informes, tu ne prescris pas.\n"
    "4. Termine toujours en rappelant que la commande sera validée par le pharmacien."
)

ABSTENTION_MSG = (
    "Je ne dispose pas d'information fiable sur ce point. "
    "Veuillez consulter votre pharmacien."
)

# Question sans médicament identifiable : on guide le patient plutôt que
# de s'abstenir sèchement, pour éviter les impasses conversationnelles.
CLARIFICATION_MSG = (
    "Je ne suis pas sûr de bien comprendre votre demande. "
    "Pourriez-vous préciser le nom d'un médicament, un symptôme ou une "
    "question de posologie ? Par exemple : « Quels sont les effets "
    "secondaires du Doliprane ? »"
)

# Médicament nommé mais absent du catalogue / hors périmètre de connaissance.
HORS_CATALOGUE_MSG = (
    "Je n'ai pas d'information fiable sur {medicament} dans notre catalogue. "
    "Veuillez consulter votre pharmacien pour toute question à ce sujet."
)

logger = logging.getLogger("pharmabot.rag")


def _estimate_faithfulness(answer: str, context: str) -> float:
    """Estimation grossière de fidélité : part des mots significatifs de la
    réponse présents dans le contexte. Indicateur de dev — la vraie évaluation
    se fait avec RAGAS dans la phase d'évaluation (mois 5)."""
    words = {w.lower() for w in re.findall(r"\w{4,}", answer)}
    if not words:
        return 1.0
    ctx = context.lower()
    covered = sum(1 for w in words if w in ctx)
    return round(covered / len(words), 3)


def _build_profil_context(profil: ProfilMedical | None) -> str:
    """Construit un bloc de contexte patient à injecter dans le prompt."""
    if not profil:
        return ""
    parts = []
    if profil.age:
        parts.append(f"Âge : {profil.age} ans")
    if profil.poids:
        parts.append(f"Poids : {profil.poids} kg")
    if profil.sexe:
        label = {"M": "Masculin", "F": "Féminin"}.get(profil.sexe, profil.sexe)
        parts.append(f"Sexe : {label}")
    if profil.groupe_sanguin:
        parts.append(f"Groupe sanguin : {profil.groupe_sanguin}")
    if profil.allergies:
        parts.append(f"Allergies connues : {profil.allergies}")
    if profil.antecedents:
        parts.append(f"Antécédents médicaux : {profil.antecedents}")
    if not parts:
        return ""
    return "PROFIL PATIENT :\n" + "\n".join(parts) + "\n\n"


def _enrichir_requete(message: str, historique: list[TourConversation] | None) -> str:
    """Enrichit la requête de retrieval avec les médicaments mentionnés dans
    l'historique récent. Permet aux questions de suivi sans nom de médicament
    ("et pour un enfant ?") de retrouver le bon contexte dans ChromaDB."""
    if not historique:
        return message
    # Extraire les entités des 2 dernières questions de l'historique
    entites_hist: list[str] = []
    for tour in historique[-2:]:
        for e in extract_entities(tour.question):
            if e.medicament and e.medicament not in entites_hist:
                entites_hist.append(e.medicament)
    if not entites_hist:
        return message
    return f"{message} {' '.join(entites_hist)}"


async def answer(
    message: str,
    profil: ProfilMedical | None = None,
    historique: list[TourConversation] | None = None,
) -> ChatResponse:
    t0 = time.perf_counter()

    # --- Small-talk : salutations/remerciements gérés sans pipeline RAG ---
    # Évite aussi que le NER n'interprète un mot de politesse ("Hello") comme
    # un faux nom de médicament (repli regex sur mot capitalisé).
    reponse_smalltalk = detecter_smalltalk(message)
    if reponse_smalltalk is not None:
        logger.info("smalltalk", extra={"data": {"message": message}})
        return ChatResponse(
            reponse=reponse_smalltalk,
            sources=[],
            entites=[],
            abstention=False,
            fidelite_estimee=None,
            conversationnel=True,
        )

    requete_enrichie = _enrichir_requete(message, historique)
    hits = store.search(requete_enrichie)
    entities = extract_entities(message)
    best_sim = hits[0]["similarite"] if hits else 0.0
    logger.info("retrieval", extra={"data": {
        "n_hits": len(hits),
        "best_sim": best_sim,
        "n_entites": len(entities),
        "ms": round((time.perf_counter() - t0) * 1000, 1),
    }})

    # --- Garde-fou anti-hallucination ---
    if not hits or best_sim < settings.min_similarity:
        # Distinguer deux cas : question vague (aucun médicament cité), qui
        # n'est pas un échec à proprement parler — on guide simplement le
        # patient — vs médicament cité mais absent de notre base de
        # connaissance, qui est un véritable refus du garde-fou.
        vague = not entities
        if vague:
            reponse = CLARIFICATION_MSG
        else:
            reponse = HORS_CATALOGUE_MSG.format(medicament=entities[0].medicament)
        logger.info("abstention", extra={"data": {
            "best_sim": best_sim,
            "seuil": settings.min_similarity,
            "vague": vague,
        }})
        return ChatResponse(
            reponse=reponse,
            sources=[],
            entites=entities,
            abstention=not vague,
            fidelite_estimee=None,
            conversationnel=vague,
        )

    context_blocks = [f"[{h['medicament']}] {h['extrait']}" for h in hits]
    context = "\n\n".join(context_blocks)
    profil_ctx = _build_profil_context(profil)
    user_prompt = f"{profil_ctx}CONTEXTE MÉDICAMENT :\n{context}\n\nQUESTION DU PATIENT :\n{message}"

    hist_dicts = [{"question": t.question, "reponse": t.reponse} for t in (historique or [])]

    t_llm = time.perf_counter()
    reponse = await generate(SYSTEM_PROMPT, user_prompt, hist_dicts)
    fidelite = _estimate_faithfulness(reponse, context)
    logger.info("generation", extra={"data": {
        "best_sim": best_sim,
        "fidelite_estimee": fidelite,
        "llm_ms": round((time.perf_counter() - t_llm) * 1000, 1),
    }})

    sources = [
        SourceDoc(
            medicament=h["medicament"],
            extrait=h["extrait"][:240],
            similarite=h["similarite"],
        )
        for h in hits
    ]
    return ChatResponse(
        reponse=reponse,
        sources=sources,
        entites=entities,
        abstention=False,
        fidelite_estimee=fidelite,
    )
