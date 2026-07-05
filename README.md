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

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (héberge MySQL, le backend, le microservice IA, les workers et le frontend)
- [Ollama](https://ollama.com/) installé sur la machine hôte (fournit le LLM local, en dehors de Docker) — ou une clé API OpenAI en alternative
- Git

## Installation

```bash
# 1. Cloner le dépôt
git clone <url-du-depot>
cd Phabot

# 2. Config d'environnement
cp .env.example .env

# 3. Base de données + microservice IA
docker compose up -d mysql ia-service

# 4. Indexer le catalogue démo dans ChromaDB
docker compose exec ia-service python -m scripts.seed_demo

# 5. Backend + workers + frontend
docker compose up -d backend queue scheduler frontend
```

Le LLM (obligatoire, hors Docker), dans un terminal séparé sur la machine hôte :

```bash
ollama pull llama3.1:8b
```

Ollama doit tourner en arrière-plan. Alternative sans Ollama, dans `.env` :

```
LLM_BACKEND=openai
OPENAI_API_KEY=sk-...
```

Vérifier que les 6 conteneurs sont `Up` : `docker compose ps`.

Détails d'installation Laravel : `backend/README.md`.
Guide pas-à-pas complet et dépannage : `docs/COMMANDES.md` et `docs/DEMARRAGE.md`.

## Utilisation

| Service | URL |
|---|---|
| Application (frontend) | http://localhost:5173 |
| API backend | http://localhost:8000 |
| Microservice IA (interne, pas d'accès navigateur direct) | http://localhost:8001 |

Comptes de démonstration créés par le seeder (`docker compose exec backend php artisan migrate:fresh --seed`) :

| Rôle | Email | Mot de passe |
|---|---|---|
| Patient | `patient@phabot.test` | `password` |
| Pharmacien | `pharmacien@phabot.test` | `password` |
| Admin | `admin@phabot.test` | `password` |

- Un **patient** se connecte, discute avec l'assistant (`/chat`), initie une pré-commande, suit ses commandes et ses rappels.
- Un **pharmacien** valide/rejette les pré-commandes (`/officine`) et gère le catalogue (`/catalogue`).
- Un **admin** gère les comptes utilisateurs (`/admin/users`).

Pour les redémarrages suivants (config déjà faite) : `docker compose up -d`. Pour arrêter : `docker compose down`.

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

## Dépannage rapide

| Symptôme | Solution |
|---|---|
| Changement frontend invisible dans le navigateur | `docker compose restart frontend` (souci de hot-reload connu sur bind mount Windows) |
| Changement backend lent à apparaître | `docker compose restart backend` |
| Chat renvoie « indisponible » | Ollama non lancé ou modèle non téléchargé |
| Un conteneur n'est pas `Up` | voir les logs avec `docker compose logs <service>` |

## Documentation

- `docs/DEMARRAGE.md` — guide d'installation pas à pas.
- `docs/COMMANDES.md` — aide-mémoire des commandes courantes.
- `docs/DIAGRAMMES.md` — UML (cas d'usage, séquences, classes, MCD, activité).
- `docs/ARCHITECTURE.md` — décisions techniques, schéma BDD, NER, roadmap.
- `docs/EVALUATION.md` — protocole et métriques d'évaluation RAG.
- `docs/RGPD.md` — chiffrement des données de santé, droits des personnes.
- `docs/OBSERVABILITE.md` — logs, monitoring.
- `docs/TEST_E2E.md` — procédure de test bout-en-bout des trois couches.
