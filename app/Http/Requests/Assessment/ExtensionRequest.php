<?php

namespace App\Http\Requests\Assessment;

use App\Http\Requests\MutationRequest;

/**
 * Deadline extension mutations. Dates are WIB "Y-m-d\TH:i" (datetime-local); the service checks order and caps.
 *  - request (Kepala Unit / Kepala Divisi): cycle_id, due, reason
 *  - approve (Super HC): due, approval_due?, note?
 *  - reject (Super HC): note
 *  - grant (Super HC): cycle_id, role, division_id?, unit_id?, due, approval_due?, note?
 */
class ExtensionRequest extends MutationRequest
{
    public function rules(): array
    {
        $date = ['string', 'date_format:Y-m-d\TH:i'];
        $note = ['nullable', 'string', 'max:1000'];

        return $this->baseRules() + match ($this->route()->getActionMethod()) {
            'store' => ['cycle_id' => ['required', 'integer'], 'due' => ['required', ...$date], 'reason' => ['required', 'string', 'min:20', 'max:1000']],
            'approve' => ['due' => ['required', ...$date], 'approval_due' => ['nullable', ...$date], 'note' => $note],
            'reject' => ['note' => ['required', 'string', 'max:1000']],
            'grant' => ['cycle_id' => ['required', 'integer'], 'role' => ['required', 'in:kepala_unit,kepala_divisi,all'],
                'division_id' => ['nullable', 'integer', 'required_if:role,kepala_divisi'], 'unit_id' => ['nullable', 'integer', 'required_if:role,kepala_unit'],
                'due' => ['required', ...$date], 'approval_due' => ['nullable', ...$date], 'note' => $note],
            default => [],
        };
    }

    public function attributes(): array
    {
        return ['due' => 'tanggal baru', 'approval_due' => 'batas persetujuan', 'reason' => 'alasan', 'note' => 'catatan'];
    }
}
