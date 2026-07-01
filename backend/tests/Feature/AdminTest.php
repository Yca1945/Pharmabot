<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create([
            'name' => 'Admin', 'email' => 'admin@test.dev',
            'password' => 'password', 'role' => Role::Admin,
        ]);
    }

    private function patient(): User
    {
        return User::create([
            'name' => 'Pat', 'email' => 'pat@test.dev',
            'password' => 'password', 'role' => Role::Patient,
        ]);
    }

    public function test_admin_cree_un_pharmacien(): void
    {
        $this->actingAs($this->admin())->postJson('/api/admin/users', [
            'name' => 'Nouveau Pharma',
            'email' => 'np@test.dev',
            'password' => 'motdepasse',
            'role' => 'pharmacien',
        ])->assertCreated();

        $this->assertSame(Role::Pharmacien, User::where('email', 'np@test.dev')->first()->role);
    }

    public function test_non_admin_refuse(): void
    {
        $this->actingAs($this->patient())
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }

    public function test_changement_de_role(): void
    {
        $admin = $this->admin();
        $patient = $this->patient();

        $this->actingAs($admin)
            ->putJson("/api/admin/users/{$patient->id}", ['role' => 'pharmacien'])
            ->assertOk();

        $this->assertSame(Role::Pharmacien, $patient->fresh()->role);
    }

    public function test_admin_ne_peut_pas_se_supprimer(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->deleteJson("/api/admin/users/{$admin->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_validation_role_invalide(): void
    {
        $this->actingAs($this->admin())->postJson('/api/admin/users', [
            'name' => 'X', 'email' => 'x@test.dev', 'password' => 'motdepasse',
            'role' => 'superuser',
        ])->assertStatus(422);
    }
}
