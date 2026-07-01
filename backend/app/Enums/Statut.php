<?php

namespace App\Enums;

enum Statut: string
{
    case EnAttente = 'en_attente';
    case Valide = 'valide';
    case Rejete = 'rejete';
    case Recupere = 'recupere';

    public function label(): string
    {
        return match ($this) {
            self::EnAttente => 'En attente de validation',
            self::Valide => 'Validée',
            self::Rejete => 'Rejetée',
            self::Recupere => 'Récupérée',
        };
    }
}
