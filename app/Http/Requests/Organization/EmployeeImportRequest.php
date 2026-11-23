<?php

namespace App\Http\Requests\Organization;

use App\Http\Requests\MutationRequest;
use App\Services\Organization\EmployeeImport;

/** Staff import: `preview` takes the uploaded sheet; `store` takes the previewed rows. Row content is checked by EmployeeImport. */
class EmployeeImportRequest extends MutationRequest
{
    public function rules(): array
    {
        if ($this->route()->getActionMethod() === 'preview') {
            return ['file' => ['required', 'file', 'max:2048', 'extensions:csv,xlsx']];
        }

        return $this->baseRules() + [
            'rows' => ['required', 'array', 'min:1', 'max:'.EmployeeImport::MAX_ROWS],
            'rows.*' => ['required', 'array:line,nip,full_name,position_code,unit_code,effective_month'],
            'rows.*.line' => ['required', 'integer', 'min:1', 'distinct'],
            'rows.*.nip' => ['present', 'nullable', 'string', 'max:255'],
            'rows.*.full_name' => ['present', 'nullable', 'string', 'max:255'],
            'rows.*.position_code' => ['present', 'nullable', 'string', 'max:255'],
            'rows.*.unit_code' => ['present', 'nullable', 'string', 'max:255'],
            'rows.*.effective_month' => ['present', 'nullable', 'string', 'max:32'],
            'confirmed' => ['required', 'accepted'],
        ];
    }

    public function attributes(): array
    {
        return ['file' => 'file staf', 'rows' => 'daftar staf', 'confirmed' => 'konfirmasi'];
    }
}
