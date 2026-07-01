<?php

namespace App\Http\Controllers;

use App\Http\Requests\MedicamentRequest;
use App\Http\Resources\MedicamentResource;
use App\Models\Medicament;
use App\Services\CatalogueSync;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Gestion du catalogue de médicaments (RF — gestion de l'inventaire).
 * Lecture ouverte aux utilisateurs authentifiés ; écriture réservée au
 * pharmacien (via middleware de route). Chaque écriture est synchronisée
 * avec la base vectorielle de l'IA.
 */
class MedicamentController extends Controller
{
    public function __construct(private readonly CatalogueSync $sync) {}

    /** Liste / recherche du catalogue. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $medicaments = Medicament::query()
            ->when($request->query('q'), fn ($query, $q) =>
                $query->where('designation', 'like', "%{$q}%"))
            ->orderBy('designation')
            ->paginate($request->integer('per_page', 25));

        return MedicamentResource::collection($medicaments);
    }

    public function store(MedicamentRequest $request): JsonResponse
    {
        $medicament = Medicament::create($request->validated());
        $this->sync->indexer($medicament);

        return (new MedicamentResource($medicament))->response()->setStatusCode(201);
    }

    public function update(MedicamentRequest $request, Medicament $medicament): MedicamentResource
    {
        $medicament->update($request->validated());
        $this->sync->indexer($medicament);

        return new MedicamentResource($medicament);
    }

    public function destroy(Medicament $medicament): JsonResponse
    {
        $this->sync->retirer($medicament);
        $medicament->delete();

        return response()->json(['ok' => true]);
    }

    /** Médicaments dont le stock est sous le seuil d'alerte. */
    public function stockBas(Request $request): JsonResponse
    {
        $seuil = (int) $request->query('seuil', 10);

        $medicaments = Medicament::where('quantite_stock', '<=', $seuil)
            ->orderBy('quantite_stock')
            ->get();

        return response()->json([
            'seuil' => $seuil,
            'medicaments' => MedicamentResource::collection($medicaments),
        ]);
    }
}
