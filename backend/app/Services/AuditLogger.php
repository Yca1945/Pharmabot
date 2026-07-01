<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLogger
{
    public function log(
        string $action,
        ?Model $entite = null,
        array $meta = [],
        ?Request $request = null,
    ): AuditLog {
        return AuditLog::create([
            'user_id'     => Auth::id(),
            'action'      => $action,
            'entite_type' => $entite ? class_basename($entite) : null,
            'entite_id'   => $entite?->getKey(),
            'meta'        => $meta ?: null,
            'ip'          => $request?->ip(),
        ]);
    }
}
