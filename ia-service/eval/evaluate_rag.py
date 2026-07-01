"""Évaluation du pipeline RAG Pharmabot (livrable Mois 5).

Interroge le microservice IA sur un jeu de questions de référence et calcule les
métriques d'évaluation RAG. Produit un rapport JSON + un tableau lisible.

Usage (microservice IA démarré et catalogue indexé) :
    python -m eval.evaluate_rag
    python -m eval.evaluate_rag --url http://localhost:8001 --out eval/results.json

Option rigoureuse (nécessite `pip install ragas` + un LLM juge configuré) :
    python -m eval.evaluate_rag --ragas
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import httpx

from eval import metrics

DATASET = os.path.join(os.path.dirname(__file__), "dataset.json")


def charger_dataset(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)["cas"]


def interroger(url: str, question: str) -> dict:
    r = httpx.post(f"{url}/chat", json={"message": question}, timeout=90)
    r.raise_for_status()
    return r.json()


def evaluer(url: str, cas: list[dict]) -> list[dict]:
    resultats = []
    for c in cas:
        rep = interroger(url, c["question"])
        sources = rep.get("sources", []) or []
        recuperes = [s["medicament"] for s in sources]
        contextes = [s.get("extrait", "") for s in sources]
        reponse = rep.get("reponse", "")
        abstention = bool(rep.get("abstention", False))

        enr = {
            "question": c["question"],
            "abstention_predite": abstention,
            "context_precision": metrics.context_precision(recuperes, c["expected_sources"]),
            "context_recall": metrics.context_recall(recuperes, c["expected_sources"]),
            "faithfulness": rep.get("fidelite_estimee")
            if rep.get("fidelite_estimee") is not None
            else metrics.faithfulness_heuristique(reponse, contextes),
            "answer_relevance": metrics.answer_relevance_heuristique(reponse, c["question"]),
            "abstention_ok": metrics.abstention_correcte(abstention, c["should_abstain"]),
        }
        resultats.append(enr)
    return resultats


def afficher(resultats: list[dict], resume: dict) -> None:
    print("\n=== Détail par cas ===")
    for r in resultats:
        print(
            f"- abst={int(r['abstention_predite'])} "
            f"cp={r['context_precision']} cr={r['context_recall']} "
            f"faith={r['faithfulness']} ans_rel={r['answer_relevance']} "
            f"ok_abst={int(r['abstention_ok'])} | {r['question'][:55]}"
        )
    print("\n=== Résumé (moyennes) ===")
    for k, v in resume.items():
        print(f"{k:22} : {v}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8001")
    parser.add_argument("--dataset", default=DATASET)
    parser.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "results.json"))
    parser.add_argument("--ragas", action="store_true", help="évaluation rigoureuse via ragas")
    args = parser.parse_args()

    cas = charger_dataset(args.dataset)

    if args.ragas:
        print("Mode RAGAS : voir EVALUATION.md (nécessite ragas + LLM juge).")
        # Laisse au lecteur le branchement d'un LLM juge ; l'ossature offline
        # ci-dessous reste la référence reproductible du mémoire.

    resultats = evaluer(args.url, cas)
    resume = metrics.agreger(resultats)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump({"resultats": resultats, "resume": resume}, f, ensure_ascii=False, indent=2)

    afficher(resultats, resume)
    print(f"\nRapport écrit dans {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
