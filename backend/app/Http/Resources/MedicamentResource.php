<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MedicamentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code_barre' => $this->code_barre,
            'designation' => $this->designation,
            'quantite_stock' => (int) $this->quantite_stock,
            'description_technique' => $this->description_technique,
            'prix' => (float) $this->prix,
        ];
    }
}
