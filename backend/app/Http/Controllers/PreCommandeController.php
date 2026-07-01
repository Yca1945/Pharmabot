<?php

namespace App\Http\Controllers;

use App\Http\Resources\PreCommandeResource;
use App\Models\Medicament;
use App\Models\PreCommande;
use App\Services\AlerteService;
use App\Services\IaClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class PreCommandeController extends Controller
{
    public function __construct(
        private readonly IaClient $ia,
        private readonly AlerteService $alertes,
    ) {}

    /**
     * Côté patient : crée une pré-commande à l'état "en_attente".
     * Les lignes proviennent d'une sélection explicite de médicaments.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lignes' => 'required|array|min:1',
            'lignes.*.medicament_id' => 'required|exists:medicaments,id',
            'lignes.*.quantite_demandee' => 'required|integer|min:1',
            'lignes.*.posologie_extraite' => 'nullable|string|max:255',
        ]);

        // Vérification allergie AVANT création.
        $ids = array_column($data['lignes'], 'medicament_id');
        $medicamentsCandidats = Medicament::whereIn('id', $ids)->get();
        $alertes = $this->alertes->pourMedicaments($request->user()->profilMedical, $medicamentsCandidats);

        if (! empty($alertes)) {
            $details = collect($alertes)
                ->map(fn ($a) => "{$a['medicament']} (allergie : {$a['allergie']})")
                ->join(', ');

            return response()->json([
                'message' => "Commande bloquée : contre-indication détectée avec votre profil médical. Consultez votre pharmacien. Médicaments concernés : {$details}.",
                'alertes' => $alertes,
            ], 422);
        }

        $preCommande = DB::transaction(function () use ($data, $request) {
            $pc = PreCommande::create([
                'patient_id' => $request->user()->id,
                'date_creation' => now(),
            ]);

            foreach ($data['lignes'] as $ligne) {
                $pc->lignes()->create($ligne);
            }

            return $pc->load('lignes.medicament');
        });

        return (new PreCommandeResource($preCommande))->response()->setStatusCode(201);
    }

    /**
     * Côté patient : crée une pré-commande directement à partir d'un message
     * de chat. Le microservice IA extrait les entités (médicaments + posologie),
     * que l'on rapproche du catalogue de l'officine.
     */
    public function depuisChat(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        try {
            $entites = $this->ia->extract($data['message']);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Service IA indisponible (extract)', ['erreur' => $e->getMessage()]);

            return response()->json([
                'message' => "Le service d'analyse est momentanément indisponible. Réessayez plus tard.",
            ], 503);
        }

        // Rapprochement entités -> catalogue
        $lignes = [];
        $nonTrouves = [];
        foreach ($entites as $e) {
            $medicament = Medicament::where('designation', 'like', '%' . $e['medicament'] . '%')
                ->first();

            if (! $medicament) {
                $nonTrouves[] = $e['medicament'];
                continue;
            }

            $posologie = trim(($e['dosage'] ?? '') . ' ' . ($e['frequence'] ?? '')) ?: null;
            $lignes[] = [
                'medicament_id' => $medicament->id,
                'quantite_demandee' => 1,
                'posologie_extraite' => $posologie,
            ];
        }

        if (empty($lignes)) {
            return response()->json([
                'message' => "Aucun médicament du catalogue n'a pu être identifié dans votre demande.",
                'non_trouves' => $nonTrouves,
            ], 422);
        }

        // Vérification allergie AVANT création : on ne crée pas une commande
        // dangereuse même en attente de validation.
        $medicamentsCandidats = Medicament::whereIn('id', array_column($lignes, 'medicament_id'))->get();
        $alertes = $this->alertes->pourMedicaments($request->user()->profilMedical, $medicamentsCandidats);

        if (! empty($alertes)) {
            $details = collect($alertes)
                ->map(fn ($a) => "{$a['medicament']} (allergie : {$a['allergie']})")
                ->join(', ');

            return response()->json([
                'message' => "Commande bloquée : contre-indication détectée avec votre profil médical. Consultez votre pharmacien. Médicaments concernés : {$details}.",
                'alertes' => $alertes,
            ], 422);
        }

        $preCommande = DB::transaction(function () use ($lignes, $request) {
            $pc = PreCommande::create([
                'patient_id' => $request->user()->id,
                'date_creation' => now(),
            ]);
            foreach ($lignes as $ligne) {
                $pc->lignes()->create($ligne);
            }
            return $pc->load('lignes.medicament');
        });

        return response()->json([
            'pre_commande' => new PreCommandeResource($preCommande),
            'non_trouves' => $nonTrouves,
            'alertes' => [],
        ], 201);
    }

    /**
     * Côté patient : liste ses propres pré-commandes.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $commandes = PreCommande::with('lignes.medicament')
            ->where('patient_id', $request->user()->id)
            ->latest()
            ->get();

        return PreCommandeResource::collection($commandes);
    }
}
