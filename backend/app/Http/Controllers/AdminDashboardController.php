<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\DiscussionLog;
use App\Models\Medicament;
use App\Models\PreCommande;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Tableau de bord administrateur : KPIs globaux de la plateforme.
 */
class AdminDashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        // --- Utilisateurs ---
        $usersParRole = User::select('role', DB::raw('count(*) as total'))
            ->groupBy('role')
            ->pluck('total', 'role');

        $nouveauxCeMois = User::where('created_at', '>=', now()->startOfMonth())->count();
        $nouveauxSemaineDerniere = User::where('created_at', '>=', now()->subWeek())->count();

        // Inscriptions par jour (30 derniers jours)
        $inscriptionsParJour = User::select(
                DB::raw('DATE(created_at) as jour'),
                DB::raw('count(*) as total')
            )
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('jour')
            ->orderBy('jour')
            ->get();

        // --- Commandes ---
        $commandesParStatut = PreCommande::select('statut', DB::raw('count(*) as total'))
            ->groupBy('statut')
            ->pluck('total', 'statut');

        $commandesCeMois = PreCommande::where('created_at', '>=', now()->startOfMonth())->count();

        // Taux de validation
        $totalCommandes = PreCommande::count();
        $validees = PreCommande::where('statut', 'valide')->count();
        $rejetees = PreCommande::where('statut', 'rejete')->count();
        $tauxValidation = $totalCommandes > 0 ? round($validees / $totalCommandes * 100, 1) : 0;

        // --- Chatbot ---
        $totalMessages = DiscussionLog::count();
        $messagesCeMois = DiscussionLog::where('created_at', '>=', now()->startOfMonth())->count();
        $tauxAbstention = $totalMessages > 0
            ? round(DiscussionLog::where('abstention', true)->count() / $totalMessages * 100, 1)
            : 0;

        $feedbackPositif = DiscussionLog::where('feedback', 1)->count();
        $feedbackNegatif = DiscussionLog::where('feedback', -1)->count();
        $totalFeedback = $feedbackPositif + $feedbackNegatif;
        $scoreSatisfaction = $totalFeedback > 0
            ? round($feedbackPositif / $totalFeedback * 100, 1)
            : null;

        // Messages par jour (30 derniers jours)
        $messagesParJour = DiscussionLog::select(
                DB::raw('DATE(created_at) as jour'),
                DB::raw('count(*) as total')
            )
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('jour')
            ->orderBy('jour')
            ->get();

        // --- Catalogue ---
        $totalMedicaments = Medicament::count();
        $stockBas = Medicament::where('quantite_stock', '<=', 5)->count();
        $ruptures = Medicament::where('quantite_stock', 0)->count();

        // --- Audit (activité récente) ---
        $derniersAudit = AuditLog::with('user:id,name')
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'utilisateurs' => [
                'par_role'             => $usersParRole,
                'total'                => $usersParRole->sum(),
                'nouveaux_ce_mois'     => $nouveauxCeMois,
                'nouveaux_cette_semaine' => $nouveauxSemaineDerniere,
                'inscriptions_par_jour'=> $inscriptionsParJour,
            ],
            'commandes' => [
                'par_statut'      => $commandesParStatut,
                'total'           => $totalCommandes,
                'ce_mois'         => $commandesCeMois,
                'taux_validation' => $tauxValidation,
                'validees'        => $validees,
                'rejetees'        => $rejetees,
            ],
            'chatbot' => [
                'total_messages'    => $totalMessages,
                'messages_ce_mois'  => $messagesCeMois,
                'taux_abstention'   => $tauxAbstention,
                'feedback_positif'  => $feedbackPositif,
                'feedback_negatif'  => $feedbackNegatif,
                'score_satisfaction'=> $scoreSatisfaction,
                'messages_par_jour' => $messagesParJour,
            ],
            'catalogue' => [
                'total_medicaments' => $totalMedicaments,
                'stock_bas'         => $stockBas,
                'ruptures'          => $ruptures,
            ],
            'audit_recent' => $derniersAudit,
        ]);
    }
}
