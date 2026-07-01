"""Tests du formateur de logs JSON et de l'identifiant de corrélation."""
import json
import logging

from app.logging_config import JsonFormatter, request_id_var


def _record(msg, data=None):
    rec = logging.LogRecord("pharmabot.test", logging.INFO, __file__, 1, msg, None, None)
    if data is not None:
        rec.data = data
    return rec


def test_format_json_basique():
    out = JsonFormatter().format(_record("hello"))
    payload = json.loads(out)
    assert payload["level"] == "INFO"
    assert payload["message"] == "hello"
    assert payload["logger"] == "pharmabot.test"
    assert "request_id" in payload


def test_request_id_propage_dans_le_log():
    token = request_id_var.set("abc123")
    try:
        payload = json.loads(JsonFormatter().format(_record("x")))
        assert payload["request_id"] == "abc123"
    finally:
        request_id_var.reset(token)


def test_donnees_structurees():
    payload = json.loads(JsonFormatter().format(_record("retrieval", {"n_hits": 3, "best_sim": 0.82})))
    assert payload["data"]["n_hits"] == 3
    assert payload["data"]["best_sim"] == 0.82
