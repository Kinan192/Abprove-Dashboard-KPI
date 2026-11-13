<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\MutationRequest;
use App\Rules\Score;

class AssessmentRequest extends MutationRequest
{
    public function rules(): array
    {
        $action = $this->route()->getActionMethod();
        $scores = [
            'scores' => ['required', 'array', 'min:1', 'max:200'],
            'scores.*' => ['required', 'array:source_kpi_item_id,score,inputs'],
            'scores.*.source_kpi_item_id' => ['required', 'integer', 'min:1', 'distinct'],
            'scores.*.score' => ['sometimes', new Score],
            'scores.*.inputs' => ['sometimes', 'array', 'max:26'],
            'scores.*.inputs.*' => ['numeric'],
            'positive_finding' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'negative_finding' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'status' => ['prohibited'], 'total_score_raw' => ['prohibited'], 'finalized_by' => ['prohibited'],
            'division_id' => ['prohibited'], 'unit_id' => ['prohibited'], 'assessment_kind' => ['prohibited'],
        ];

        return $this->baseRules() + match ($action) {
            'store' => ['cycle_id' => ['required', 'integer', 'min:1'],
                'employee_id' => [$this->is('unit/*') ? 'required' : 'prohibited', 'integer', 'min:1'],
                'subject_user_id' => [$this->is('division/*') ? 'required' : 'prohibited', 'integer', 'min:1']] + $scores,
            'resubmit' => ['lock_version' => ['required', 'integer', 'min:0']] + $scores,
            'bulk' => ['assessments' => ['required', 'array', 'min:1', 'max:100'], 'assessments.*' => ['required', 'array:id,lock_version'],
                'assessments.*.id' => ['required', 'integer', 'min:1', 'distinct'], 'assessments.*.lock_version' => ['required', 'integer', 'min:0']],
            default => ['lock_version' => ['required', 'integer', 'min:0'], 'reason' => [$action === 'returnAssessment' ? 'required' : 'sometimes', 'nullable', 'string', 'min:1', 'max:5000']],
        };
    }
}
