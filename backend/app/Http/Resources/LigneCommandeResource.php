<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LigneCommandeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'quantite_demandee' => (int) $this->quantite_demandee,
            'posologie_extraite' => $this->posologie_extraite,
            'medicament' => new MedicamentResource($this->whenLoaded('medicament')),
        ];
    }
}
