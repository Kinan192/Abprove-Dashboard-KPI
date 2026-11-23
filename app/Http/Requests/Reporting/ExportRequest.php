<?php

namespace App\Http\Requests\Reporting;

use App\Services\Reporting\PeriodExport;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Period export query. Organization filters are checked against the actor scope by PeriodExport. */
class ExportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        // A non-string period (e.g. `period[]=`) fails the `period` rule with 422; it must not be used as a key here.
        $period = $this->input('period');
        $max = is_string($period) ? (PeriodExport::PERIODS[$period] ?? 12) : 12;

        return [
            'period' => ['required', 'string', Rule::in(array_keys(PeriodExport::PERIODS))],
            'year' => ['required', 'integer', 'between:2000,2100'],
            'index' => ['exclude_if:period,year', 'required', 'integer', 'min:1', 'max:'.$max],
            'division_id' => ['sometimes', 'integer', 'min:1', 'exists:divisions,id'],
            'unit_id' => ['sometimes', 'integer', 'min:1', 'exists:units,id'],
            'kind' => ['sometimes', 'in:member,unit_head'],
            'status' => ['sometimes', 'in:final,all'],
            'include_items' => ['sometimes', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return ['period' => 'jenis periode', 'year' => 'tahun', 'index' => 'bagian periode', 'division_id' => 'divisi', 'unit_id' => 'unit', 'kind' => 'jenis penilaian', 'status' => 'status'];
    }
}
