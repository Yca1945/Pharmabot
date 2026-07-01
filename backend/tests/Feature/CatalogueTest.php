<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Enums\Statut;
use App\Models\Medicament;
use App\Models\PreCommande;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CatalogueTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Simule le microservice IA (sync vectorielle) pour ne pas dépendre du réseau.
        Http::fake(['*' => Http::response(['ok' => true], 200)]);
    }

    private function pharmacien(): User
    {
        return User::create([
            'name' => 'Pharma', 'email' => 'ph@test.dev',
            'password' => 'x', 'role' => Role::Pharmacien,
        ]);
    }

    private function patient(): User
    {
        return User::create([
            'name' => 'Pat', 'email' => 'pat@test.dev',
            'password' => 'x', 'role' => Role::Patient,
        ]);
    }

    public function test_pharmacien_cree_un_medicament(): void
    {
        $this->actingAs($this->pharmacien())->postJson('/api/officine/medicaments', [
            'designation' => 'Spasfon 80 mg',
            'quantite_stock' => 40,
            'prix' => 3.10,
        ])->assertCreated();

        $this->assertDatabaseHas('medicaments', ['designation' => 'Spasfon 80 mg']);
    }

    public function test_patient_ne_peut_pas_creer(): void
    {
        $this->actingAs($this->patient())->postJson('/api/officine/medicaments', [
            'designation' => 'X', 'quantite_stock' => 1, 'prix' => 1,
        ])->assertForbidden();
    }

    public function test_alerte_stock_bas(): void
    {
        Medicament::create(['designation' => 'Bas', 'quantite_stock' => 3, 'prix' => 1]);
        Medicament::create(['designation' => 'Haut', 'quantite_stock' => 200, 'prix' => 1]);

        $res = $this->actingAs($this->pharmacien())
            ->getJson('/api/officine/medicaments/stock-bas?seuil=10')
            ->assertOk();

        $this->assertCount(1, $res->json('medicaments'));
    }

    public function test_recuperer_decremente_le_stock(): void
    {
        $patient = $this->patient();
        $pharma = $this->pharmacien();
        $med = Medicament::create(['designation' => 'Doliprane 1000 mg', 'quantite_stock' => 10, 'prix' => 2]);

        $pc = PreCommande::create(['patient_id' => $patient->id, 'statut' => Statut::Valide, 'date_creation' => now()]);
        $pc->lignes()->create(['medicament_id' => $med->id, 'quantite_demandee' => 3]);

        $this->actingAs($pharma)
            ->postJson("/api/officine/pre-commandes/{$pc->id}/recuperer")
            ->assertOk();

        $this->assertSame(7, $med->fresh()->quantite_stock);
        $this->assertSame(Statut::Recupere, $pc->fresh()->statut);
    }

    public function test_validation_refusee_si_stock_insuffisant(): void
    {
        $patient = $this->patient();
        $pharma = $this->pharmacien();
        $med = Medicament::create(['designation' => 'Rare', 'quantite_stock' => 1, 'prix' => 2]);

        $pc = PreCommande::create(['patient_id' => $patient->id, 'date_creation' => now()]);
        $pc->lignes()->create(['medicament_id' => $med->id, 'quantite_demandee' => 5]);

        $this->actingAs($pharma)
            ->postJson("/api/officine/pre-commandes/{$pc->id}/valider")
            ->assertStatus(422);
    }
}
