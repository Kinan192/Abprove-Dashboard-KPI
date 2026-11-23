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
        $lock = ['lock_version' => ['required', 'integer', 'min:0']];
        // Division head reviewed scores: the unit head's proposal, measurements and findings are never rewritten.
        $review = fn (bool $required) => [
            'reviews' => [$required ? 'required' : 'sometimes', 'array', 'min:1', 'max:200'],
            'reviews.*' => ['required', 'array:source_kpi_item_id,score,note'],
            'reviews.*.source_kpi_item_id' => ['required', 'integer', 'min:1', 'distinct'],
            'reviews.*.score' => ['present', 'nullable', 'numeric', 'between:0,100', 'decimal:0,2'],
            'reviews.*.note' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'scores' => ['prohibited'], 'positive_finding' => ['prohibited'], 'negative_finding' => ['prohibited'],
        ];

        return $this->baseRules() + match ($action) {
            'store' => ['cycle_id' => ['required', 'integer', 'min:1'],
                'employee_id' => [$this->is('unit/*') ? 'required' : 'prohibited', 'integer', 'min:1'],
                'subject_user_id' => [$this->is('division/*') ? 'required' : 'prohibited', 'integer', 'min:1']] + $scores,
            'resubmit' => $lock + $scores,
            'adjust' => $lock + $review(true),
            'approve' => $lock + $review(false),
            'returnAssessment' => $lock + ['reason' => ['sometimes', 'nullable', 'string', 'max:5000'],
                'item_notes' => ['sometimes', 'array', 'max:200'], 'item_notes.*' => ['required', 'array:source_kpi_item_id,note'],
                'item_notes.*.source_kpi_item_id' => ['required', 'integer', 'min:1', 'distinct'], 'item_notes.*.note' => ['present', 'nullable', 'string', 'max:2000']],
            'bulk' => ['assessments' => ['required', 'array', 'min:1', 'max:100'], 'assessments.*' => ['required', 'array:id,lock_version'],
                'assessments.*.id' => ['required', 'integer', 'min:1', 'distinct'], 'assessments.*.lock_version' => ['required', 'integer', 'min:0']],
            default => $lock + ['reason' => ['sometimes', 'nullable', 'string', 'min:1', 'max:5000']],
        };
    }
}
