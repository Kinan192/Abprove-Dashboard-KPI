<?php

namespace App\Http\Requests\Admin;

use App\Models\LoginEvent;
use App\Services\Admin\AccountService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Read filters for server-paginated logs (Admin log pages and the Super HC activity page). */
class LogFilterRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'search' => ['sometimes', 'nullable', 'string', 'max:160'],
            'role' => ['sometimes', 'nullable', Rule::in(AccountService::ROLES)],
            'action' => ['sometimes', 'nullable', 'string', 'max:80'],
            'event' => ['sometimes', 'nullable', Rule::in(LoginEvent::EVENTS)],
            'status' => ['sometimes', 'nullable', Rule::in(['queued', 'sent', 'failed'])],
            'from' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'between:10,100'],
        ];
    }

    /** Validated filters without empty values. */
    public function filters(): array
    {
        return array_filter($this->validated(), fn ($v) => $v !== null && $v !== '');
    }
}
