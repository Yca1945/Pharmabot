<?php

namespace App\Http\Controllers;

use App\Enums\Statut;
use App\Models\PreCommande;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Upload et consultation de l'ordonnance jointe à une pré-commande.
 *
 * Stockage sur le disque "local" (storage/app/private, non exposé publiquement) :
 * seul le patient propriétaire ou un pharmacien authentifié peut récupérer le
 * fichier, via cette route contrôlée — jamais d'URL publique directe.
 */
class OrdonnanceController extends Controller
{
    /**
     * Le patient joint une photo/PDF de son ordonnance à sa pré-commande,
     * tant qu'elle est encore en attente de décision.
     */
    public function store(Request $request, PreCommande $preCommande): JsonResponse
    {
        if ($preCommande->patient_id !== $request->user()->id) {
            abort(403, "Cette pré-commande ne vous appartient pas.");
        }

        if ($preCommande->statut !== Statut::EnAttente) {
            return response()->json([
                'message' => "L'ordonnance ne peut être jointe que sur une commande en attente de décision.",
            ], 422);
        }

        $data = $request->validate([
            'ordonnance' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        // Supprime l'ancien fichier si un nouveau remplace un envoi précédent.
        if ($preCommande->ordonnance_path) {
            Storage::disk('local')->delete($preCommande->ordonnance_path);
        }

        $fichier = $data['ordonnance'];
        $chemin = $fichier->store('ordonnances/' . $preCommande->id, 'local');

        $preCommande->update([
            'ordonnance_path' => $chemin,
            'ordonnance_nom_original' => $fichier->getClientOriginalName(),
        ]);

        return response()->json([
            'message' => 'Ordonnance transmise avec succès.',
            'ordonnance_nom' => $preCommande->ordonnance_nom_original,
        ]);
    }

    /**
     * Téléchargement du fichier : réservé au patient propriétaire ou à un
     * pharmacien (rôle métier autorisé à instruire la commande).
     */
    public function show(Request $request, PreCommande $preCommande): StreamedResponse|Response
    {
        $user = $request->user();
        $estProprietaire = $preCommande->patient_id === $user->id;

        if (! $estProprietaire && ! $user->isPharmacien()) {
            abort(403);
        }

        if (! $preCommande->ordonnance_path || ! Storage::disk('local')->exists($preCommande->ordonnance_path)) {
            abort(404, 'Aucune ordonnance jointe.');
        }

        return Storage::disk('local')->response(
            $preCommande->ordonnance_path,
            $preCommande->ordonnance_nom_original ?? 'ordonnance'
        );
    }
}
