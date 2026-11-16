<?php

namespace App\Http\Requests\Organization;

use App\Http\Requests\MutationRequest;

class HeadReassignRequest extends MutationRequest
{
    public function rules(): array
    {
        return $this->baseRules() + HeadPreviewRequest::fields() + [
            'user_id' => ['exclude_if:operation,swap', 'required', 'integer', 'min:1'],
            'expected_assignment_id' => ['present', 'nullable', 'integer', 'min:1'],
            'target_expected_assignment_id' => ['exclude_unless:operation,move,swap', 'present', 'nullable', 'integer', 'min:1'],
            'confirmed' => ['required', 'accepted'],
            'reason' => ['required', 'string', 'max:2000'],
        ];
    }

    public function attributes(): array
    {
        return (new HeadPreviewRequest)->attributes();
    }
}
