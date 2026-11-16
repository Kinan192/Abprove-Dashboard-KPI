<?php

namespace App\Http\Requests\Notification;

use App\Http\Requests\MutationRequest;

class NotificationReadRequest extends MutationRequest
{
    public function rules(): array
    {
        return $this->baseRules() + [
            'cycle_id' => ['required', 'integer', 'exists:assessment_cycles,id'],
            'keys' => ['sometimes', 'array', 'max:500'],
            'keys.*' => ['required', 'string', 'max:160', 'distinct'],
        ];
    }
}
