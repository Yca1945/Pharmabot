<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Journal d'audit des actions sensibles (RGPD, traçabilité).
 * Réservé à l'administrateur.
 */
class AuditController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $query = AuditLog::with('user:id,name,email')->latest();

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }
        if ($request->filled('depuis')) {
            $query->whereDate('created_at', '>=', $request->input('depuis'));
        }
        if ($request->filled('jusqu')) {
            $query->whereDate('created_at', '<=', $request->input('jusqu'));
        }

        $logs = $query->paginate($request->integer('per_page', 20));

        return response()->json($logs);
    }
}
