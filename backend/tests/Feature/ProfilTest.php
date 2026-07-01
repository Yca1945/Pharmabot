<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfilTest extends TestCase
{
    use RefreshDatabase;

    private function patient(): User
    {
        return User::create([
            'name' => 'Pat', 'email' => 'pat@test.dev',
            'password' => 'x', 'role' => Role::Patient,
        ]);
    }

    public function test_creation_du_profil_au_premier_enregistrement(): void
    {
        $patient = $this->patient();

        $this->actingAs($patient)->putJson('/api/profil', [
            'allergies' => 'pénicilline',
            'age' => 30,
        ])->assertOk()->assertJsonFragment(['allergies' => 'pénicilline']);

        $this->assertNotNull($patient->fresh()->profil_medical_id);
    }

    public function test_mise_a_jour_du_profil_existant(): void
    {
        $patient = $this->patient();

        $this->actingAs($patient)->putJson('/api/profil', ['allergies' => 'a']);
        $this->actingAs($patient)->putJson('/api/profil', ['allergies' => 'b'])->assertOk();

        // Pas de doublon : le profil est mis à jour, pas recréé.
        $this->assertDatabaseCount('profil_medicals', 1);
        $this->assertSame('b', $patient->fresh()->profilMedical->allergies);
    }
}
