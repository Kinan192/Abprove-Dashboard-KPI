<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\MutationRequest;
use App\Services\Admin\AccountService;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AccountRequest extends MutationRequest
{
    public function rules(): array
    {
        if ($this->isMethod('DELETE')) {
            return $this->baseRules();
        }
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return $this->baseRules() + [
            'name' => [$required, 'string', 'max:160'],
            'email' => [$required, 'email', 'max:190'],
            'login_nip' => [$required, 'string', 'max:64'],
            'role_key' => [$required, Rule::in(AccountService::ROLES)],
            'password' => [$required, 'string', 'max:255', Password::min(12)->letters()->numbers()],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return ['name' => 'nama', 'login_nip' => 'NIP login', 'role_key' => 'role', 'password' => 'kata sandi'];
    }
}
