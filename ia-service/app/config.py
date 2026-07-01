"""Configuration centralisée du microservice IA (chargée depuis l'environnement)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Base vectorielle
    chroma_persist_dir: str = "data/chroma"
    collection_name: str = "fiches_medicaments"

    # Embeddings
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Récupération (retrieval)
    top_k: int = 4
    # Seuil de similarité minimal : en-dessous, on considère qu'AUCUN
    # contexte fiable n'a été trouvé -> garde anti-hallucination.
    min_similarity: float = 0.35

    # NER (reconnaissance d'entites)
    ner_backend: str = "spacy"           # "spacy" | "rules"
    spacy_model: str = "fr_core_news_sm"

    # LLM
    llm_backend: str = "ollama"          # "ollama" | "openai"
    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "llama3.1:8b"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"


settings = Settings()
