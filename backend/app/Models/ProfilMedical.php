<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ProfilMedical extends Model
{
    protected $fillable = ['allergies', 'antecedents', 'age', 'poids', 'sexe', 'groupe_sanguin'];

    /**
     * Chiffrement AES au repos des données de santé (RGPD).
     * Transparent côté application : déchiffré automatiquement à la lecture,
     * stocké chiffré en base. Voir docs/RGPD.md.
     */
    protected $casts = [
        'allergies' => 'encrypted',
        'antecedents' => 'encrypted',
    ];

    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }
}
