"""Demonstration / verification rapide du module NER.

Usage (depuis le conteneur ia-service) :
    python -m scripts.test_ner

Affiche les entites extraites pour un jeu de phrases representatives. Permet
de comparer visuellement les backends (NER_BACKEND=rules vs spacy).
"""
from app.config import settings
from app.ner import extract_entities

PHRASES = [
    "Bonjour, il me faut du Doliprane 1000 mg 3 fois par jour",
    "Je voudrais de l'Amoxicilline 500 le matin et de l'Ibuprofene 400 le soir",
    "Doliprane toutes les 6 heures s'il vous plait",
    "Quel est le sens de la vie ?",  # ne doit produire aucune entite medicale
]


def run() -> None:
    print(f"Backend NER actif : {settings.ner_backend}\n")
    for phrase in PHRASES:
        print(f"> {phrase}")
        entites = extract_entities(phrase)
        if not entites:
            print("   (aucune entite)")
        for e in entites:
            print(f"   - medicament={e.medicament!r} dosage={e.dosage!r} frequence={e.frequence!r}")
        print()


if __name__ == "__main__":
    run()
