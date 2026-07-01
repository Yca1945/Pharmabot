<?php

/*
 * Configuration CORS pour Pharmabot.
 * Le front React (Vite) tourne sur http://localhost:5173 et consomme l'API
 * en mode token (Bearer Sanctum) — pas besoin de cookies stateful ici.
 */

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // false en mode token ; passer à true uniquement si vous utilisez
    // l'auth par cookie SPA de Sanctum.
    'supports_credentials' => false,

];
