<?php

namespace App\Http\Requests\KpiMaster;

use App\Http\Requests\MutationRequest;
use App\Services\KpiMaster\KpiPatternImport;
use App\Support\TabularUpload;

/**
 * Pattern import file of the selected period; `revision` is required when committing. RSAB masters add
 * `sheets` (exact worksheet names) and both formats accept `edits` (explicit row corrections), each sent as
 * a JSON string or an array (bootstrap/app.php exempts `sheets.*` and `edits.*.sheet` from trimming).
 */
class KpiPatternImportRequest extends MutationRequest
{
    public function rules(): array
    {
        $rules = $this->baseRules() + [
            'month' => ['required', 'string', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/D'],
            'file' => ['required', 'file', 'max:2048', 'extensions:csv,xlsx'],
            // Only the commit (POST …/kpi-workspace/import) needs the workspace revision; the preview does not.
            'revision' => [$this->is('*/kpi-workspace/import') ? 'required' : 'nullable', 'integer', 'min:0'],
            'sheets' => ['nullable', 'array', 'max:100'],
            'sheets.*' => ['required', 'string', 'max:100', 'distinct'],
            'edits' => ['nullable', 'array', 'max:'.KpiPatternImport::MAX_ROWS],
            'edits.*' => ['required', 'array:sheet,line,fields,replace_rule'],
            'edits.*.sheet' => ['nullable', 'string', 'max:100'],
            'edits.*.line' => ['required', 'integer', 'min:1'],
            'edits.*.fields' => ['present', 'array:'.implode(',', KpiPatternImport::FIELDS)],
            'edits.*.fields.variables' => ['sometimes', 'array', 'list', 'max:26'],
            'edits.*.fields.variables.*' => ['required', 'array:key,label,source,value'],
            'edits.*.fields.variables.*.key' => ['required', 'string', 'size:1'],
            'edits.*.fields.variables.*.label' => ['nullable', 'string', 'max:150'],
            'edits.*.fields.variables.*.source' => ['required', 'in:manual,fixed'],
            'edits.*.fields.variables.*.value' => ['nullable', 'numeric'],
            'edits.*.replace_rule' => ['sometimes', 'boolean'],
        ];
        foreach (array_diff(KpiPatternImport::FIELDS, ['variables']) as $field) {
            $rules["edits.*.fields.{$field}"] = ['nullable', 'string', 'max:'.TabularUpload::MAX_CELL];
        }
        $rules['edits.*.fields.zeroRule'] = ['sometimes', 'in:pending,zero-pass'];

        return $rules;
    }

    public function messages(): array
    {
        return [
            'month.*' => 'Periode tujuan tidak valid. Muat ulang halaman.',
            'file.required' => 'Pilih file CSV atau XLSX.',
            'file.max' => 'Ukuran file maksimal 2 MB.',
            'file.extensions' => 'Gunakan file CSV atau XLSX.',
            'file.*' => 'File tidak dapat diunggah.',
            'sheets.*' => 'Pilihan lembar tidak valid. Muat ulang pilihan lembar.',
            'edits.*' => 'Perbaikan baris tidak valid. Muat ulang pratinjau.',
        ];
    }

    /** Selected worksheet names; null when not sent. */
    public function sheets(): ?array
    {
        $sheets = $this->validated('sheets');

        return $sheets === null ? null : array_values($sheets);
    }

    /**
     * Row corrections in canonical shape, ordered by sheet and line (a set: order is not meaningful).
     *
     * @return list<array{sheet: ?string, line: int, fields: array<string, string|list<array>>, replace_rule: bool}>
     */
    public function edits(): array
    {
        $edits = array_map(function (array $edit) {
            $fields = $edit['fields'] ?? [];
            foreach ($fields as $field => $value) {
                if ($field !== 'variables') {
                    $fields[$field] = (string) $value;
                }
            }
            ksort($fields);

            return ['sheet' => $edit['sheet'] ?? null, 'line' => (int) $edit['line'], 'fields' => $fields, 'replace_rule' => filter_var($edit['replace_rule'] ?? false, FILTER_VALIDATE_BOOL)];
        }, array_values($this->validated('edits') ?? []));
        usort($edits, fn ($a, $b) => [$a['sheet'] ?? '', $a['line']] <=> [$b['sheet'] ?? '', $b['line']]);

        return $edits;
    }

    /**
     * Idempotency payload of a commit: binds the file content, the sheet selection (as a set) and every
     * correction, so a retried request can only replay exactly the same import.
     *
     * @return array{request_id: string, revision: int, month: string, file: string, sheets: list<string>, edits: list<array>}
     */
    public function fingerprint(): array
    {
        $sheets = $this->sheets() ?? [];
        sort($sheets, SORT_STRING);

        return [
            'request_id' => $this->validated('request_id'),
            'revision' => (int) $this->validated('revision'),
            'month' => $this->validated('month'),
            'file' => hash_file('sha256', $this->file('file')->getRealPath()),
            'sheets' => $sheets,
            'edits' => $this->edits(),
        ];
    }

    protected function prepareForValidation(): void
    {
        foreach (['sheets', 'edits'] as $field) {
            $value = $this->input($field);
            if (is_string($value)) {
                $decoded = json_decode($value, true, 8);
                // Invalid JSON stays a string and fails the array rule.
                $this->merge([$field => is_array($decoded) ? $decoded : $value]);
            }
        }
    }
}
