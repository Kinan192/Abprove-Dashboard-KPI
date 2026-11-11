<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class KpiTemplateRequest extends MutationRequest
{
    public function rules(): array
    {
        if ($this->route()->getActionMethod() === 'publish') {
            return $this->baseRules();
        }

        return $this->baseRules() + [
            'position_id' => ['required', 'integer', 'min:1'], 'name' => ['required', 'string', 'max:190'],
            'template_year' => ['required', 'integer', 'between:2000,2200'],
            'effective_from' => ['required', 'date_format:Y-m-d'], 'effective_until' => ['required', 'date_format:Y-m-d', 'after_or_equal:effective_from'],
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*' => ['required', 'array:pillar,name,numerator,denominator,measurement_formula,target_text,weight_percent'],
            'items.*.pillar' => ['required', Rule::in(['Technical Care', 'Access', 'Coordination and Continuity', 'Interpersonal Care', 'Efficient'])],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.numerator' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'items.*.denominator' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'items.*.measurement_formula' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'items.*.target_text' => ['sometimes', 'nullable', 'string', 'max:255'],
            'items.*.weight_percent' => ['required', 'numeric', 'gt:0', 'lte:100', 'regex:/^\d{1,3}(?:\.\d{1,4})?$/D'],
        ];
    }
}
