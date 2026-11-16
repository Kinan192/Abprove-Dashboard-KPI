<?php

namespace App\Http\Requests\Organization;

use App\Services\Organization\HeadAssignmentService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class HeadPreviewRequest extends FormRequest
{
    public function rules(): array
    {
        return self::fields() + [
            'user_id' => ['nullable', 'integer', 'min:1'],
            'expected_assignment_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'target_expected_assignment_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ];
    }

    /** Operation shape shared with HeadReassignRequest. */
    public static function fields(): array
    {
        return [
            'operation' => ['required', Rule::in(HeadAssignmentService::OPERATIONS)],
            'area' => ['required', Rule::in(['units', 'divisions'])],
            'area_id' => ['required', 'integer', 'min:1'],
            'target_area_id' => ['exclude_unless:operation,move,swap', 'required', 'integer', 'min:1', 'different:area_id'],
        ];
    }

    public function attributes(): array
    {
        return ['area_id' => 'area asal', 'target_area_id' => 'area tujuan', 'user_id' => 'akun pengganti', 'reason' => 'alasan', 'confirmed' => 'konfirmasi'];
    }
}
