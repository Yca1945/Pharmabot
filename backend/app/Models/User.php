<?php

namespace App\Models;

use App\Enums\Role;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'profil_medical_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => Role::class,
        ];
    }

    // --- Relations ---

    public function profilMedical(): BelongsTo
    {
        return $this->belongsTo(ProfilMedical::class);
    }

    public function preCommandes(): HasMany
    {
        return $this->hasMany(PreCommande::class, 'patient_id');
    }

    public function discussionLogs(): HasMany
    {
        return $this->hasMany(DiscussionLog::class, 'patient_id');
    }

    // --- Helpers de rôle ---

    public function isPharmacien(): bool
    {
        return $this->role === Role::Pharmacien;
    }

    public function isPatient(): bool
    {
        return $this->role === Role::Patient;
    }
}
