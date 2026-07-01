<?php

namespace App\Services;

use App\Models\Medicament;
use Illuminate\Support\Facades\Log;

/**
 * Synchronise le catalogue relationnel (MySQL) avec la base vectorielle de
 * l'IA. Garantit que l'agent ne peut parler que des médicaments réellement
 * présents au catalogue (récupération bornée = garde-fou anti-hallucination).
 *
 * Les erreurs de l'IA (service indisponible) ne bloquent jamais le CRUD :
 * elles sont journalisées et pourront être rejouées.
 */
class CatalogueSync
{
    public function __construct(private readonly IaClient $ia) {}

    public function indexer(Medicament $medicament): void
    {
        $contenu = trim(sprintf(
            "%s. %s Prix : %s FCFA. Stock : %d.",
            $medicament->designation,
            $medicament->description_technique ?? '',
            $medicament->prix,
            $medicament->quantite_stock,
        ));

        try {
            $this->ia->ingest($medicament->designation, $contenu, [
                'id' => (string) $medicament->id,
                'designation' => $medicament->designation,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Sync IA (ingest) échouée', [
                'medicament_id' => $medicament->id,
                'erreur' => $e->getMessage(),
            ]);
        }
    }

    public function retirer(Medicament $medicament): void
    {
        try {
            $this->ia->remove((string) $medicament->id);
        } catch (\Throwable $e) {
            Log::warning('Sync IA (remove) échouée', [
                'medicament_id' => $medicament->id,
                'erreur' => $e->getMessage(),
            ]);
        }
    }
}
