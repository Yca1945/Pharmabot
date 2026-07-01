<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Enums\Statut;
use App\Models\Medicament;
use App\Models\PreCommande;
use App\Models\Rappel;
use App\Models\User;
use App\Notifications\PreCommandeValidee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PreCommandeFlowTest extends TestCase
{
    use RefreshDatabase;

    private function patient(): User
    {
        return User::create([
            'name' => 'Patient', 'email' => 'pat@test.dev',
            'password' => 'x', 'role' => Role::Patient,
        ]);
    }

    private function pharmacien(): User
    {
        return User::create([
            'name' => 'Pharma', 'email' => 'ph@test.dev',
            'password' => 'x', 'role' => Role::Pharmacien,
        ]);
    }

    private function medicament(): Medicament
    {
        return Medicament::create([
            'designation' => 'Doliprane 1000 mg',
            'quantite_stock' => 50,
            'prix' => 2.18,
        ]);
    }

    public function test_patient_cree_une_pre_commande(): void
    {
        $patient = $this->patient();
        $med = $this->medicament();

        $this->actingAs($patient)->postJson('/api/pre-commandes', [
            'lignes' => [
                ['medicament_id' => $med->id, 'quantite_demandee' => 2, 'posologie_extraite' => '3 fois par jour'],
            ],
        ])->assertCreated();

        $this->assertSame(Statut::EnAttente, PreCommande::first()->statut);
    }

    public function test_validation_notifie_et_genere_les_rappels(): void
    {
        Notification::fake();

        $patient = $this->patient();
        $pharma = $this->pharmacien();
        $med = $this->medicament();

        $pc = PreCommande::create([
            'patient_id' => $patient->id,
            'date_creation' => now(),
        ]);
        $pc->lignes()->create([
            'medicament_id' => $med->id,
            'quantite_demandee' => 1,
            'posologie_extraite' => '3 fois par jour',
        ]);

        $this->actingAs($pharma)
            ->postJson("/api/officine/pre-commandes/{$pc->id}/valider")
            ->assertOk();

        // Statut + code de validation
        $pc->refresh();
        $this->assertSame(Statut::Valide, $pc->statut);
        $this->assertNotNull($pc->code_validation);

        // RF-06 : notification envoyée
        Notification::assertSentTo($patient, PreCommandeValidee::class);

        // RF-07 : un rappel généré avec 3 horaires (3 fois/jour)
        $rappel = Rappel::where('patient_id', $patient->id)->first();
        $this->assertNotNull($rappel);
        $this->assertCount(3, $rappel->heures);
    }
}
