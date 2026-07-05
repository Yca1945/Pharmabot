<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\AuditController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\CompteController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MedicamentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrdonnanceController;
use App\Http\Controllers\PreCommandeController;
use App\Http\Controllers\ProfilController;
use App\Http\Controllers\RappelController;
use App\Http\Controllers\StatistiquesController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes API Pharmabot
|--------------------------------------------------------------------------
| Le middleware 'role' est enregistré dans bootstrap/app.php :
|   $middleware->alias(['role' => \App\Http\Middleware\EnsureRole::class]);
*/

// --- Public ---
Route::get('/health', HealthController::class);

// Anti-bruteforce : 6 tentatives/minute par IP sur l'authentification.
Route::middleware('throttle:6,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

// --- Authentifié (Sanctum) ---
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Conversation patient (limite anti-abus : 20 messages/minute)
    Route::post('/chat', [ChatController::class, 'chat'])->middleware('throttle:20,1');
    Route::get('/chat/historique', [ChatController::class, 'historique']);
    Route::post('/chat/{log}/feedback', [FeedbackController::class, 'store']);

    // Notifications (in-app)
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/lu', [NotificationController::class, 'marquerLu']);
    Route::post('/notifications/lire-tout', [NotificationController::class, 'marquerToutLu']);

    // Rappels de prise (suivi thérapeutique)
    Route::get('/rappels', [RappelController::class, 'index']);
    Route::post('/rappels/{rappel}/basculer', [RappelController::class, 'basculer']);
    Route::delete('/rappels/{rappel}', [RappelController::class, 'destroy']);

    // Profil médical du patient
    Route::get('/profil', [ProfilController::class, 'show']);
    Route::put('/profil', [ProfilController::class, 'update']);

    // Droits RGPD : portabilité et effacement du compte
    Route::get('/compte/export', [CompteController::class, 'export']);
    Route::delete('/compte', [CompteController::class, 'destroy']);

    // Catalogue : lecture pour tout utilisateur authentifié
    Route::get('/medicaments', [MedicamentController::class, 'index']);

    // Pré-commandes patient
    Route::get('/pre-commandes', [PreCommandeController::class, 'index']);
    Route::post('/pre-commandes', [PreCommandeController::class, 'store']);
    Route::post('/pre-commandes/depuis-chat', [PreCommandeController::class, 'depuisChat']);

    // Ordonnance jointe à une pré-commande (patient : envoi ; patient/pharmacien : consultation)
    Route::post('/pre-commandes/{preCommande}/ordonnance', [OrdonnanceController::class, 'store']);
    Route::get('/pre-commandes/{preCommande}/ordonnance', [OrdonnanceController::class, 'show']);

    // --- Tableau de bord pharmacien ---
    Route::middleware('role:pharmacien')->prefix('officine')->group(function () {
        Route::get('/statistiques', StatistiquesController::class);
        Route::get('/historique', AuditController::class);
        Route::get('/pre-commandes', [DashboardController::class, 'enAttente']);
        Route::get('/pre-commandes/validees', [DashboardController::class, 'validees']);
        Route::post('/pre-commandes/{preCommande}/valider', [DashboardController::class, 'valider']);
        Route::post('/pre-commandes/{preCommande}/rejeter', [DashboardController::class, 'rejeter']);
        Route::post('/pre-commandes/{preCommande}/recuperer', [DashboardController::class, 'recuperer']);

        // Catalogue : écriture réservée au pharmacien
        Route::get('/medicaments/stock-bas', [MedicamentController::class, 'stockBas']);
        Route::post('/medicaments', [MedicamentController::class, 'store']);
        Route::put('/medicaments/{medicament}', [MedicamentController::class, 'update']);
        Route::delete('/medicaments/{medicament}', [MedicamentController::class, 'destroy']);
    });

    // --- Administration des comptes ---
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', AdminDashboardController::class);
        Route::get('/users', [AdminController::class, 'index']);
        Route::post('/users', [AdminController::class, 'store']);
        Route::put('/users/{user}', [AdminController::class, 'update']);
        Route::delete('/users/{user}', [AdminController::class, 'destroy']);
        Route::get('/audit', AuditController::class);
    });
});
