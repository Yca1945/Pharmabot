"""Détection de messages de politesse/small-talk (hors périmètre médical).

But : garder la conversation fluide sans passer par le pipeline RAG pour un
simple "Bonjour" ou "Merci" — et surtout éviter que le NER n'interprète ces
mots comme un nom de médicament (cf. repli regex de ner.py).
"""
from __future__ import annotations

import random
import re

_SALUTATIONS = re.compile(
    r"^\s*(bonjour|bonsoir|salut|coucou|hello|hey|yo|bjr|bsr)\s*[!.?]*\s*$",
    re.IGNORECASE,
)
_REMERCIEMENTS = re.compile(
    r"^\s*(merci(\s+beaucoup)?|thanks?|je\s+vous\s+remercie)\s*[!.?]*\s*$",
    re.IGNORECASE,
)
_AU_REVOIR = re.compile(
    r"^\s*(au\s?revoir|à\s?bient[ôo]t|bonne\s+journ[ée]e|bonne\s+soir[ée]e|bye|ciao)\s*[!.?]*\s*$",
    re.IGNORECASE,
)
_CA_VA = re.compile(
    r"^\s*(comment\s+(ça|ca)\s+va|(ça|ca)\s+va\s*\??|comment\s+(vas|allez)-?\s?(tu|vous))\s*[!.?]*\s*$",
    re.IGNORECASE,
)
_OUI_NON = re.compile(r"^\s*(oui|non|ok|d'accord|daccord|entendu)\s*[!.?]*\s*$", re.IGNORECASE)

_REPONSES_SALUTATION = [
    "Bonjour ! En quoi puis-je vous aider aujourd'hui ? Vous pouvez me demander la posologie, les effets secondaires ou les contre-indications d'un médicament.",
    "Bonjour, ravi de vous aider ! Posez-moi votre question sur un médicament ou un traitement.",
    "Bonjour ! Je suis là pour répondre à vos questions sur vos médicaments. Que puis-je faire pour vous ?",
]
_REPONSES_MERCI = [
    "Avec plaisir ! N'hésitez pas si vous avez d'autres questions.",
    "Je vous en prie. Je reste disponible si besoin.",
    "Avec plaisir ! Pensez à valider toute prise avec votre pharmacien.",
]
_REPONSES_AU_REVOIR = [
    "Au revoir, prenez soin de vous !",
    "À bientôt ! N'hésitez pas à revenir si vous avez d'autres questions.",
]
_REPONSES_CA_VA = [
    "Je vais bien, merci de demander ! Et vous, en quoi puis-je vous aider aujourd'hui ?",
    "Tout va bien de mon côté ! Comment puis-je vous accompagner aujourd'hui ?",
]
_REPONSES_OUI_NON = [
    "D'accord. N'hésitez pas à me poser une question sur un médicament ou un traitement.",
]


def detecter(message: str) -> str | None:
    """Renvoie une réponse conversationnelle si le message est du small-talk,
    sinon None (le pipeline RAG médical prend le relais)."""
    if _SALUTATIONS.match(message):
        return random.choice(_REPONSES_SALUTATION)
    if _REMERCIEMENTS.match(message):
        return random.choice(_REPONSES_MERCI)
    if _AU_REVOIR.match(message):
        return random.choice(_REPONSES_AU_REVOIR)
    if _CA_VA.match(message):
        return random.choice(_REPONSES_CA_VA)
    if _OUI_NON.match(message):
        return random.choice(_REPONSES_OUI_NON)
    return None
