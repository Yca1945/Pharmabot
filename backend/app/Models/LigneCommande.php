<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LigneCommande extends Model
{
    protected $fillable = [
        'pre_commande_id',
        'medicament_id',
        'quantite_demandee',
        'posologie_extraite',
    ];

    protected $casts = [
        'quantite_demandee' => 'integer',
    ];

    public function preCommande(): BelongsTo
    {
        return $this->belongsTo(PreCommande::class);
    }

    public function medicament(): BelongsTo
    {
        return $this->belongsTo(Medicament::class);
    }
}
