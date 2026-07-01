<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ResilienceTest extends TestCase
{
    use RefreshDatabase;

    private function patient(): User
    {
        return User::create([
            'name' => 'Pat', 'email' => 'pat@test.dev',
            'password' => 'password', 'role' => Role::Patient,
        ]);
    }

    public function test_chat_degrade_gracieusement_si_ia_indisponible(): void
    {
        // Simule une panne du microservice IA.
        Http::fake(['*' => Http::response('', 500)]);

        $res = $this->actingAs($this->patient())
            ->postJson('/api/chat', ['message' => 'Bonjour'])
            ->assertOk();

        $res->assertJson([
            'abstention' => true,
            'service_indisponible' => true,
        ]);
    }

    public function test_pre_commande_depuis_chat_renvoie_503_si_ia_indisponible(): void
    {
        Http::fake(['*' => Http::response('', 500)]);

        $this->actingAs($this->patient())
            ->postJson('/api/pre-commandes/depuis-chat', ['message' => 'Doliprane'])
            ->assertStatus(503);
    }
}
