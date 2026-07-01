# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Démarrage rapide

```bash
# Premier démarrage
cp .env.example .env
docker compose up -d mysql ia-service
docker compose exec ia-service python -m scripts.seed_demo   # catalogue démo + ChromaDB
docker compose up -d backend queue scheduler frontend        # http://localhost:5173

# LLM local : Ollama requis sur l'hôte
ollama pull llama3.1:8b
# Ou cloud : LLM_BACKEND=openai OPENAI_API_KEY=sk-... dans .env
```

## Tests

```bash
# Microservice IA (depuis la racine du projet)
cd ia-service && pip install -r requirements-dev.txt
NER_BACKEND=rules pytest                    # tous les tests
NER_BACKEND=rules pytest tests/test_ner.py  # un fichier précis

# Backend Laravel
cd backend && php artisan test
php artisan test --filter PreCommandeFlowTest   # un test précis

# Frontend (vérification build uniquement — pas de tests unitaires)
cd frontend && npm run build
```

## Architecture

**3 processus principaux + 3 workers**, tous orchestrés par `docker-compose.yml` :

| Conteneur | Port | Rôle |
|---|---|---|
| `phabot_backend` | 8000 | Laravel 13 — auth, métier, persistance MySQL |
| `phabot_ia` | 8001 | FastAPI — pipeline RAG, NER, ChromaDB |
| `phabot_frontend` | 5173 | React 18 / Vite — SPA patient + pharmacien |
| `phabot_queue` | — | Laravel queue worker — notifications async |
| `phabot_scheduler` | — | Laravel schedule:work — rappels thérapeutiques |
| `phabot_mysql` | 3307 | MySQL 8.0 (3307 sur l'hôte pour éviter le conflit WAMP) |

### Principe directeur

Le LLM n'est jamais une autorité médicale. Architecture volontairement découplée :

- **Laravel** = côté déterministe et réglementé (droits, persistance, validation humaine)
- **FastAPI** = côté probabiliste (RAG, LLM, NER) — jamais décisionnaire

Le microservice IA est **interne** (réseau Docker `phabot_net`). Laravel l'atteint via `IaClient` (`app/Services/IaClient.php`). Jamais exposé directement au frontend.

### Pipeline RAG (cœur scientifique)

`ia-service/app/rag.py` — flux `answer()` :
1. ChromaDB retrieval (similarité cosinus, top-K)
2. **Garde-fou** : `best_sim < settings.min_similarity` (0.35) → abstention, pas de LLM
3. LLM Ollama/OpenAI avec `temperature=0` + prompt contraint
4. Retourne `{reponse, sources, entites, abstention, fidelite_estimee}`

### NER sans LLM

`ia-service/app/ner.py` — deux backends interchangeables via `NER_BACKEND` :
- `rules` : gazetteer (noms du catalogue) + regex dosage/fréquence — toujours disponible
- `spacy` : `fr_core_news_sm` + EntityRuler seedé depuis le catalogue — auto-fallback vers `rules` si absent

Le gazetteer est chargé depuis ChromaDB via `@lru_cache` au premier appel.

### Catalogue ↔ base vectorielle (sync bidirectionnelle)

Quand un pharmacien crée/modifie/supprime un médicament :
- `MedicamentController` → `CatalogueSync::indexer()` / `retirer()`
- `CatalogueSync` appelle `IaClient::ingest()` / `remove()`
- ChromaDB mis à jour → le gazetteer NER se rafraîchit au prochain appel

### Sécurité & RGPD

- Chiffrement AES transparent (cast `encrypted` Laravel) sur `ProfilMedical.allergies`, `ProfilMedical.antecedents`, `DiscussionLog.message_utilisateur`, `DiscussionLog.reponse_ia`
- Auth : Sanctum (tokens stateless), throttle 6/min sur auth, 20/min sur chat
- ACL par middleware `role:pharmacien` / `role:admin` (alias dans `bootstrap/app.php`)
- Toutes les pré-commandes passent par validation humaine pharmacien avant délivrance

### Modèles de données clés

```
User (role: patient|pharmacien|admin)
  └─ ProfilMedical (allergies, antecedents — chiffré)
  └─ PreCommande (statut: en_attente|valide|rejete|recupere)
       └─ LigneCommande (medicament_id, quantite_demandee, posologie_extraite)
  └─ DiscussionLog (message_utilisateur, reponse_ia — chiffrés, fidelite_estimee, abstention)
  └─ Rappel (libelle, heures: json, actif)

Medicament (designation, prix en FCFA, quantite_stock, description_technique)
```

### Routes principales

Toutes les routes sont dans `backend/routes/api.php` :
- `POST /api/chat` — conversation RAG (throttle 20/min)
- `POST /api/pre-commandes/depuis-chat` — NER + création pré-commande
- `prefix /api/officine` — dashboard pharmacien (middleware `role:pharmacien`)
- `prefix /api/admin` — gestion utilisateurs (middleware `role:admin`)

### Frontend

SPA React avec `AuthContext` (token en `localStorage`). Pages principales :
- `/chat` — patient : interface conversationnelle
- `/mes-commandes` — patient : suivi pré-commandes
- `/officine` — pharmacien : validation commandes
- `/catalogue` — pharmacien : gestion catalogue médicaments
- `/admin/users` — admin : gestion comptes

## Variables d'environnement importantes

| Variable | Valeur par défaut | Description |
|---|---|---|
| `LLM_BACKEND` | `ollama` | `ollama` (local) ou `openai` |
| `OLLAMA_MODEL` | `llama3.1:8b` | Modèle Ollama |
| `NER_BACKEND` | `spacy` | `spacy` ou `rules` |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Modèle sentence-transformers |
| `IA_SERVICE_URL` | `http://ia-service:8001` | URL interne du microservice |

## Commandes utiles Laravel

```bash
docker compose exec backend php artisan migrate          # migrations
docker compose exec backend php artisan migrate:fresh --seed  # reset + seed démo
docker compose exec backend php artisan queue:work       # worker manuel
docker compose exec backend php artisan rappels:envoyer  # déclencher rappels manuellement
```

## Évaluation RAGAS

```bash
docker compose exec ia-service python -m eval.evaluate_rag
```

Le dataset de test est dans `ia-service/eval/dataset.json`. Métriques dans `ia-service/eval/metrics.py` : `faithfulness_heuristique`, `answer_relevance_heuristique`.
