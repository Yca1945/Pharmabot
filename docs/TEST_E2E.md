# Test bout-en-bout — Pharmabot

Procédure pour lancer et valider les trois services ensemble sur ta machine.

## 0. Prérequis

- Docker Desktop démarré.
- Ollama installé avec un modèle : `ollama pull llama3.1:8b`
  (ou basculer `LLM_BACKEND=openai` dans `.env`).
- Laravel généré dans `backend/` (voir `backend/README.md`).

## 1. Démarrer la stack

```bash
cp .env.example .env

docker compose up -d mysql ia-service
docker compose exec ia-service python -m scripts.seed_demo   # indexe les fiches

# Backend (après composer install + install:api + migrate --seed)
docker compose up -d backend

# Frontend
docker compose up -d frontend     # http://localhost:5173
```

## 2. Vérifications par couche

### Microservice IA (port 8001)

```bash
curl http://localhost:8001/health
# -> {"status":"ok","documents_indexes":3}

curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Posologie du Doliprane 1000 ?"}'
# -> réponse sourcée, abstention=false

curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Quel est le sens de la vie ?"}'
# -> abstention=true (garde-fou : hors périmètre médical)

curl -X POST http://localhost:8001/extract \
  -H "Content-Type: application/json" \
  -d '{"message":"Doliprane 1000 mg 3 fois par jour"}'
# -> [{"medicament":"Doliprane","dosage":"1000 mg","frequence":"3 fois par jour"}]

# Démonstration du NER (compare les phrases types) :
docker compose exec ia-service python -m scripts.test_ner
# Basculer de backend : NER_BACKEND=rules ou spacy (dans .env)
```

### API Laravel (port 8000)

```bash
# Connexion patient (compte du seeder)
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@phabot.test","password":"password"}'
# -> { user, token }

TOKEN=...   # copier le token renvoyé

# Chat via Laravel (journalise dans discussion_logs)
curl -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"message":"Posologie du Doliprane 1000 ?"}'

# Créer une pré-commande depuis un message
curl -X POST http://localhost:8000/api/pre-commandes/depuis-chat \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"message":"Il me faut du Doliprane 1000"}'
# -> 201 { pre_commande: {...}, non_trouves: [] }
```

### Scénario complet (front)

1. Ouvrir http://localhost:5173, se connecter en **patient**.
2. Demander une info médicament → vérifier réponse + sources + score.
3. Cliquer « Préparer une pré-commande » → confirmation #id.
4. Se déconnecter, se reconnecter en **pharmacien**
   (`pharmacien@phabot.test`).
5. Tableau de bord → la pré-commande apparaît → **Valider**.
6. Revenir côté patient → la commande affiche le **code de retrait**.

## 2 bis. Notifications (RF-06)

Prérequis dans `backend/.env` :

```
QUEUE_CONNECTION=database
MAIL_MAILER=log        # en dev, les emails partent dans storage/logs/laravel.log
```

Le worker doit tourner pour traiter les jobs :

```bash
docker compose up -d queue          # service php artisan queue:work
```

Scénario :

1. Patient crée une pré-commande (voir §scénario complet).
2. Pharmacien la **valide** → un job est mis en file.
3. Le worker l'exécute : email (log) + notification in-app stockée.
4. Côté patient, le badge **Notifications** s'incrémente ; la page liste
   le message « Commande n°X validée — prête au retrait » avec le code.

Vérification API :

```bash
curl http://localhost:8000/api/notifications \
  -H "Authorization: Bearer $TOKEN"
# -> { non_lues: 1, notifications: [ { data: { type: "pre_commande_validee", ... } } ] }
```

Vérifier l'email simulé :

```bash
docker compose exec backend tail -n 40 storage/logs/laravel.log
```

## 2 ter. Rappels de prise (RF-07)

À la **validation** d'une pré-commande, un rappel est créé par médicament,
avec des horaires déduits de la posologie (ex. « 3 fois par jour » →
08:00 / 14:00 / 20:00).

Le scheduler doit tourner :

```bash
docker compose up -d scheduler      # php artisan schedule:work
```

Vérifications :

```bash
# Lister ses rappels (patient)
curl http://localhost:8000/api/rappels -H "Authorization: Bearer $TOKEN"

# Déclencher manuellement l'envoi (sans attendre l'heure)
docker compose exec backend php artisan rappels:envoyer
```

Côté front : page **Rappels** (patient) — activer/mettre en pause/supprimer.
Quand l'heure d'un rappel arrive, une notification in-app + email (log) part
via le worker `queue`.

## 3. Points de contrôle

| Vérification                                  | Attendu                          |
|-----------------------------------------------|----------------------------------|
| Garde-fou hors-sujet                          | `abstention: true`               |
| Réponse médicale                              | sources non vides, fidélité > 0  |
| Création pré-commande                         | statut `en_attente`              |
| Validation pharmacien                         | statut `valide` + code           |
| Notification après validation (worker actif)  | badge +1, email dans les logs    |
| Accès patient au dashboard officine           | 403 (rôle insuffisant)           |
| Token absent / invalide                       | 401 + redirection login (front)  |

## Dépannage

- **CORS bloqué** : vérifier `backend/config/cors.php` (origine 5173).
- **IA timeout** : Ollama lent au 1ᵉʳ appel (chargement du modèle) ; relancer.
- **MySQL refus** : attendre le healthcheck (`docker compose ps`).
