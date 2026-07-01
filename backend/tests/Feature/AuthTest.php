<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_inscription_cree_un_patient(): void
    {
        $res = $this->postJson('/api/register', [
            'name' => 'Test Patient',
            'email' => 'p@test.dev',
            'password' => 'motdepasse',
            'password_confirmation' => 'motdepasse',
        ]);

        $res->assertCreated()->assertJsonStructure(['user', 'token']);
        $this->assertSame(Role::Patient, User::first()->role);
    }

    public function test_connexion_retourne_un_token(): void
    {
        User::create([
            'name' => 'Jean',
            'email' => 'jean@test.dev',
            'password' => 'motdepasse',
            'role' => Role::Patient,
        ]);

        $this->postJson('/api/login', [
            'email' => 'jean@test.dev',
            'password' => 'motdepasse',
        ])->assertOk()->assertJsonStructure(['token']);
    }

    public function test_route_protegee_refuse_sans_token(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_patient_ne_peut_acceder_au_dashboard_officine(): void
    {
        $patient = User::create([
            'name' => 'Patient',
            'email' => 'pat@test.dev',
            'password' => 'motdepasse',
            'role' => Role::Patient,
        ]);

        $this->actingAs($patient)
            ->getJson('/api/officine/pre-commandes')
            ->assertForbidden();
    }
}
