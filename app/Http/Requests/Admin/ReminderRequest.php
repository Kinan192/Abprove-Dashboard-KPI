<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\MutationRequest;
use App\Services\Notification\ReminderService;
use Illuminate\Validation\Rule;

class ReminderRequest extends MutationRequest
{
    public function rules(): array
    {
        return $this->baseRules() + [
            'cycle_id' => ['required', 'integer', 'exists:assessment_cycles,id'],
            'target' => ['required', Rule::in(ReminderService::TARGETS)],
            'user_ids' => ['sometimes', 'array', 'min:1', 'max:1000'],
            'user_ids.*' => ['integer', 'distinct', 'min:1'],
            'subject' => ['required', 'string', 'max:190'],
            'message' => ['required', 'string', 'max:2000'],
        ];
    }
}
