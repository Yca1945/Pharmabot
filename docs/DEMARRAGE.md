# Guide de démarrage — Pharmabot (Windows / WAMP)

Procédure complète pour lancer les trois couches et exécuter les tests.

## 0. Prérequis

- **Docker Desktop** (pour le microservice IA + MySQL)
- **PHP 8.3 + Composer** (WAMP fournit PHP ; installer Composer)
- **Node.js 20+** (front React)
- **Ollama** (LLM local) ou une clé **OpenAI**
- **Git**

```powershell
cd C:\wamp64\www\DevOps\Phabot
git init        # versionner avant de commencer
copy .env.example .env
```

---

## 1. Microservice IA (Docker)

```powershell
# Build + démarrage de la base vectorielle et de l'API IA
docker compose up -d mysql ia-service

# Indexer les fiches médicaments de démonstration
docker compose exec ia-service python -m scripts.seed_demo

# Vérifier
curl http://localhost:8001/health
```

LLM de développement (dans un autre terminal) :

```powershell
ollama pull llama3.1:8b
```

(ou bien, dans `.env` : `LLM_BACKEND=openai` + `OPENAI_API_KEY=...`)

Test rapide du pipeline RAG :

```powershell
curl -X POST http://localhost:8001/chat -H "Content-Type: application/json" -d "{\"message\":\"Posologie du Doliprane 1000 ?\"}"
```

---

## 2. Backend Laravel

Le dépôt fournit le **code** (`app/`, `database/`, `routes/`, `bootstrap/app.php`,
`config/cors.php`, `tests/`). Il faut générer le **framework** autour.

```powershell
cd C:\wamp64\www\DevOps\Phabot

# 1. Mettre nos fichiers de côté
move backend backend-custom

# 2. Générer un Laravel neuf dans backend/
composer create-project laravel/laravel backend
cd backend

# 3. Activer l'API + Sanctum
composer require laravel/sanctum
php artisan install:api

# 4. Superposer notre code par-dessus le squelette (écrase les défauts)
cd ..
xcopy /E /I /Y backend-custom\* backend\
rmdir /S /Q backend-custom
```

Configurer `backend\.env` :

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307            # MySQL du conteneur Docker (évite le conflit WAMP 3306)
DB_DATABASE=phabot
DB_USERNAME=phabot
DB_PASSWORD=secret

IA_SERVICE_URL=http://localhost:8001
QUEUE_CONNECTION=database
MAIL_MAILER=log
```

> Astuce : pour utiliser plutôt le MySQL de WAMP (port 3306), mets `DB_PORT=3306`
> et crée la base `phabot` dans phpMyAdmin.

Migrations + données de démo, puis lancement :

```powershell
cd backend
php artisan migrate --seed
php artisan serve        # http://localhost:8000
```

Comptes créés : `admin@phabot.test`, `pharmacien@phabot.test`,
`patient@phabot.test` — mot de passe `password`.

### Workers (notifications + rappels)

Dans deux terminaux séparés (backend) :

```powershell
php artisan queue:work       # notifications (RF-06)
php artisan schedule:work    # rappels de prise (RF-07)
```

---

## 3. Frontend React

```powershell
cd C:\wamp64\www\DevOps\Phabot\frontend
copy .env.example .env       # VITE_API_URL=http://localhost:8000/api
npm install
npm run dev                  # http://localhost:5173
```

---

## 4. Scénario de test bout-en-bout

1. Ouvrir http://localhost:5173, se connecter en **patient**
   (`patient@phabot.test` / `password`).
2. Renseigner le **profil** (allergie « paracétamol » déjà en démo).
3. Poser une question (« posologie du Doliprane 1000 ? ») → réponse sourcée.
4. Cliquer « Préparer une pré-commande ».
5. Se déconnecter, se reconnecter en **pharmacien** → l'alerte allergie
   s'affiche → **valider** (le stock est contrôlé).
6. Onglet **Retraits** → « Marquer récupéré » (le stock décrémente).
7. Retour côté patient → notification + code de retrait + rappels générés.
8. Se connecter en **admin** (`admin@phabot.test`) → créer un pharmacien.

---

## 5. Exécuter les suites de tests

```powershell
# IA (Python)
cd ia-service
pip install -r requirements-dev.txt
set NER_BACKEND=rules
pytest

# Backend (Laravel)
cd ..\backend
php artisan test

# Frontend (build de contrôle)
cd ..\frontend
npm run build
```

---

## Dépannage

| Symptôme                         | Cause / solution                                  |
|----------------------------------|---------------------------------------------------|
| `curl /health` échoue            | conteneur IA pas prêt — `docker compose ps`       |
| Chat renvoie « indisponible »    | Ollama non lancé / modèle non téléchargé          |
| Erreur CORS dans le navigateur   | vérifier `backend/config/cors.php` (origine 5173) |
| `migrate` refuse la connexion    | MySQL pas prêt / mauvais `DB_PORT`                |
| Notifications/rappels muets      | lancer `queue:work` et `schedule:work`            |

Voir aussi `docs/TEST_E2E.md` (vérifications par couche) et `README.md`.
