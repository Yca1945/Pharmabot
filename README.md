# Pharmabot

Agent conversationnel sécurisé (RAG) pour le suivi thérapeutique et la
pré-validation des commandes en officine. Projet de mémoire — Master Informatique.

Principe directeur : le LLM **n'est jamais une autorité médicale**. Il propose,
le pharmacien valide. Un garde-fou s'abstient quand aucun contexte fiable n'est
récupéré, et toute commande passe par une validation humaine avant délivrance.

## Architecture

Architecture découplée orientée services, orchestrée par Docker Compose :

```
Patient (Web/Mobile)
        │  HTTPS + token
        ▼
┌────────────────────┐   HTTP interne    ┌──────────────────────────┐
│  Backend Laravel   │ ───────────────▶  │  Microservice IA (FastAPI)│
│  (métier, auth,    │                   │  RAG + garde-fou + NER    │
│   MySQL, queues)   │ ◀─────────────── │                           │
└─────────┬──────────┘   réponse JSON    └────────────┬─────────────┘
          │                                           │
          ▼                                           ▼
     MySQL (données)                        ChromaDB (base vectorielle)
          │
          ▼
  Dashboard Pharmacien  ──▶  validation humaine OBLIGATOIRE avant délivrance
```

## Structure du dépôt

```
Phabot/
├── ia-service/         Microservice IA (FastAPI) : RAG, NER, évaluation
│   ├── app/            pipeline (rag, ner, vector_store, llm_client)
│   ├── eval/           harness d'évaluation RAGAS (Mois 5)
│   ├── scripts/        seed_demo, test_ner
│   └── tests/          pytest (ner, métriques)
├── backend/            API Laravel : auth, pré-commandes, notifications, rappels
│   ├── app/            Enums, Models, Controllers, Services, Notifications
│   ├── database/       migrations, seeder
│   └── tests/          Feature + Unit
├── frontend/           SPA React (Vite) : patient + pharmacien
├── docs/               UML, architecture, évaluation, tests E2E
└── docker-compose.yml  6 services (mysql, backend, ia-service, queue, scheduler, frontend)
```

## Couverture fonctionnelle

| Exigence | Fonction                                  | État |
|----------|-------------------------------------------|------|
| RF-01    | Comptes + rôles (ACL Sanctum)             | ✅   |
| RF-02    | Interface conversationnelle               | ✅   |
| RF-03    | Pipeline RAG médical + garde-fou          | ✅   |
| RF-04    | Initiation de pré-commande (NER)          | ✅   |
| RF-05    | Tableau de bord officine + validation     | ✅   |
| RF-06    | Notifications (email + in-app, en queue)  | ✅   |
| RF-07    | Suivi thérapeutique / rappels de prise    | ✅   |
| NER      | Backends interchangeables (spaCy / règles)| ✅   |

## Démarrage rapide

```bash
cp .env.example .env
docker compose up -d mysql ia-service
docker compose exec ia-service python -m scripts.seed_demo
docker compose up -d backend queue scheduler frontend   # http://localhost:5173
```

Détails d'installation Laravel : `backend/README.md`.
LLM de dev : Ollama (`ollama pull llama3.1:8b`) ou `LLM_BACKEND=openai`.

## Tests

```bash
# Microservice IA
cd ia-service && pip install -r requirements-dev.txt && NER_BACKEND=rules pytest

# Backend Laravel (après installation)
cd backend && php artisan test

# Frontend
cd frontend && npm run build
```

La CI (`.github/workflows/ci.yml`) exécute les tests IA, la vérification de
syntaxe PHP et le build front à chaque push.

## Évaluation (Mois 5)

```bash
docker compose exec ia-service python -m eval.evaluate_rag
```

Méthodologie complète : `docs/EVALUATION.md`.

## Documentation

- `docs/DIAGRAMMES.md` — UML (cas d'usage, séquences, classes, MCD, activité).
- `docs/ARCHITECTURE.md` — décisions techniques, schéma BDD, NER, roadmap.
- `docs/EVALUATION.md` — protocole et métriques d'évaluation RAG.
- `docs/RGPD.md` — chiffrement des données de santé, droits des personnes.
- `docs/TEST_E2E.md` — procédure de test bout-en-bout des trois couches.
