<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class KpiTemplateRequest extends MutationRequest
{
    public function rules(): array
    {
        return $this->baseRules() + [
            'scope_level' => ['required', Rule::in(['unit', 'division'])],
            'unit_id' => ['required_if:scope_level,unit', 'prohibited_unless:scope_level,unit', 'integer', 'min:1'],
            'division_id' => ['required_if:scope_level,division', 'prohibited_unless:scope_level,division', 'integer', 'min:1'],
            'name' => ['required', 'string', 'max:190'], 'effective_from' => ['required', 'date_format:Y-m-01'],
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*' => ['required', 'array:pillar,name,numerator,denominator,measurement_formula,target_text,weight_percent'],
            'items.*.pillar' => ['required', 'string', 'max:64'],
            'items.*.name' => ['required', 'string', 'max:500'], 'items.*.target_text' => ['required', 'string', 'max:500'],
            'items.*.numerator' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'items.*.denominator' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'items.*.measurement_formula' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'items.*.weight_percent' => ['required', 'numeric', 'gt:0', 'lte:100', 'regex:/^\\d{1,3}(?:\\.\\d{1,4})?$/D'],
            'position_id' => ['prohibited'], 'template_year' => ['prohibited'], 'status' => ['prohibited'],
        ];
    }
}
