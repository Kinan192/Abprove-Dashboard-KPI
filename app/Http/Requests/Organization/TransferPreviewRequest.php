<?php

namespace App\Http\Requests\Organization;

use App\Services\Organization\PlacementService;
use Illuminate\Foundation\Http\FormRequest;

class TransferPreviewRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'employee_ids' => ['required', 'array', 'min:1', 'max:'.PlacementService::MAX_BATCH],
            'employee_ids.*' => ['required', 'integer', 'min:1', 'distinct'],
            'unit_id' => ['nullable', 'integer', 'min:1'],
            'effective_from' => ['required', 'date_format:Y-m-01'],
        ];
    }

    public function attributes(): array
    {
        return ['employee_ids' => 'daftar staf', 'unit_id' => 'unit tujuan', 'effective_from' => 'bulan efektif'];
    }
}
