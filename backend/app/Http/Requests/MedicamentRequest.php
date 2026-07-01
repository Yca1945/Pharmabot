<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MedicamentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // L'accès est déjà restreint au rôle pharmacien par le middleware de route.
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('medicament')?->id;

        return [
            'designation' => ['required', 'string', 'max:255'],
            'code_barre' => ['nullable', 'string', 'max:50', Rule::unique('medicaments', 'code_barre')->ignore($id)],
            'quantite_stock' => ['required', 'integer', 'min:0'],
            'description_technique' => ['nullable', 'string'],
            'prix' => ['required', 'numeric', 'min:0'],
        ];
    }
}
