<?php

use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\LogRequests;
use App\Http\Middleware\RequestId;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Alias du middleware de contrôle de rôle (ACL — RF-01).
        $middleware->alias([
            'role' => EnsureRole::class,
        ]);

        // Observabilité : corrélation + journalisation de chaque requête API.
        $middleware->api(append: [
            RequestId::class,
            LogRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Réponses d'erreur JSON homogènes pour l'API.
        $exceptions->render(function (\Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null; // comportement par défaut hors API
            }

            return match (true) {
                $e instanceof ValidationException => response()->json([
                    'message' => 'Données invalides.',
                    'errors' => $e->errors(),
                ], 422),
                $e instanceof AuthenticationException => response()->json([
                    'message' => 'Non authentifié.',
                ], 401),
                $e instanceof AuthorizationException => response()->json([
                    'message' => 'Accès refusé.',
                ], 403),
                $e instanceof ModelNotFoundException => response()->json([
                    'message' => 'Ressource introuvable.',
                ], 404),
                $e instanceof HttpExceptionInterface => response()->json([
                    'message' => $e->getMessage() ?: 'Erreur.',
                ], $e->getStatusCode()),
                default => null, // laisse Laravel gérer (500 + log)
            };
        });
    })->create();
