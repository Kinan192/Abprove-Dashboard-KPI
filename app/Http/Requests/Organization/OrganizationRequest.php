<?php

namespace App\Http\Requests\Organization;

use App\Http\Requests\MutationRequest;

class OrganizationRequest extends MutationRequest
{
    public function rules(): array
    {
        $a = $this->route()->getActionMethod();
        $base = $this->baseRules();
        if ($a === 'destroy') {
            return $base;
        }
        $resource = $this->route('resource');
        $required = $a === 'store' ? 'required' : 'sometimes';
        if ($resource === 'employees') {
            return $base + [
                'nip' => [$required, 'string', 'max:64'], 'full_name' => [$required, 'string', 'max:160'], 'position_id' => [$required, 'integer', 'min:1'],
                'unit_id' => [$a === 'store' ? 'required' : 'prohibited', 'integer', 'min:1'],
                'effective_from' => ['sometimes', 'date_format:Y-m-01'], 'is_active' => ['sometimes', 'boolean'], 'user_id' => ['prohibited'], 'email' => ['prohibited'], 'password' => ['prohibited'],
            ];
        }

        return $base + ['code' => ['sometimes', 'string', 'max:32'], 'name' => [$required, 'string', 'max:190'], 'is_active' => ['sometimes', 'boolean']] +
            (in_array($resource, ['divisions', 'units']) ? ['head_user_id' => [$required, 'integer', 'min:1']] : []) +
            ($resource === 'units' ? ['division_id' => [$required, 'integer', 'min:1']] : []);
    }
}
