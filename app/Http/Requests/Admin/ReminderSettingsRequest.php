<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\MutationRequest;
use App\Services\Notification\AutoReminderService;
use Illuminate\Validation\Rule;

class ReminderSettingsRequest extends MutationRequest
{
    public function rules(): array
    {
        return $this->baseRules() + [
            'enabled' => ['required', 'boolean'],
            'offsets' => ['required', 'array', 'min:1', 'max:6'],
            'offsets.*' => ['required', 'integer', 'distinct', 'between:0,60'],
            'send_time' => ['required', 'date_format:H:i'],
            'targets' => ['required', 'array', 'min:1', 'max:2'],
            'targets.*' => ['required', 'distinct', Rule::in(array_keys(AutoReminderService::TARGETS))],
        ];
    }

    public function messages(): array
    {
        return [
            'offsets.required' => 'Isi minimal satu jadwal H-.', 'offsets.min' => 'Isi minimal satu jadwal H-.',
            'offsets.max' => 'Maksimal 6 jadwal H-.', 'offsets.*.integer' => 'Jadwal H- harus angka hari.',
            'offsets.*.distinct' => 'Jadwal H- tidak boleh ganda.', 'offsets.*.between' => 'Jadwal H- antara 0 dan 60 hari.',
            'send_time.*' => 'Jam kirim harus format JJ:MM.',
            'targets.required' => 'Pilih minimal satu penerima.', 'targets.min' => 'Pilih minimal satu penerima.',
            'targets.*.*' => 'Penerima tidak dikenal.', 'enabled.*' => 'Status otomatis tidak valid.',
        ];
    }
}
