"""Tests du module NER (backend règles, indépendant de spaCy/Chroma)."""
import os

os.environ["NER_BACKEND"] = "rules"

from app.ner import extract_entities  # noqa: E402


def _meds(texte):
    return [e.medicament.lower() for e in extract_entities(texte)]


def test_extraction_simple():
    es = extract_entities("Doliprane 1000 mg 3 fois par jour")
    assert len(es) == 1
    e = es[0]
    assert e.medicament.lower().startswith("doliprane")
    assert e.dosage == "1000 mg"
    assert "fois" in e.frequence


def test_multi_medicaments():
    meds = _meds("Amoxicilline 500 le matin et Ibuprofene 400 le soir")
    assert any("amoxicilline" in m for m in meds)
    assert any("ibuprofene" in m for m in meds)


def test_frequence_intervalle():
    es = extract_entities("Doliprane toutes les 6 heures")
    assert es
    assert "heures" in es[0].frequence


def test_phrase_hors_sujet_aucune_entite():
    # Aucune entité médicale ne doit être inventée.
    assert extract_entities("Quel est le sens de la vie ?") == []


def test_dedupe():
    es = extract_entities("Doliprane 1000 mg, Doliprane encore")
    meds = [e.medicament.lower() for e in es]
    assert len(meds) == len(set(meds))
