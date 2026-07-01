<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\PreCommande;
use App\Models\ProfilMedical;
use App\Models\Rappel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RgpdTest extends TestCase
{
    use RefreshDatabase;

    private function patient(): User
    {
        return User::create([
            'name' => 'Pat', 'email' => 'pat@test.dev',
            'password' => 'password', 'role' => Role::Patient,
        ]);
    }

    public function test_les_allergies_sont_chiffrees_en_base(): void
    {
        $profil = ProfilMedical::create(['allergies' => 'pénicilline', 'age' => 30]);

        // En base : valeur chiffrée (différente du clair).
        $brut = DB::table('profil_medicals')->where('id', $profil->id)->value('allergies');
        $this->assertNotSame('pénicilline', $brut);

        // Via le modèle : déchiffrement transparent.
        $this->assertSame('pénicilline', $profil->fresh()->allergies);
    }

    public function test_export_des_donnees(): void
    {
        $patient = $this->patient();

        $this->actingAs($patient)
            ->getJson('/api/compte/export')
            ->assertOk()
            ->assertJsonStructure(['exporte_le', 'utilisateur', 'pre_commandes', 'rappels', 'conversations']);
    }

    public function test_suppression_de_compte_en_cascade(): void
    {
        $patient = $this->patient();
        $pc = PreCommande::create(['patient_id' => $patient->id, 'date_creation' => now()]);
        Rappel::create([
            'patient_id' => $patient->id,
            'libelle' => 'Doliprane',
            'heures' => ['08:00'],
            'date_debut' => now()->toDateString(),
        ]);

        $this->actingAs($patient)->deleteJson('/api/compte')->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $patient->id]);
        $this->assertDatabaseMissing('pre_commandes', ['id' => $pc->id]);
        $this->assertDatabaseMissing('rappels', ['patient_id' => $patient->id]);
    }
}
