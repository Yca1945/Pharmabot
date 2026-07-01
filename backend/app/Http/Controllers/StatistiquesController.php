<?php

namespace App\Http\Controllers;

use App\Models\DiscussionLog;
use App\Models\Medicament;
use App\Models\PreCommande;
use App\Enums\Statut;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Statistiques globales pour le dashboard pharmacien (RF-05 étendu).
 * Toutes les requêtes sont agrégées côté base — pas de chargement de masse.
 */
class StatistiquesController extends Controller
{
    public function __invoke(): JsonResponse
    {
        // --- Commandes ---
        $commandesParStatut = PreCommande::select('statut', DB::raw('count(*) as total'))
            ->groupBy('statut')
            ->pluck('total', 'statut');

        // Commandes par semaine (8 dernières semaines)
        $commandesParSemaine = PreCommande::select(
                DB::raw('YEARWEEK(created_at, 1) as semaine'),
                DB::raw('count(*) as total')
            )
            ->where('created_at', '>=', now()->subWeeks(8))
            ->groupBy('semaine')
            ->orderBy('semaine')
            ->get();

        // Top 5 médicaments les plus commandés
        $topMedicaments = DB::table('ligne_commandes')
            ->join('medicaments', 'ligne_commandes.medicament_id', '=', 'medicaments.id')
            ->select('medicaments.designation', DB::raw('sum(ligne_commandes.quantite_demandee) as total'))
            ->groupBy('medicaments.id', 'medicaments.designation')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        // --- Chatbot ---
        $totalMessages   = DiscussionLog::count();
        $tauxAbstention  = $totalMessages > 0
            ? round(DiscussionLog::where('abstention', true)->count() / $totalMessages * 100, 1)
            : 0;
        $fideliteMoyenne = DiscussionLog::whereNotNull('fidelite_estimee')
            ->avg('fidelite_estimee');

        // Feedback patient
        $feedbackPositif = DiscussionLog::where('feedback', 1)->count();
        $feedbackNegatif = DiscussionLog::where('feedback', -1)->count();

        // --- Stock ---
        $stockBas = Medicament::where('quantite_stock', '<=', 5)->count();

        return response()->json([
            'commandes' => [
                'par_statut'     => $commandesParStatut,
                'par_semaine'    => $commandesParSemaine,
                'top_medicaments'=> $topMedicaments,
            ],
            'chatbot' => [
                'total_messages'   => $totalMessages,
                'taux_abstention'  => $tauxAbstention,
                'fidelite_moyenne' => $fideliteMoyenne ? round($fideliteMoyenne, 3) : null,
                'feedback_positif' => $feedbackPositif,
                'feedback_negatif' => $feedbackNegatif,
            ],
            'stock' => [
                'medicaments_bas' => $stockBas,
            ],
        ]);
    }
}
