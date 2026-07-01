<?php

namespace App\Http\Controllers;

use App\Models\DiscussionLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Feedback patient (👍/👎) sur les réponses du chatbot (RF-03 évaluation humaine).
 * Permet de constituer un jeu de données de validation complémentaire à RAGAS.
 */
class FeedbackController extends Controller
{
    public function store(Request $request, DiscussionLog $log): JsonResponse
    {
        // S'assurer que le patient ne peut noter que ses propres échanges.
        abort_if($log->patient_id !== $request->user()->id, 403);

        $data = $request->validate([
            'feedback'             => 'required|integer|in:-1,1',
            'feedback_commentaire' => 'nullable|string|max:500',
        ]);

        $log->update($data);

        return response()->json(['ok' => true]);
    }
}
