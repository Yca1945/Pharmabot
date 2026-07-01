<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PreCommandeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'statut' => $this->statut,
            'statut_libelle' => $this->statut?->label(),
            'code_validation' => $this->code_validation,
            'motif_rejet' => $this->motif_rejet,
            'date_creation' => $this->date_creation,
            'lignes' => LigneCommandeResource::collection($this->whenLoaded('lignes')),
            'patient' => $this->whenLoaded('patient', fn () => [
                'id' => $this->patient->id,
                'name' => $this->patient->name,
            ]),
            // Alertes de sécurité (allergies) — présentes uniquement quand le
            // contrôleur les a calculées (dashboard pharmacien).
            'alertes' => $this->alertes ?? [],
        ];
    }
}
