<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Rappel extends Model
{
    protected $fillable = [
        'patient_id',
        'ligne_commande_id',
        'medicament_id',
        'libelle',
        'posologie',
        'heures',
        'actif',
        'date_debut',
        'date_fin',
    ];

    protected $casts = [
        'heures' => 'array',
        'actif' => 'boolean',
        'date_debut' => 'date',
        'date_fin' => 'date',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function medicament(): BelongsTo
    {
        return $this->belongsTo(Medicament::class);
    }

    /** Le rappel est-il actif pour la date donnée ? */
    public function estActifLe(string $date): bool
    {
        if (! $this->actif) {
            return false;
        }
        if ($this->date_debut->toDateString() > $date) {
            return false;
        }
        if ($this->date_fin && $this->date_fin->toDateString() < $date) {
            return false;
        }
        return true;
    }
}
