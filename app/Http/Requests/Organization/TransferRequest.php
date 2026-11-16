<?php

namespace App\Http\Requests\Organization;

use App\Http\Requests\MutationRequest;
use App\Services\Organization\PlacementService;

class TransferRequest extends MutationRequest
{
    public function rules(): array
    {
        return $this->baseRules() + [
            'items' => ['required', 'array', 'min:1', 'max:'.PlacementService::MAX_BATCH],
            'items.*.employee_id' => ['required', 'integer', 'min:1', 'distinct'],
            'items.*.expected_placement_id' => ['present', 'nullable', 'integer', 'min:1'],
            'unit_id' => ['required', 'integer', 'min:1'],
            'effective_from' => ['required', 'date_format:Y-m-01'],
            'confirmed' => ['required', 'accepted'],
            'reason' => ['required', 'string', 'max:2000'],
        ];
    }

    public function attributes(): array
    {
        return ['items' => 'daftar staf', 'unit_id' => 'unit tujuan', 'effective_from' => 'bulan efektif', 'reason' => 'alasan', 'confirmed' => 'konfirmasi'];
    }
}
