"""Tests des métriques d'évaluation (fonctions pures, déterministes)."""
from eval import metrics


def test_context_precision():
    assert metrics.context_precision(["Doliprane 1000 mg"], ["Doliprane 1000 mg"]) == 1.0
    assert metrics.context_precision(["A", "B"], ["A"]) == 0.5
    assert metrics.context_precision([], []) == 1.0
    assert metrics.context_precision([], ["A"]) == 0.0


def test_context_recall():
    assert metrics.context_recall(["A", "B"], ["A"]) == 1.0
    assert metrics.context_recall(["B"], ["A"]) == 0.0
    assert metrics.context_recall([], []) == 1.0


def test_faithfulness_heuristique():
    # Réponse entièrement contenue dans le contexte -> fidélité maximale.
    f = metrics.faithfulness_heuristique(
        "paracétamol antalgique", ["le paracétamol est un antalgique puissant"]
    )
    assert f == 1.0
    # Réponse sans rapport -> fidélité faible.
    assert metrics.faithfulness_heuristique("zèbre montagne", ["paracétamol antalgique"]) < 0.5


def test_answer_relevance():
    r = metrics.answer_relevance_heuristique(
        "La posologie du doliprane est simple", "Quelle posologie pour le doliprane ?"
    )
    assert r > 0.5


def test_abstention_correcte():
    assert metrics.abstention_correcte(True, True)
    assert metrics.abstention_correcte(False, False)
    assert not metrics.abstention_correcte(True, False)


def test_agreger():
    enr = [
        {"context_precision": 1.0, "context_recall": 1.0, "faithfulness": 0.8,
         "answer_relevance": 0.6, "abstention_ok": True},
        {"context_precision": 0.5, "context_recall": 0.5, "faithfulness": 0.4,
         "answer_relevance": 0.4, "abstention_ok": False},
    ]
    res = metrics.agreger(enr)
    assert res["n_cas"] == 2
    assert res["context_precision"] == 0.75
    assert res["abstention_accuracy"] == 0.5
