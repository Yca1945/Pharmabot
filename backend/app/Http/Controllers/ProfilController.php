<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProfilMedicalResource;
use App\Models\ProfilMedical;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Profil médical de base du patient (RF-01 : allergies, âge, antécédents).
 */
class ProfilController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $profil = $request->user()->profilMedical;

        return response()->json($profil ? new ProfilMedicalResource($profil) : null);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'allergies' => ['nullable', 'string', 'max:1000'],
            'age' => ['nullable', 'integer', 'min:0', 'max:120'],
            'antecedents' => ['nullable', 'string', 'max:2000'],
        ]);

        $user = $request->user();

        if ($user->profilMedical) {
            $user->profilMedical->update($data);
            $profil = $user->profilMedical->fresh();
        } else {
            $profil = ProfilMedical::create($data);
            $user->update(['profil_medical_id' => $profil->id]);
        }

        return response()->json(new ProfilMedicalResource($profil));
    }
}
