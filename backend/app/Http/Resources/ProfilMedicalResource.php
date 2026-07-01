<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProfilMedicalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'allergies' => $this->allergies,
            'age' => $this->age,
            'antecedents' => $this->antecedents,
        ];
    }
}
