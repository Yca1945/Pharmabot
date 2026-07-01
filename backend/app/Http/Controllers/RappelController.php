<?php

namespace App\Http\Controllers;

use App\Http\Resources\RappelResource;
use App\Models\Rappel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Gestion des rappels de prise par le patient (RF-07).
 */
class RappelController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $rappels = Rappel::where('patient_id', $request->user()->id)
            ->latest()
            ->get();

        return RappelResource::collection($rappels);
    }

    /** Active ou désactive un rappel. */
    public function basculer(Request $request, Rappel $rappel): JsonResponse
    {
        $this->autoriser($request, $rappel);

        $rappel->update(['actif' => ! $rappel->actif]);

        return response()->json(new RappelResource($rappel));
    }

    public function destroy(Request $request, Rappel $rappel): JsonResponse
    {
        $this->autoriser($request, $rappel);

        $rappel->delete();

        return response()->json(['ok' => true]);
    }

    /** Vérifie que le rappel appartient bien au patient connecté. */
    private function autoriser(Request $request, Rappel $rappel): void
    {
        abort_unless($rappel->patient_id === $request->user()->id, 403);
    }
}
