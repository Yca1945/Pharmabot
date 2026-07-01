"""Middleware de corrélation : lit/génère X-Request-Id, journalise chaque requête."""
from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from .logging_config import request_id_var

logger = logging.getLogger("pharmabot.http")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("X-Request-Id") or uuid.uuid4().hex[:16]
        token = request_id_var.set(rid)
        start = time.perf_counter()
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            response.headers["X-Request-Id"] = rid
            return response
        finally:
            duree = round((time.perf_counter() - start) * 1000, 1)
            logger.info(
                "request",
                extra={"data": {
                    "method": request.method,
                    "path": request.url.path,
                    "status": status,
                    "duration_ms": duree,
                }},
            )
            request_id_var.reset(token)
