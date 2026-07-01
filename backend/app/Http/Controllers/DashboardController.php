<?php

namespace App\Http\Controllers;

use App\Enums\Statut;
use App\Http\Resources\PreCommandeResource;
use App\Models\PreCommande;
use App\Notifications\PreCommandeRejetee;
use App\Notifications\PreCommandeValidee;
use App\Services\AlerteService;
use App\Services\AuditLogger;
use App\Services\RappelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * Tableau de bord officine (RF-05). Réservé au rôle pharmacien.
 * C'est ici que s'exerce la VALIDATION HUMAINE obligatoire.
 */
class DashboardController extends Controller
{
    public function __construct(
        private readonly RappelService $rappels,
        private readonly AlerteService $alertes,
        private readonly AuditLogger $audit,
    ) {}

    public function enAttente(): AnonymousResourceCollection
    {
        $commandes = PreCommande::with(['lignes.medicament', 'patient.profilMedical'])
            ->where('statut', Statut::EnAttente)
            ->oldest()
            ->get();

        // Annote chaque commande des alertes de sécurité (allergies du patient).
        $commandes->each(function (PreCommande $c) {
            $medicaments = $c->lignes->map(fn ($l) => $l->medicament)->filter();
            $c->setAttribute(
                'alertes',
                $this->alertes->pourMedicaments($c->patient?->profilMedical, $medicaments)
            );
        });

        return PreCommandeResource::collection($commandes);
    }

    /** Pré-commandes validées en attente de retrait (Click & Collect). */
    public function validees(): AnonymousResourceCollection
    {
        $commandes = PreCommande::with(['lignes.medicament', 'patient:id,name,email'])
            ->where('statut', Statut::Valide)
            ->oldest()
            ->get();

        return PreCommandeResource::collection($commandes);
    }

    public function valider(Request $request, PreCommande $preCommande): JsonResponse
    {
        $preCommande->loadMissing('lignes.medicament');

        // Contrôle de disponibilité du stock avant validation.
        $insuffisants = $preCommande->lignes->filter(
            fn ($l) => ! $l->medicament || $l->medicament->quantite_stock < $l->quantite_demandee
        );
        if ($insuffisants->isNotEmpty()) {
            return response()->json([
                'message' => 'Stock insuffisant pour valider cette commande.',
                'lignes' => $insuffisants->map(fn ($l) => [
                    'medicament' => $l->medicament?->designation,
                    'demande' => $l->quantite_demandee,
                    'stock' => $l->medicament?->quantite_stock ?? 0,
                ])->values(),
            ], 422);
        }

        $preCommande->valider($request->user());

        $this->audit->log('pre_commande.valider', $preCommande, [], $request);

        // RF-06 : notification au patient (file d'attente, canaux mail + in-app)
        $preCommande->patient->notify(new PreCommandeValidee($preCommande));

        // RF-07 : génération automatique des rappels de prise
        $this->rappels->genererPourPreCommande($preCommande);

        return response()->json(new PreCommandeResource($preCommande->fresh('lignes.medicament')));
    }

    public function rejeter(Request $request, PreCommande $preCommande): JsonResponse
    {
        $data = $request->validate(['motif' => 'nullable|string|max:500']);

        $preCommande->rejeter($request->user(), $data['motif'] ?? null);

        $this->audit->log('pre_commande.rejeter', $preCommande, ['motif' => $data['motif'] ?? null], $request);

        // RF-06 : notification au patient
        $preCommande->patient->notify(new PreCommandeRejetee($preCommande));

        return response()->json(new PreCommandeResource($preCommande->fresh()));
    }

    /**
     * Marque une commande validée comme récupérée et décrémente le stock.
     */
    public function recuperer(PreCommande $preCommande): JsonResponse
    {
        if ($preCommande->statut !== Statut::Valide) {
            return response()->json(['message' => 'Seule une commande validée peut être récupérée.'], 422);
        }

        DB::transaction(function () use ($preCommande) {
            foreach ($preCommande->lignes()->with('medicament')->get() as $ligne) {
                if ($ligne->medicament) {
                    $ligne->medicament->decrement('quantite_stock', $ligne->quantite_demandee);
                }
            }
            $preCommande->update(['statut' => Statut::Recupere]);
        });

        $this->audit->log('pre_commande.recuperer', $preCommande);

        return response()->json(new PreCommandeResource($preCommande->fresh('lignes.medicament')));
    }
}
