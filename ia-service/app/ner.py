"""Reconnaissance d'entites nommees (NER) medicales.

Deux backends interchangeables, selectionnes via NER_BACKEND :

- "rules"  : gazetteer du catalogue de l'officine + expressions regulieres.
- "spacy"  : pipeline spaCy francais + EntityRuler seede par le catalogue.

En cas d'indisponibilite de spaCy ou du modele, on retombe automatiquement sur
les regles (robustesse). L'architecture est volontairement pluggable : un modele
transformers fine-tune pourra etre branche en ajoutant un nouvel extracteur.
"""
from __future__ import annotations

import re
from functools import lru_cache

from .config import settings
from .schemas import ExtractedEntity

# --- Expressions regulieres partagees ---

DOSAGE_RE = re.compile(
    r"\b(\d+(?:[.,]\d+)?)\s?(mg|g|ml|µg|mcg|ui)\b",
    re.IGNORECASE,
)

FREQUENCE_RE = re.compile(
    r"("
    r"\d+\s?(?:fois|x)\s?(?:par\s?jour|/\s?j(?:our)?)?"
    r"|toutes?\s+les?\s+\d+\s?(?:h\b|heures?)"
    r"|matin(?:\s*,?\s*midi)?(?:\s+et\s+soir|\s*,?\s*soir)?"
    r"|midi\s+et\s+soir"
    r"|le\s+matin|le\s+midi|le\s+soir"
    r")",
    re.IGNORECASE,
)

# Mots frequents a ne jamais considerer comme un nom de medicament.
_STOP = {
    "bonjour", "bonsoir", "salut", "coucou", "hello", "hey", "yo", "bjr", "bsr",
    "merci", "posologie", "dosage", "comprime", "comprimes",
    "gelule", "gelules", "boite", "boites", "prendre", "fois", "jour",
    "matin", "midi", "soir", "heures", "heure", "avec", "pour", "dans",
    "faut", "besoin", "voudrais", "donnez", "quelle", "quel",
    "au", "revoir", "bientot", "bonne", "journee", "soiree", "bye", "ciao",
    "oui", "non", "ok", "accord", "entendu", "svp",
}


def _find_dosage(text: str) -> str | None:
    m = DOSAGE_RE.search(text)
    return f"{m.group(1)} {m.group(2).lower()}" if m else None


def _find_frequence(text: str) -> str | None:
    m = FREQUENCE_RE.search(text)
    return m.group(1).strip() if m else None


def _segments(text: str) -> list[str]:
    """Decoupe une demande en segments (un medicament par segment, idealement)."""
    parts = re.split(r"[;,]|\bet\b|\bpuis\b", text, flags=re.IGNORECASE)
    return [p.strip() for p in parts if p.strip()]


@lru_cache(maxsize=1)
def _catalog() -> tuple[tuple[str, str], ...]:
    """Catalogue (designation complete, jeton de marque en minuscules)."""
    try:
        from .vector_store import store

        noms = store.all_medicament_names()
    except Exception:
        noms = []
    pairs = []
    for nom in noms:
        token = nom.split()[0].lower() if nom else ""
        if token:
            pairs.append((nom, token))
    return tuple(pairs)


# ----------------------------------------------------------------------------
# Backend "regles" : gazetteer + regex
# ----------------------------------------------------------------------------

def _med_rules(segment: str) -> str | None:
    seg = segment.lower()

    # 1) Gazetteer : un medicament connu du catalogue est-il cite ?
    for designation, token in _catalog():
        if token and token in seg:
            return token.capitalize()

    # 2) Repli : premier mot capitalise non vide de sens medical
    for m in re.finditer(r"\b([A-ZÉÈÀ][A-Za-zéèàâ\-]{2,})\b", segment):
        mot = m.group(1)
        if mot.lower() not in _STOP:
            return mot
    return None


def _extract_rules(text: str) -> list[ExtractedEntity]:
    entities: list[ExtractedEntity] = []
    for seg in _segments(text):
        med = _med_rules(seg)
        if not med:
            continue
        entities.append(
            ExtractedEntity(
                medicament=med,
                dosage=_find_dosage(seg),
                frequence=_find_frequence(seg),
            )
        )
    return _dedupe(entities)


# ----------------------------------------------------------------------------
# Backend "spaCy" : pipeline francais + EntityRuler seede par le catalogue
# ----------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _spacy_nlp():
    """Charge spaCy + EntityRuler. Renvoie None si indisponible (-> fallback)."""
    try:
        import spacy
    except Exception:
        return None
    try:
        nlp = spacy.load(settings.spacy_model, disable=["lemmatizer"])
    except Exception:
        return None

    ruler = nlp.add_pipe("entity_ruler", before="ner", config={"overwrite_ents": True})
    patterns = []
    for designation, token in _catalog():
        patterns.append({"label": "MEDICAMENT", "pattern": designation})
        patterns.append({"label": "MEDICAMENT", "pattern": token.capitalize()})
    if patterns:
        ruler.add_patterns(patterns)
    return nlp


def _med_spacy(segment: str, nlp) -> str | None:
    doc = nlp(segment)
    for ent in doc.ents:
        if ent.label_ == "MEDICAMENT":
            return ent.text.split()[0].capitalize()
    return None


def _extract_spacy(text: str) -> list[ExtractedEntity]:
    nlp = _spacy_nlp()
    if nlp is None:
        return _extract_rules(text)  # repli automatique

    entities: list[ExtractedEntity] = []
    for seg in _segments(text):
        med = _med_spacy(seg, nlp) or _med_rules(seg)
        if not med:
            continue
        entities.append(
            ExtractedEntity(
                medicament=med,
                dosage=_find_dosage(seg),
                frequence=_find_frequence(seg),
            )
        )
    return _dedupe(entities)


# ----------------------------------------------------------------------------
# Facade
# ----------------------------------------------------------------------------

def _dedupe(entities: list[ExtractedEntity]) -> list[ExtractedEntity]:
    vus: set[str] = set()
    out: list[ExtractedEntity] = []
    for e in entities:
        cle = e.medicament.lower()
        if cle not in vus:
            vus.add(cle)
            out.append(e)
    return out


def extract_entities(text: str) -> list[ExtractedEntity]:
    """Point d'entree unique. Choisit le backend selon la configuration."""
    if settings.ner_backend == "spacy":
        return _extract_spacy(text)
    return _extract_rules(text)
