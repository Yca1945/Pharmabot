<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RappelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'libelle' => $this->libelle,
            'posologie' => $this->posologie,
            'heures' => $this->heures,
            'actif' => (bool) $this->actif,
            'date_debut' => $this->date_debut,
            'date_fin' => $this->date_fin,
        ];
    }
}
