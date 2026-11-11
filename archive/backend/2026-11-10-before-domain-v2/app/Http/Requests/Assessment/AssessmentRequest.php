<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\MutationRequest;
use App\Rules\Score;

class AssessmentRequest extends MutationRequest
{
    public function rules(): array
    {
        $action = $this->route()->getActionMethod();

        return $this->baseRules() + match ($action) {
            'start' => ['employee_id' => ['required', 'integer', 'min:1'], 'cycle_id' => ['required', 'integer', 'min:1']],
            'draft' => [
                'lock_version' => ['required', 'integer', 'min:0'],
                'scores' => ['sometimes', 'array', 'max:200'], 'scores.*' => ['required', 'array:id,score'],
                'scores.*.id' => ['required', 'integer', 'min:1', 'distinct'],
                'scores.*.score' => ['present', 'nullable', new Score],
                'positive_finding' => ['sometimes', 'nullable', 'string', 'max:10000'],
                'negative_finding' => ['sometimes', 'nullable', 'string', 'max:10000'],
            ],
            'bulk' => [
                'assessments' => ['required', 'array', 'min:1', 'max:100'], 'assessments.*' => ['required', 'array:id,lock_version'],
                'assessments.*.id' => ['required', 'integer', 'min:1', 'distinct'], 'assessments.*.lock_version' => ['required', 'integer', 'min:0'],
            ],
            default => ['lock_version' => ['required', 'integer', 'min:0'], 'reason' => [
                $action === 'returnAssessment' ? 'required' : 'sometimes', 'nullable', 'string', 'min:3', 'max:5000',
            ]],
        };
    }
}
