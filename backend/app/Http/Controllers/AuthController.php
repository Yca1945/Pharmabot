<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Http\Resources\UserResource;
use App\Models\ProfilMedical;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                  => 'required|string|max:255',
            'email'                 => 'required|email|unique:users,email',
            'password'              => 'required|string|min:8|confirmed',
            // fiche médicale — tous optionnels
            'age'                   => 'nullable|integer|min:0|max:130',
            'poids'                 => 'nullable|numeric|min:1|max:500',
            'sexe'                  => 'nullable|string|in:M,F,autre',
            'groupe_sanguin'        => 'nullable|string|in:A+,A-,B+,B-,AB+,AB-,O+,O-',
            'allergies'             => 'nullable|string|max:2000',
            'antecedents'           => 'nullable|string|max:2000',
        ]);

        $profil = ProfilMedical::create([
            'age'            => $data['age'] ?? null,
            'poids'          => $data['poids'] ?? null,
            'sexe'           => $data['sexe'] ?? null,
            'groupe_sanguin' => $data['groupe_sanguin'] ?? null,
            'allergies'      => $data['allergies'] ?? null,
            'antecedents'    => $data['antecedents'] ?? null,
        ]);

        $user = User::create([
            'name'              => $data['name'],
            'email'             => $data['email'],
            'password'          => $data['password'],
            'role'              => Role::Patient,
            'profil_medical_id' => $profil->id,
        ]);

        $token = $user->createToken('api')->plainTextToken;

        return response()->json(['user' => new UserResource($user), 'token' => $token], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants invalides.'],
            ]);
        }

        $token = $user->createToken('api')->plainTextToken;

        return response()->json(['user' => new UserResource($user), 'token' => $token]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load('profilMedical'));
    }
}
