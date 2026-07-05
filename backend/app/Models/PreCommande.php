<?php

namespace App\Models;

use App\Enums\Statut;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PreCommande extends Model
{
    protected $fillable = [
        'patient_id',
        'pharmacien_id',
        'statut',
        'code_validation',
        'motif_rejet',
        'date_creation',
        'ordonnance_path',
        'ordonnance_nom_original',
    ];

    protected $casts = [
        'statut' => Statut::class,
        'date_creation' => 'datetime',
    ];

    // --- Relations ---

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function pharmacien(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pharmacien_id');
    }

    public function lignes(): HasMany
    {
        return $this->hasMany(LigneCommande::class);
    }

    // --- Transitions d'état ---

    public function valider(User $pharmacien): void
    {
        $this->update([
            'statut' => Statut::Valide,
            'pharmacien_id' => $pharmacien->id,
            'code_validation' => strtoupper(bin2hex(random_bytes(3))),
        ]);
    }

    public function rejeter(User $pharmacien, ?string $motif = null): void
    {
        $this->update([
            'statut' => Statut::Rejete,
            'pharmacien_id' => $pharmacien->id,
            'motif_rejet' => $motif,
        ]);
    }
}
