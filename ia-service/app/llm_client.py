"""Client LLM abstrait : Ollama (local) par défaut, OpenAI en option.

L'abstraction permet de changer de moteur sans toucher au pipeline RAG.
"""
from __future__ import annotations

import httpx

from .config import settings


def _build_messages(
    system_prompt: str,
    user_prompt: str,
    historique: list[dict] | None = None,
) -> list[dict]:
    """Construit la liste de messages pour l'API LLM.

    Structure : [system] + [user/assistant alternés] + [user courant]
    L'historique est inséré entre le prompt système et la question actuelle
    pour que le LLM dispose du contexte conversationnel sans perdre ses règles.
    """
    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    for tour in (historique or []):
        messages.append({"role": "user",      "content": tour["question"]})
        messages.append({"role": "assistant", "content": tour["reponse"]})
    messages.append({"role": "user", "content": user_prompt})
    return messages


async def generate(
    system_prompt: str,
    user_prompt: str,
    historique: list[dict] | None = None,
) -> str:
    if settings.llm_backend == "openai":
        return await _generate_openai(system_prompt, user_prompt, historique)
    return await _generate_ollama(system_prompt, user_prompt, historique)


async def _generate_ollama(
    system_prompt: str,
    user_prompt: str,
    historique: list[dict] | None = None,
) -> str:
    url = f"{settings.ollama_base_url}/api/chat"
    payload = {
        "model": settings.ollama_model,
        "messages": _build_messages(system_prompt, user_prompt, historique),
        "stream": False,
        "options": {"temperature": 0.0},  # déterministe = moins d'hallucination
        # Garde le modèle chargé 30 min pour éviter les démarrages à froid.
        "keep_alive": "30m",
    }
    # Timeout large : le tout premier appel charge le modèle en mémoire.
    async with httpx.AsyncClient(timeout=180) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        return r.json()["message"]["content"].strip()


async def _generate_openai(
    system_prompt: str,
    user_prompt: str,
    historique: list[dict] | None = None,
) -> str:
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
    payload = {
        "model": settings.openai_model,
        "messages": _build_messages(system_prompt, user_prompt, historique),
        "temperature": 0.0,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, json=payload, headers=headers)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()
