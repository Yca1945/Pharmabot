<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscussionLog extends Model
{
    protected $fillable = [
        'patient_id',
        'message_utilisateur',
        'reponse_ia',
        'contexte_recupere_id',
        'fidelite_estimee',
        'abstention',
        'feedback',
        'feedback_commentaire',
    ];

    protected $casts = [
        'abstention' => 'boolean',
        'fidelite_estimee' => 'float',
        'feedback' => 'integer',
        // Chiffrement au repos : un échange patient peut révéler des données
        // de santé (symptômes, traitements). Voir docs/RGPD.md.
        'message_utilisateur' => 'encrypted',
        'reponse_ia' => 'encrypted',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }
}
