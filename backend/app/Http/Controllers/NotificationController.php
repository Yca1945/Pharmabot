<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Notifications in-app du patient (canal "database").
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'non_lues' => $request->user()->unreadNotifications()->count(),
            'notifications' => $request->user()->notifications()->limit(30)->get(),
        ]);
    }

    public function marquerLu(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['ok' => true]);
    }

    public function marquerToutLu(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['ok' => true]);
    }
}
