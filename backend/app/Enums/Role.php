<?php

namespace App\Enums;

enum Role: string
{
    case Patient = 'patient';
    case Pharmacien = 'pharmacien';
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Patient => 'Patient',
            self::Pharmacien => 'Pharmacien',
            self::Admin => 'Administrateur',
        };
    }
}
