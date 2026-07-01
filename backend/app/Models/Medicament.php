<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Medicament extends Model
{
    protected $fillable = [
        'code_barre',
        'designation',
        'quantite_stock',
        'description_technique',
        'prix',
    ];

    protected $casts = [
        'quantite_stock' => 'integer',
        'prix' => 'decimal:2',
    ];

    public function lignesCommande(): HasMany
    {
        return $this->hasMany(LigneCommande::class);
    }
}
