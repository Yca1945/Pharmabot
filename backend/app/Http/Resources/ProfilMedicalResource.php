<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProfilMedicalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'allergies'      => $this->allergies,
            'antecedents'    => $this->antecedents,
            'age'            => $this->age,
            'poids'          => $this->poids,
            'sexe'           => $this->sexe,
            'groupe_sanguin' => $this->groupe_sanguin,
        ];
    }
}
