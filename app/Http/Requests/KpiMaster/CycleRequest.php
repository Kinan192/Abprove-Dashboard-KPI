<?php

namespace App\Http\Requests\KpiMaster;

use App\Http\Requests\MutationRequest;
use Illuminate\Validation\Rule;

class CycleRequest extends MutationRequest
{
    public function rules(): array
    {
        return $this->baseRules() + [
            'assessment_month' => ['required', 'date_format:Y-m-01'],
            'opens_at' => ['required', 'date_format:Y-m-d\TH:i:sP'],
            'submission_due_at' => ['required', 'date_format:Y-m-d\TH:i:sP', 'after:opens_at'],
            'approval_due_at' => ['required', 'date_format:Y-m-d\TH:i:sP', 'after_or_equal:submission_due_at'],
            'closes_at' => ['required', 'date_format:Y-m-d\TH:i:sP', 'after_or_equal:approval_due_at'],
            'status' => ['required', Rule::in(['planned', 'open', 'closed'])],
            'categories' => ['required', 'array', 'min:1', 'max:20'],
            'categories.*' => ['required', 'array:code,label,lower_bound,upper_bound'],
            'categories.*.code' => ['required', 'string', 'max:32', 'distinct'], 'categories.*.label' => ['required', 'string', 'max:90'],
            'categories.*.lower_bound' => ['required', 'numeric', 'between:0,100', 'regex:/^\d{1,3}(?:\.\d{1,6})?$/D'],
            'categories.*.upper_bound' => ['present', 'nullable', 'numeric', 'gt:0', 'lte:100', 'regex:/^\d{1,3}(?:\.\d{1,6})?$/D'],
        ];
    }
}
