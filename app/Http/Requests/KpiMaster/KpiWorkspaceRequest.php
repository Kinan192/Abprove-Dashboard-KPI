<?php

namespace App\Http\Requests\KpiMaster;

use App\Http\Requests\MutationRequest;
use Illuminate\Validation\Validator;

class KpiWorkspaceRequest extends MutationRequest
{
    private const MAX_BYTES = 8 * 1024 * 1024;

    public function rules(): array
    {
        return $this->baseRules() + [
            'revision' => ['required', 'integer', 'min:0'],
            'data' => ['required', 'array:version,month,periods,patterns,patternAssignments'],
            'data.version' => ['required', 'integer', 'in:2'],
            'data.month' => ['required', 'string', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/D'],
            'data.periods' => ['required', 'array', 'min:1', 'max:600'],
            'data.patterns' => ['present', 'array', 'max:3000'],
            'data.patternAssignments' => ['present', 'array', 'max:200000'],
        ];
    }

    public function messages(): array
    {
        return [
            'data.array' => 'Data KPI hanya boleh berisi periode, pola KPI dan penugasan pola.',
            'data.version.in' => 'Versi data KPI tidak didukung. Muat ulang halaman.',
            'data.month.*' => 'Periode yang disimpan tidak valid. Muat ulang halaman.',
            'data.periods.required' => 'Minimal satu periode wajib ada.',
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if (strlen(json_encode($this->input('data'), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) > self::MAX_BYTES) {
                $validator->errors()->add('data', 'Data KPI melebihi 8 MB.');
            }
        }];
    }
}
