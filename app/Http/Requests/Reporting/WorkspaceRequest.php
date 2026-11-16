<?php

namespace App\Http\Requests\Reporting;

use App\ViewModels\AbproveDesign;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class WorkspaceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $sections = array_unique(array_merge(...array_column(AbproveDesign::WORKSPACE_PROFILES, 'sections')));

        return [
            'page' => ['required', Rule::in(array_keys(AbproveDesign::WORKSPACE_PROFILES))],
            'cycle' => ['sometimes', 'date_format:Y-m'],
            'only' => ['sometimes', 'array', 'min:1'],
            'only.*' => ['string', Rule::in($sections)],
            'assessment_ids' => ['sometimes', 'array', 'max:100'],
            'assessment_ids.*' => ['integer', 'min:1'],
            'include_insights' => ['sometimes', 'boolean'],
        ];
    }
}
