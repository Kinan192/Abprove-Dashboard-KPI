<?php

namespace App\Http\Requests;

class RequestIdRequest extends MutationRequest
{
    public function rules(): array
    {
        return $this->baseRules();
    }
}
