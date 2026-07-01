<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Journalise chaque requête API (méthode, chemin, statut, durée, utilisateur).
 * Le request_id est ajouté automatiquement via Context (voir RequestId).
 */
class LogRequests
{
    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        $duree = defined('LARAVEL_START')
            ? round((microtime(true) - LARAVEL_START) * 1000, 1)
            : null;

        Log::info('api.request', [
            'method' => $request->method(),
            'path' => $request->path(),
            'status' => $response->getStatusCode(),
            'user_id' => optional($request->user())->id,
            'duration_ms' => $duree,
        ]);
    }
}
