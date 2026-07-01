<?php

namespace App\Http\Requests;

use App\Enums\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class AdminUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Accès déjà restreint au rôle admin par le middleware de route.
        return true;
    }

    public function rules(): array
    {
        $user = $this->route('user');
        $creation = $user === null;

        return [
            'name' => [$creation ? 'required' : 'sometimes', 'string', 'max:255'],
            'email' => [
                $creation ? 'required' : 'sometimes',
                'email',
                Rule::unique('users', 'email')->ignore($user?->id),
            ],
            'role' => [$creation ? 'required' : 'sometimes', new Enum(Role::class)],
            'password' => [$creation ? 'required' : 'nullable', 'string', 'min:8'],
        ];
    }
}
