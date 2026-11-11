<?php

namespace App\Http\Requests\Organization;

use App\Http\Requests\MutationRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class OrganizationRequest extends MutationRequest
{
    public function rules(): array
    {
        $a = $this->route()->getActionMethod();
        $base = $this->baseRules();
        if ($a === 'destroy') {
            return $base;
        }
        if ($a === 'assignHead') {
            return $base + ['user_id' => ['required', 'integer', 'min:1'], 'expected_assignment_id' => ['present', 'nullable', 'integer', 'min:1'], 'confirmed' => ['required', 'accepted'], 'reason' => ['required', 'string', 'min:1', 'max:5000']];
        }
        if (in_array($a, ['revoke', 'grantHc'])) {
            return $base + ['reason' => ['required', 'string', 'min:1', 'max:5000']];
        }
        if ($a === 'place') {
            return $base + ['unit_id' => ['required', 'integer', 'min:1'], 'effective_from' => ['required', 'date_format:Y-m-01'], 'expected_placement_id' => ['present', 'nullable', 'integer', 'min:1'], 'confirmed' => ['required', 'accepted'], 'reason' => ['required', 'string', 'min:1', 'max:5000']];
        }
        $resource = $this->route('resource');
        $required = $a === 'store' ? 'required' : 'sometimes';
        if ($resource === 'users') {
            return $base + [
                'name' => [$required, 'string', 'max:160'], 'email' => [$required, 'email', 'max:190'], 'login_nip' => [$required, 'string', 'max:64'],
                'role_key' => [$required, Rule::in(['super_hc', 'kepala_divisi', 'kepala_unit'])],
                'password' => [$required, 'string', 'max:255', Password::min(12)->letters()->numbers()],
                'is_active' => ['sometimes', 'boolean'], 'roles' => ['prohibited'],
            ];
        }
        if ($resource === 'employees') {
            return $base + [
                'nip' => [$required, 'string', 'max:64'], 'full_name' => [$required, 'string', 'max:160'], 'position_id' => [$required, 'integer', 'min:1'],
                'unit_id' => [$a === 'store' ? 'required' : 'prohibited', 'integer', 'min:1'],
                'effective_from' => ['sometimes', 'date_format:Y-m-01'], 'is_active' => ['sometimes', 'boolean'], 'user_id' => ['prohibited'], 'email' => ['prohibited'], 'password' => ['prohibited'],
            ];
        }

        return $base + ['code' => ['sometimes', 'string', 'max:32'], 'name' => [$required, 'string', 'max:190'], 'is_active' => ['sometimes', 'boolean']] +
            (in_array($resource, ['divisions', 'units']) ? ['head_user_id' => [$required, 'integer', 'min:1'], 'expected_assignment_id' => ['sometimes', 'nullable', 'integer', 'min:1'], 'confirmed' => ['sometimes', 'accepted'], 'reason' => ['sometimes', 'nullable', 'string', 'max:5000']] : []) +
            ($resource === 'units' ? ['division_id' => [$required, 'integer', 'min:1']] : []);
    }
}
