"""Logs structurés (JSON) + identifiant de corrélation.

Chaque ligne de log est un objet JSON incluant le `request_id` propagé depuis
Laravel (en-tête X-Request-Id), ce qui permet de suivre une requête de bout en
bout à travers les deux services.
"""
from __future__ import annotations

import json
import logging
import sys
from contextvars import ContextVar

# Identifiant de corrélation de la requête courante (par contexte async).
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "request_id": request_id_var.get(),
            "message": record.getMessage(),
        }
        # Données structurées additionnelles passées via extra={"data": {...}}.
        data = getattr(record, "data", None)
        if isinstance(data, dict):
            payload["data"] = data
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)
    # Aligne les loggers uvicorn sur le format JSON.
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        lg = logging.getLogger(name)
        lg.handlers = [handler]
        lg.propagate = False
