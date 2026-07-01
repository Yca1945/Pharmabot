"""Métriques d'évaluation du pipeline RAG.

Deux niveaux :

1. Métriques OFFLINE, déterministes et reproductibles (utilisées par défaut,
   sans dépendance à un LLM juge) :
     - context_precision / context_recall : qualité de la récupération, par
       comparaison des sources récupérées aux sources attendues.
     - faithfulness_heuristique : recouvrement lexical réponse / contexte
       (proxy de l'absence d'hallucination).
     - answer_relevance_heuristique : recouvrement question / réponse.
     - abstention_correcte : le garde-fou s'est-il déclenché quand il le devait.

2. Métriques RIGOUREUSES via la librairie `ragas` (faithfulness, answer
   relevancy) : voir evaluate_rag.py --ragas. Nécessite un LLM juge configuré.

Les fonctions ci-dessous sont pures (aucun I/O) et donc testables unitairement.
"""
from __future__ import annotations

import re

_MOT = re.compile(r"\w{3,}", re.UNICODE)
_STOP = {
    "les", "des", "une", "que", "qui", "pas", "pour", "avec", "vous", "est",
    "par", "sur", "dans", "votre", "votre", "cette", "son", "ses", "the",
}


def _mots(texte: str) -> set[str]:
    return {m.group(0).lower() for m in _MOT.finditer(texte or "")} - _STOP


def context_precision(recuperes: list[str], attendus: list[str]) -> float:
    """Proportion des sources récupérées qui sont pertinentes (1.0 si rien
    récupéré et rien attendu)."""
    if not recuperes:
        return 1.0 if not attendus else 0.0
    att = {a.lower() for a in attendus}
    bons = sum(1 for r in recuperes if r.lower() in att)
    return round(bons / len(recuperes), 3)


def context_recall(recuperes: list[str], attendus: list[str]) -> float:
    """Proportion des sources attendues effectivement récupérées."""
    if not attendus:
        return 1.0
    rec = {r.lower() for r in recuperes}
    trouves = sum(1 for a in attendus if a.lower() in rec)
    return round(trouves / len(attendus), 3)


def faithfulness_heuristique(reponse: str, contextes: list[str]) -> float:
    """Part des mots significatifs de la réponse présents dans le contexte
    récupéré. Proxy de fidélité : plus c'est haut, moins la réponse contient
    d'éléments absents du contexte (hallucinations potentielles)."""
    mots_rep = _mots(reponse)
    if not mots_rep:
        return 1.0
    mots_ctx = set()
    for c in contextes:
        mots_ctx |= _mots(c)
    couverts = len(mots_rep & mots_ctx)
    return round(couverts / len(mots_rep), 3)


def answer_relevance_heuristique(reponse: str, question: str) -> float:
    """Part des mots significatifs de la question repris dans la réponse."""
    mots_q = _mots(question)
    if not mots_q:
        return 1.0
    mots_r = _mots(reponse)
    return round(len(mots_q & mots_r) / len(mots_q), 3)


def abstention_correcte(abstention_predite: bool, doit_abstenir: bool) -> bool:
    return bool(abstention_predite) == bool(doit_abstenir)


def agreger(enregistrements: list[dict]) -> dict:
    """Moyenne chaque métrique numérique sur l'ensemble des cas + taux
    d'exactitude de l'abstention."""
    if not enregistrements:
        return {}
    cles_num = [
        "context_precision",
        "context_recall",
        "faithfulness",
        "answer_relevance",
    ]
    out: dict[str, float] = {}
    for cle in cles_num:
        vals = [e[cle] for e in enregistrements if cle in e]
        if vals:
            out[cle] = round(sum(vals) / len(vals), 3)
    abst = [e for e in enregistrements if "abstention_ok" in e]
    if abst:
        out["abstention_accuracy"] = round(
            sum(1 for e in abst if e["abstention_ok"]) / len(abst), 3
        )
    out["n_cas"] = len(enregistrements)
    return out
