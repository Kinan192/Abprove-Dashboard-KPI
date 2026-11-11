<?php

namespace App\Http\Requests\Organization;

use App\Http\Requests\MutationRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class OrganizationRequest extends MutationRequest
{
    public function rules(): array
    {
        $action = $this->route()->getActionMethod();
        $base = $this->baseRules();
        if ($action === 'assignHead') {
            return $base + ['user_id' => ['required', 'integer', 'min:1'], 'expected_assignment_id' => ['present', 'nullable', 'integer', 'min:1'], 'confirmed' => ['required', 'accepted'], 'reason' => ['required', 'string', 'min:3', 'max:5000']];
        }
        if (in_array($action, ['revoke', 'grantHc'])) {
            return $base + ['reason' => ['required', 'string', 'min:3', 'max:5000']];
        }
        if ($action === 'place') {
            return $base + ['unit_id' => ['required', 'integer', 'min:1'], 'expected_placement_id' => ['present', 'nullable', 'integer', 'min:1'], 'confirmed' => ['required', 'accepted'], 'reason' => ['required', 'string', 'min:3', 'max:5000']];
        }
        $resource = $this->route('resource');
        $required = $action === 'store' ? 'required' : 'sometimes';
        if ($resource === 'users') {
            return $base + [
                'name' => [$required, 'string', 'max:160'], 'email' => ['sometimes', 'nullable', 'email', 'max:190'],
                'login_nip' => ['sometimes', 'nullable', 'string', 'max:64'],
                'password' => [$required, 'string', 'max:255', Password::min(12)->letters()->numbers()],
                'is_active' => ['sometimes', 'boolean'], 'roles' => ['sometimes', 'array', 'max:3'],
                'roles.*' => ['required', Rule::in(['super_hc', 'kepala_divisi', 'kepala_unit']), 'distinct'],
            ];
        }
        if ($resource === 'employees') {
            return $base + ['nip' => [$required, 'string', 'max:64'], 'full_name' => [$required, 'string', 'max:160'],
                'position_id' => [$required, 'integer', 'min:1'], 'user_id' => ['sometimes', 'nullable', 'integer', 'min:1'], 'is_active' => ['sometimes', 'boolean']];
        }

        return $base + ['code' => [$required, 'string', 'max:32'], 'name' => [$required, 'string', 'max:190'],
            'is_active' => ['sometimes', 'boolean']] + ($resource === 'units' ? ['division_id' => [$required, 'integer', 'min:1']] : []);
    }
}
