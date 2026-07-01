<?php

namespace App\Http\Controllers;

use App\Services\IaClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/**
 * Sonde de santé : état de l'API, de la base et du microservice IA.
 * Utile pour le monitoring et le diagnostic (docs/TEST_E2E.md).
 */
class HealthController extends Controller
{
    public function __invoke(IaClient $ia): JsonResponse
    {
        $bdd = $this->verifier(fn () => DB::connection()->getPdo() !== null);
        $iaOk = $this->verifier(function () {
            $r = Http::timeout(3)->get(rtrim(env('IA_SERVICE_URL', 'http://ia-service:8001'), '/') . '/health');

            return $r->successful();
        });

        $global = $bdd && $iaOk;

        return response()->json([
            'status' => $global ? 'ok' : 'degraded',
            'services' => [
                'api' => 'ok',
                'database' => $bdd ? 'ok' : 'down',
                'ia' => $iaOk ? 'ok' : 'down',
            ],
        ], $global ? 200 : 503);
    }

    private function verifier(callable $check): bool
    {
        try {
            return (bool) $check();
        } catch (\Throwable) {
            return false;
        }
    }
}
