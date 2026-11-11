<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class Score implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ((! is_int($value) && ! is_string($value)) || ! preg_match('/^(?:[1-9][0-9]|100)$/D', (string) $value)) {
            $fail('Nilai harus bilangan bulat antara 10 dan 100.');
        }
    }
}
