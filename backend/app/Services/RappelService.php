<?php

namespace App\Services;

use App\Models\PreCommande;
use App\Models\Rappel;

/**
 * Génère les rappels de suivi thérapeutique (RF-07) à partir d'une
 * pré-commande validée, en fonction de la posologie extraite par l'IA.
 */
class RappelService
{
    public function __construct(private readonly PosologieParser $parser) {}

    /**
     * Crée un rappel par ligne de commande disposant d'une posologie.
     *
     * @return int nombre de rappels créés
     */
    public function genererPourPreCommande(PreCommande $preCommande): int
    {
        $preCommande->loadMissing('lignes.medicament');
        $crees = 0;

        foreach ($preCommande->lignes as $ligne) {
            $heures = $this->parser->heures($ligne->posologie_extraite);

            Rappel::create([
                'patient_id' => $preCommande->patient_id,
                'ligne_commande_id' => $ligne->id,
                'medicament_id' => $ligne->medicament_id,
                'libelle' => $ligne->medicament?->designation ?? 'Médicament',
                'posologie' => $ligne->posologie_extraite,
                'heures' => $heures,
                'actif' => true,
                'date_debut' => now()->toDateString(),
                'date_fin' => null,
            ]);
            $crees++;
        }

        return $crees;
    }
}
