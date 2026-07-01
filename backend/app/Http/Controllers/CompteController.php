<?php

namespace App\Http\Controllers;

use App\Models\Rappel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Droits RGPD du patient sur son compte (voir docs/RGPD.md) :
 *  - portabilité : export de l'ensemble de ses données ;
 *  - droit à l'effacement : suppression définitive du compte et des données liées.
 */
class CompteController extends Controller
{
    /** Portabilité (art. 20 RGPD) : export structuré des données personnelles. */
    public function export(Request $request): JsonResponse
    {
        $user = $request->user()->load([
            'profilMedical',
            'preCommandes.lignes.medicament',
            'discussionLogs',
        ]);

        return response()->json([
            'exporte_le' => now()->toIso8601String(),
            'utilisateur' => $user->only(['id', 'name', 'email', 'role']),
            'profil_medical' => $user->profilMedical?->only(['allergies', 'age', 'antecedents']),
            'pre_commandes' => $user->preCommandes->map(fn ($pc) => [
                'id' => $pc->id,
                'statut' => $pc->statut,
                'date_creation' => $pc->date_creation,
                'lignes' => $pc->lignes->map(fn ($l) => [
                    'medicament' => $l->medicament?->designation,
                    'quantite' => $l->quantite_demandee,
                    'posologie' => $l->posologie_extraite,
                ]),
            ]),
            'rappels' => Rappel::where('patient_id', $user->id)->get(['libelle', 'posologie', 'heures', 'actif']),
            'conversations' => $user->discussionLogs->map(fn ($d) => [
                'message' => $d->message_utilisateur,
                'reponse' => $d->reponse_ia,
                'date' => $d->created_at,
            ]),
        ]);
    }

    /** Droit à l'effacement (art. 17 RGPD) : suppression définitive. */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($user) {
            $profil = $user->profilMedical;

            // Notifications (relation polymorphe) et jetons d'accès.
            $user->notifications()->delete();
            $user->tokens()->delete();

            // La suppression de l'utilisateur cascade pré-commandes, lignes,
            // logs de discussion et rappels (contraintes onDelete cascade).
            $user->delete();

            // Profil médical (référencé par l'utilisateur supprimé).
            $profil?->delete();
        });

        return response()->json(['ok' => true, 'message' => 'Compte et données supprimés.']);
    }
}
