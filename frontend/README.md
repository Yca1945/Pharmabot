# Frontend React — Pharmabot

SPA React (Vite) découplée, consommant l'API Laravel via tokens Sanctum.
Deux espaces selon le rôle : **patient** (chat + commandes) et **pharmacien**
(tableau de bord de validation).

## Démarrage

```bash
cd frontend
cp .env.example .env      # ajuster VITE_API_URL si besoin
npm install
npm run dev               # http://localhost:5173
```

L'API Laravel doit tourner (par défaut `http://localhost:8000/api`).

## Comptes de démonstration (via le seeder backend)

- Pharmacien : `pharmacien@phabot.test` / `password`
- Patient : `patient@phabot.test` / `password`

## Structure

```
src/
  api/client.js          Axios + injection du token + déconnexion auto sur 401
  auth/AuthContext.jsx   État d'authentification (login/register/logout)
  components/            Layout (navbar) + ProtectedRoute (garde par rôle)
  pages/
    Login.jsx, Register.jsx
    Chat.jsx             Assistant conversationnel (affiche sources + garde-fou)
    MesCommandes.jsx     Suivi des pré-commandes patient
    Officine.jsx         Dashboard pharmacien : valider / rejeter
```

## Note CORS

Le backend doit autoriser l'origine du front. Dans `config/cors.php` (Laravel),
veiller à inclure `http://localhost:5173` et activer Sanctum stateful si besoin.
En mode token (Bearer) — celui utilisé ici — il suffit d'autoriser l'origine sur
les routes `api/*`.
