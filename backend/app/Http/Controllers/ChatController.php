<?php

namespace App\Http\Controllers;

use App\Models\DiscussionLog;
use App\Services\IaClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    public function __construct(private readonly IaClient $ia) {}

    /**
     * Conversation patient : transmet la question au pipeline RAG,
     * journalise l'échange, retourne la réponse sourcée.
     *
     * Dégradation gracieuse : si le microservice IA est injoignable, on renvoie
     * une réponse prudente (HTTP 200) plutôt qu'une erreur serveur, pour ne pas
     * casser l'expérience patient.
     */
    public function chat(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        $user = $request->user();

        $profil = $user->profilMedical;
        $profilMedical = $profil ? [
            'allergies'      => $profil->allergies,
            'antecedents'    => $profil->antecedents,
            'age'            => $profil->age,
            'poids'          => $profil->poids,
            'sexe'           => $profil->sexe,
            'groupe_sanguin' => $profil->groupe_sanguin,
        ] : null;

        // Mémoire conversationnelle : 6 derniers échanges non-abstention, ordre chronologique.
        $historique = DiscussionLog::where('patient_id', $user->id)
            ->where('abstention', false)
            ->latest()
            ->limit(6)
            ->get(['message_utilisateur', 'reponse_ia'])
            ->reverse()
            ->values()
            ->map(fn ($log) => [
                'question' => $log->message_utilisateur,
                'reponse'  => $log->reponse_ia,
            ])
            ->all();

        try {
            $result = $this->ia->chat($data['message'], $user->id, $profilMedical, $historique);
        } catch (\Throwable $e) {
            Log::warning('Service IA indisponible (chat)', ['erreur' => $e->getMessage()]);

            return response()->json([
                'reponse' => "Le service d'assistance est momentanément indisponible. "
                    . 'Veuillez réessayer dans un instant ou contacter votre pharmacien.',
                'sources' => [],
                'entites' => [],
                'abstention' => true,
                'fidelite_estimee' => null,
                'service_indisponible' => true,
            ]);
        }

        $log = DiscussionLog::create([
            'patient_id' => $user->id,
            'message_utilisateur' => $data['message'],
            'reponse_ia' => $result['reponse'] ?? '',
            'fidelite_estimee' => $result['fidelite_estimee'] ?? null,
            'abstention' => $result['abstention'] ?? false,
        ]);

        return response()->json(array_merge($result, ['log_id' => $log->id]));
    }

    public function historique(Request $request): JsonResponse
    {
        $logs = DiscussionLog::where('patient_id', $request->user()->id)
            ->latest()
            ->limit(50)
            ->get();

        return response()->json($logs);
    }
}
