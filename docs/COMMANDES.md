# Commandes de démarrage — Pharmabot

Aide-mémoire rapide. Guide détaillé (installation complète) : `docs/DEMARRAGE.md`.

## Outils à lancer avant de commencer

| Outil | Pourquoi |
|---|---|
| **Docker Desktop** | héberge MySQL, le microservice IA, le backend, les workers et le frontend |
| **Ollama** (application native, hors Docker) | fournit le LLM local `llama3.1:8b` |

## Démarrage complet (première fois)

```bash
# 1. Se placer dans le projet
cd C:\wamp64\www\DevOps\Phabot

# 2. Config d'environnement
cp .env.example .env

# 3. Base de données + microservice IA
docker compose up -d mysql ia-service

# 4. Indexer le catalogue démo dans ChromaDB
docker compose exec ia-service python -m scripts.seed_demo

# 5. Backend + workers + frontend
docker compose up -d backend queue scheduler frontend
```

## Le LLM (obligatoire, en dehors de Docker)

Dans un terminal séparé, sur la machine hôte (pas dans un conteneur) :

```bash
ollama pull llama3.1:8b
```

Ollama doit tourner en arrière-plan (icône dans la barre système Windows).

Alternative sans Ollama — dans `.env` :
```
LLM_BACKEND=openai
OPENAI_API_KEY=sk-...
```

## Vérifier que tout tourne

```bash
docker compose ps
```

6 conteneurs doivent être `Up` : `phabot_mysql`, `phabot_backend`, `phabot_ia`,
`phabot_frontend`, `phabot_queue`, `phabot_scheduler`.

## Accès

| Service | URL |
|---|---|
| Application (frontend) | http://localhost:5173 |
| API backend | http://localhost:8000 |
| Microservice IA (interne, pas d'accès navigateur direct) | http://localhost:8001 |

## Comptes de test

| Rôle | Email | Mot de passe |
|---|---|---|
| Patient | `patient@phabot.test` | `password` |
| Pharmacien | `pharmacien@phabot.test` | `password` |
| Admin | `admin@phabot.test` | `password` |

## Redémarrages suivants (config déjà faite)

```bash
docker compose up -d
```

## Dépannage rapide

| Symptôme | Solution |
|---|---|
| Changement frontend invisible dans le navigateur | `docker compose restart frontend` (souci de hot-reload connu sur bind mount Windows) |
| Changement backend lent à apparaître | `docker compose restart backend` (OPcache `revalidate_freq=2`, effet en quelques secondes) |
| Chat renvoie « indisponible » | Ollama non lancé ou modèle non téléchargé |
| `docker compose ps` : conteneur pas `Up` | voir logs avec `docker compose logs <service>` |

## Arrêter l'application

```bash
docker compose down
```
