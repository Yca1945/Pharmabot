<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Facades\Http;

/**
 * Client HTTP vers le microservice IA (FastAPI / RAG).
 *
 * Couplage faible : Laravel ne connaît que le contrat JSON, pas la logique IA.
 * Toute l'« étanchéité médicale » (garde anti-hallucination) vit côté Python ;
 * Laravel reste responsable des droits, de la persistance et de la validation
 * humaine par le pharmacien.
 */
class IaClient
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(env('IA_SERVICE_URL', 'http://ia-service:8001'), '/');
    }

    /**
     * Requête HTTP préconfigurée propageant l'identifiant de corrélation
     * (X-Request-Id) pour le suivi de bout en bout dans les logs.
     */
    private function http(int $timeout): PendingRequest
    {
        return Http::timeout($timeout)
            ->withHeaders(['X-Request-Id' => (string) Context::get('request_id', '')]);
    }

    /**
     * Envoie un message patient au pipeline RAG et récupère la réponse sourcée.
     *
     * @return array{reponse:string, sources:array, entites:array, abstention:bool, fidelite_estimee:?float}
     */
    /**
     * @param array{allergies?:string|null, antecedents?:string|null, age?:int|null}|null $profilMedical
     * @param array<int, array{question:string, reponse:string}> $historique
     */
    public function chat(
        string $message,
        ?int $patientId = null,
        ?array $profilMedical = null,
        array $historique = [],
    ): array {
        $response = $this->http(185)->post("{$this->baseUrl}/chat", [
            'message'        => $message,
            'patient_id'     => $patientId,
            'profil_medical' => $profilMedical,
            'historique'     => $historique,
        ]);

        $response->throw();

        return $response->json();
    }

    /**
     * Extrait les entités (médicaments, dosages, fréquences) d'un message,
     * sans génération LLM. Rapide — utilisé pour bâtir une pré-commande.
     *
     * @return array<int, array{medicament:string, dosage:?string, frequence:?string}>
     */
    public function extract(string $message): array
    {
        $response = $this->http(20)->post("{$this->baseUrl}/extract", [
            'message' => $message,
        ]);

        $response->throw();

        return $response->json();
    }

    /**
     * Indexe une fiche médicament dans la base vectorielle.
     * À appeler lors de la création/MAJ d'un médicament au catalogue.
     */
    public function ingest(string $medicament, string $contenu, array $metadata = []): array
    {
        $response = $this->http(30)->post("{$this->baseUrl}/ingest", [
            'medicament' => $medicament,
            'contenu'    => $contenu,
            'metadata'   => $metadata,
        ]);

        $response->throw();

        return $response->json();
    }

    /**
     * Retire une fiche médicament de la base vectorielle.
     */
    public function remove(string|int $id): array
    {
        $response = $this->http(20)->delete("{$this->baseUrl}/ingest/{$id}");

        $response->throw();

        return $response->json();
    }
}
