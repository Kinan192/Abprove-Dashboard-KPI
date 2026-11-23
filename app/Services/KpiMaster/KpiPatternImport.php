<?php

namespace App\Services\KpiMaster;

use App\Exceptions\BusinessRule;
use App\Support\TabularUpload;
use Illuminate\Http\UploadedFile;

/**
 * Pattern import of the selected period; nothing is stored here. Two formats:
 * - template (CSV/XLSX first sheet): one row per KPI, rows with the same "Pola" form one new pattern. The
 *   column order mirrors resources/js/kpi-workspace/pattern-import.js (template download).
 * - rsab (XLSX master, RsabMaster): HC picks sheets by exact name; each selected sheet becomes one pattern
 *   named after the trimmed sheet name.
 * Every row ends as canonical template cells checked with the same item rules as the pattern editor. HC may
 * correct a row with explicit canonical fields (`edits`); the source file itself is never changed.
 */
class KpiPatternImport
{
    public const MAX_ROWS = 1000;

    /** Header label => field, in template order. */
    public const COLUMNS = [
        'Pola' => 'pattern', 'Pilar' => 'pillar', 'KPI' => 'name', 'Satuan' => 'unit', 'Arah' => 'direction', 'Target' => 'target',
        'Bobot (%)' => 'weight', 'Variabel' => 'variables', 'Formula' => 'formula', 'Skor min' => 'min', 'Skor maks' => 'max',
    ];

    /** Item rule field => column shown with its message. */
    private const LABELS = [
        'pattern' => 'Pola', 'name' => 'KPI', 'pillar' => 'Pilar', 'method' => 'Formula', 'weight' => 'Bobot (%)', 'unit' => 'Satuan', 'target' => 'Target',
        'direction' => 'Arah', 'policy' => 'Skor min/maks', 'variables' => 'Variabel', 'formula' => 'Formula',
    ];

    private const DIRECTIONS = ['naik' => 'higher', 'tinggi' => 'higher', 'higher' => 'higher', 'turun' => 'lower', 'rendah' => 'lower', 'lower' => 'lower'];

    /** Editable canonical fields; variables use the shared editor's structured definition. */
    public const FIELDS = ['name', 'pillar', 'unit', 'direction', 'target', 'weight', 'variables', 'formula', 'min', 'max', 'zeroRule'];

    /** Source error field => item errors it already explains (shown once, at the source column). */
    private const COVERS = [
        'formula' => ['variables', 'method'], 'variables' => ['formula'], 'target' => ['unit', 'direction', 'policy'],
        'rule' => ['unit', 'direction', 'target', 'policy', 'formula', 'variables', 'method'],
    ];

    public function __construct(private TabularUpload $reader, private KpiItemRules $rules, private RsabMaster $master) {}

    /**
     * @param  list<string>  $taken  pattern names already used in the period
     * @param  ?list<string>  $sheets  exact worksheet names of an RSAB master; empty = sheet discovery only
     * @param  list<array{sheet: ?string, line: int, fields?: array<string, ?string>, replace_rule?: bool}>  $edits  explicit row corrections
     * @return array{format: string, sheets: list<array>, rows: list<array>, patterns: list<array>, valid: bool, errorCount: int, warningCount: int}
     */
    public function read(UploadedFile $file, string $month, array $taken, ?array $sheets = null, array $edits = []): array
    {
        $edits = $this->editIndex($edits);
        if (strtolower($file->getClientOriginalExtension()) === 'xlsx') {
            $book = $this->reader->workbook($file);
            if (! $this->isTemplate($book)) {
                return $this->rsab($book, $month, $taken, $sheets ?? [], $edits);
            }
        }
        if ($sheets) {
            throw new BusinessRule('IMPORT_SHEETS', 'Pilihan lembar hanya berlaku untuk master KPI RSAB.', 422);
        }
        $table = $this->reader->rows($file, self::MAX_ROWS);
        $expected = array_keys(self::COLUMNS);
        if (array_map($this->key(...), $table['header']) !== array_map($this->key(...), $expected)) {
            throw new BusinessRule('IMPORT_HEADERS', 'Kolom tidak sesuai template: '.implode(', ', $expected).'.', 422);
        }
        $prepared = [];
        foreach ($table['rows'] as $line => $values) {
            $cells = array_combine(array_values(self::COLUMNS), $values);
            $pattern = $cells['pattern'];
            unset($cells['pattern']);
            $source = ['target' => $cells['target'], 'formula' => $cells['formula'], 'weight' => $cells['weight'], 'rule' => '', 'numerator' => '', 'denominator' => ''];
            $edit = $this->take($edits, null, $line);
            if ($edit['replace'] ?? false) {
                throw new BusinessRule('IMPORT_EDITS', "Baris {$line}: tidak ada ketentuan sumber yang perlu diganti.", 422);
            }
            [$item, $errors, $cells, $edited] = $this->resolve($cells, null, [], $edit);
            $prepared[] = ['sheet' => null, 'line' => $line, 'group' => mb_strtolower($pattern), 'pattern' => $pattern, 'clash' => false, 'item' => $item, 'errors' => $errors, 'cells' => $cells,
                'edited' => $edited, 'ruleUnsupported' => false, 'source' => $source, 'warnings' => []];
        }
        $this->unused($edits);

        return ['format' => 'template', 'sheets' => []] + $this->assemble($prepared, $month, $taken, self::LABELS);
    }

    /** RSAB master: sheet discovery plus the rows of the selected sheets. */
    private function rsab(array $book, string $month, array $taken, array $selected, array $edits): array
    {
        $sheets = $this->master->discover($book);
        if (! RsabMaster::recognized($sheets)) {
            throw new BusinessRule('IMPORT_HEADERS', 'Kolom tidak sesuai template ('.implode(', ', array_keys(self::COLUMNS)).') maupun master KPI RSAB.', 422);
        }
        $byName = array_column($sheets, null, 'name');
        $chosen = [];
        foreach ($selected as $name) {
            if (! is_string($name) || ! isset($byName[$name])) {
                throw new BusinessRule('IMPORT_SHEETS', 'Lembar “'.(is_string($name) ? $name : '?').'” tidak ada di file. Muat ulang pilihan lembar.', 422);
            }
            if (isset($chosen[$name])) {
                throw new BusinessRule('IMPORT_SHEETS', "Lembar “{$name}” dipilih lebih dari sekali.", 422);
            }
            if (! $byName[$name]['supported']) {
                throw new BusinessRule('IMPORT_SHEETS', "Lembar “{$name}” tidak dapat diimpor: {$byName[$name]['reason']}", 422);
            }
            $chosen[$name] = true;
        }
        if (array_sum(array_map(fn ($name) => count($byName[$name]['rows']), array_keys($chosen))) > self::MAX_ROWS) {
            throw new BusinessRule('IMPORT_ROWS', 'Maksimal '.self::MAX_ROWS.' baris KPI per impor. Pilih lebih sedikit lembar.', 422);
        }
        // Sheets whose pattern names collide are reported, never merged.
        $labels = array_count_values(array_map(fn ($name) => mb_strtolower($byName[$name]['label']), array_keys($chosen)));
        $prepared = [];
        foreach ($sheets as $sheet) {
            if (! isset($chosen[$sheet['name']])) {
                continue;
            }
            foreach ($sheet['rows'] as $row) {
                $source = $this->master->convert($row['cells']);
                $edit = $this->take($edits, $sheet['name'], $row['line']);
                if (($edit['replace'] ?? false) && ! $source['ruleUnsupported']) {
                    throw new BusinessRule('IMPORT_EDITS', "Lembar “{$sheet['name']}” baris {$row['line']}: ketentuan sumber sudah dipetakan, tidak perlu diganti.", 422);
                }
                [$item, $errors, $cells, $edited] = $this->resolve($source['cells'], $source['variables'], $source['errors'], $edit);
                if ($source['transformed'] || $edited) {
                    // Provenance only (display); the executable definition is the validated item itself.
                    $item['importSource'] = ['sheet' => $sheet['name'], 'line' => $row['line'], 'target' => $source['source']['target'], 'formula' => $source['source']['formula'], 'rule' => $source['source']['rule']];
                }
                // The source states no direction for a plain target: "naik" is a default HC must review, unless corrected.
                $warnings = $source['assumedDirection'] && ! isset($edit['fields']['direction'])
                    ? [['column' => 'Arah', 'message' => 'Sumber tidak menetapkan arah; Naik digunakan. Tinjau sebelum impor.']] : [];
                $prepared[] = ['sheet' => $sheet['name'], 'line' => $row['line'], 'group' => $sheet['name'], 'pattern' => $sheet['label'], 'clash' => $labels[mb_strtolower($sheet['label'])] > 1,
                    'item' => $item, 'errors' => $errors, 'cells' => $cells, 'edited' => $edited, 'ruleUnsupported' => $source['ruleUnsupported'], 'source' => $source['source'], 'warnings' => $warnings];
            }
        }
        $this->unused($edits);
        $sheetList = array_map(fn ($s) => ['name' => $s['name'], 'label' => $s['label'], 'count' => count($s['rows']), 'supported' => $s['supported'], 'selected' => isset($chosen[$s['name']]), 'reason' => $s['reason']], $sheets);

        return ['format' => 'rsab', 'sheets' => $sheetList] + $this->assemble($prepared, $month, $taken, RsabMaster::LABELS);
    }

    /**
     * Groups prepared rows into new patterns and builds the preview rows.
     *
     * @return array{rows: list<array>, patterns: list<array>, valid: bool, errorCount: int, warningCount: int}
     */
    private function assemble(array $prepared, string $month, array $taken, array $labels): array
    {
        $taken = array_flip(array_map('mb_strtolower', $taken));
        $rows = [];
        $groups = [];
        foreach ($prepared as $row) {
            $errors = $row['errors'];
            $item = $row['item'];
            $name = $row['pattern'];
            if ($name === '' || mb_strlen($name) > 120) {
                $errors['pattern'] = 'nama pola wajib diisi, maksimal 120 karakter.';
            } elseif (isset($taken[mb_strtolower($name)])) {
                $errors['pattern'] = 'pola dengan nama ini sudah ada di periode ini. Ganti nama di file.';
            } elseif ($row['clash']) {
                $errors['pattern'] = 'nama pola sama dengan lembar terpilih lain. Ganti nama lembar di file.';
            } else {
                $groups[$row['group']] ??= ['name' => $name, 'sheet' => $row['sheet'], 'items' => [], 'lines' => []];
                if (count($groups[$row['group']]['items']) >= IntegratedKpiWorkspace::MAX_ITEMS) {
                    $errors['pattern'] = 'maksimal '.IntegratedKpiWorkspace::MAX_ITEMS.' KPI per pola.';
                } else {
                    $groups[$row['group']]['items'][] = $item;
                    $groups[$row['group']]['lines'][] = $row['line'];
                }
            }
            $rows[] = [
                'line' => $row['line'], 'sheet' => $row['sheet'], 'pattern' => $name, 'name' => $item['name'], 'pillar' => $item['pillar'], 'unit' => $item['unit'], 'direction' => $item['direction'],
                'target' => $item['target'], 'weight' => $item['weight'], 'formula' => $item['formula'], 'variables' => $item['variables'], 'policy' => $item['policy'],
                'source' => $row['source'], 'cells' => $row['cells'], 'edited' => $row['edited'], 'ruleUnsupported' => $row['ruleUnsupported'], 'warnings' => $row['warnings'],
                'errors' => array_values(array_map(fn ($field, $message) => ['column' => $labels[$field] ?? $field, 'message' => $this->sentence($message)], array_keys($errors), $errors)),
            ];
        }
        $patterns = [];
        foreach ($groups as $group) {
            $total = '0';
            foreach ($group['items'] as $item) {
                $total = bcadd($total, number_format((float) $item['weight'], 4, '.', ''), 4);
            }
            $patterns[] = ['id' => 'pola-'.bin2hex(random_bytes(6)), 'name' => $group['name'], 'periodId' => $month, 'items' => $group['items'], 'sheet' => $group['sheet'],
                'total' => (float) $total, 'complete' => bccomp($total, '100', 4) === 0, 'lines' => $group['lines']];
        }
        $errorCount = array_sum(array_map(fn ($r) => count($r['errors']), $rows));

        return ['rows' => $rows, 'patterns' => $patterns, 'valid' => $errorCount === 0 && $patterns, 'errorCount' => $errorCount, 'warningCount' => array_sum(array_map(fn ($r) => count($r['warnings']), $rows))];
    }

    /**
     * Applies an explicit correction to the canonical cells and validates the result. Source errors stay
     * unless their field was corrected; an unsupported source rule only goes with replace_rule plus a formula.
     *
     * @param  ?list<array>  $variables  source variables (kept exactly unless "variables" is corrected)
     * @return array{0: array, 1: array<string, string>, 2: array<string, string>, 3: bool} item, errors, cells, edited
     */
    private function resolve(array $cells, ?array $variables, array $sourceErrors, ?array $edit): array
    {
        $fields = $edit['fields'] ?? [];
        if (isset($fields['variables'])) {
            $variables = $fields['variables'];
            // Display only: labels may contain semicolons or equals signs, so never reparse this text.
            $fields['variables'] = implode('; ', array_map(fn ($v) => "{$v['key']}: {$v['label']}".($v['source'] === 'fixed' ? ' = '.($v['value'] ?? '') : ''), $variables));
        }
        $cells = array_replace($cells, $fields);
        foreach (array_keys($fields) as $field) {
            unset($sourceErrors[in_array($field, ['min', 'max', 'zeroRule'], true) ? 'policy' : $field]);
        }
        if (($edit['replace'] ?? false) && trim($fields['formula'] ?? '') !== '') {
            unset($sourceErrors['rule']);
        }
        [$item, $itemErrors] = $this->item($cells, $variables);
        $covered = [];
        foreach (array_keys($sourceErrors) as $field) {
            $covered += array_flip([$field, ...(self::COVERS[$field] ?? [])]);
        }

        return [$item, $sourceErrors + array_diff_key($itemErrors, $covered), $cells, $fields !== [] || ($edit['replace'] ?? false)];
    }

    /** @return array<string, array{sheet: ?string, line: int, fields: array<string, string|list<array>>, replace: bool}> keyed by sheet + line */
    private function editIndex(array $edits): array
    {
        if (count($edits) > self::MAX_ROWS) {
            throw new BusinessRule('IMPORT_EDITS', 'Maksimal '.self::MAX_ROWS.' perbaikan baris.', 422);
        }
        $index = [];
        foreach ($edits as $edit) {
            $line = $edit['line'] ?? null;
            $sheet = $edit['sheet'] ?? null;
            $fields = $edit['fields'] ?? [];
            if (! is_array($edit) || array_diff(array_keys($edit), ['sheet', 'line', 'fields', 'replace_rule']) || ($sheet !== null && ! is_string($sheet))
                || ! (is_int($line) || (is_string($line) && ctype_digit($line))) || (int) $line < 1 || ! is_array($fields) || array_diff(array_keys($fields), self::FIELDS)) {
                throw new BusinessRule('IMPORT_EDITS', 'Perbaikan baris tidak valid. Muat ulang pratinjau.', 422);
            }
            $clean = [];
            foreach ($fields as $field => $value) {
                if ($field === 'variables') {
                    if (! is_array($value) || ! array_is_list($value) || count($value) > KpiItemRules::MAX_VARIABLES) {
                        throw new BusinessRule('IMPORT_EDITS', 'Definisi variabel tidak valid.', 422);
                    }
                    $clean[$field] = [];
                    foreach ($value as $variable) {
                        if (! is_array($variable) || array_diff(array_keys($variable), ['key', 'label', 'source', 'value'])
                            || ! is_string($variable['key'] ?? '') || ! is_string($variable['label'] ?? '') || ! is_string($variable['source'] ?? '')
                            || (isset($variable['value']) && ! is_scalar($variable['value']))) {
                            throw new BusinessRule('IMPORT_EDITS', 'Definisi variabel tidak valid.', 422);
                        }
                        $row = ['key' => trim($variable['key'] ?? ''), 'label' => trim($variable['label'] ?? ''), 'source' => trim($variable['source'] ?? '')];
                        if ($row['source'] === 'fixed') {
                            $row['value'] = $this->number((string) ($variable['value'] ?? ''));
                        }
                        $clean[$field][] = $row;
                    }

                    continue;
                }
                if (($value !== null && ! is_string($value)) || mb_strlen((string) $value) > TabularUpload::MAX_CELL) {
                    throw new BusinessRule('IMPORT_EDITS', 'Perbaikan baris tidak valid. Muat ulang pratinjau.', 422);
                }
                $clean[$field] = trim((string) $value);
            }
            $key = json_encode([$sheet, (int) $line]);
            if (isset($index[$key])) {
                throw new BusinessRule('IMPORT_EDITS', ucfirst($this->where($sheet, (int) $line)).' diperbaiki lebih dari sekali.', 422);
            }
            $index[$key] = ['sheet' => $sheet, 'line' => (int) $line, 'fields' => $clean, 'replace' => filter_var($edit['replace_rule'] ?? false, FILTER_VALIDATE_BOOL)];
        }

        return $index;
    }

    private function take(array &$edits, ?string $sheet, int $line): ?array
    {
        $key = json_encode([$sheet, $line]);
        $edit = $edits[$key] ?? null;
        unset($edits[$key]);

        return $edit;
    }

    /** Corrections must target a KPI row of the file / selected sheets. */
    private function unused(array $edits): void
    {
        if ($edit = reset($edits)) {
            throw new BusinessRule('IMPORT_EDITS', 'Perbaikan untuk '.$this->where($edit['sheet'], $edit['line']).' tidak cocok dengan baris KPI yang dipilih. Muat ulang pratinjau.', 422);
        }
    }

    private function where(?string $sheet, int $line): string
    {
        return $sheet === null ? "baris {$line}" : "lembar “{$sheet}” baris {$line}";
    }

    /** XLSX whose first sheet starts with the template header. */
    private function isTemplate(array $book): bool
    {
        $rows = $book[0]['rows'] ?? null;
        if (! $rows) {
            return false;
        }
        ksort($rows);
        $first = reset($rows);
        $values = [];
        for ($col = 1; $col <= max(array_keys($first)); $col++) {
            $values[] = $first[$col]['value'] ?? '';
        }

        return array_map($this->key(...), $values) === array_map($this->key(...), array_keys(self::COLUMNS));
    }

    private function key(string $value): string
    {
        return mb_strtolower(preg_replace('/\s+/u', ' ', $value));
    }

    /** Pattern in the stored workspace shape (preview-only keys removed). */
    public static function stored(array $pattern): array
    {
        return ['id' => $pattern['id'], 'name' => $pattern['name'], 'periodId' => $pattern['periodId'], 'items' => $pattern['items']];
    }

    /**
     * @param  ?list<array>  $variables  already-structured variables (RSAB source labels); null parses the "Variabel" cell
     * @return array{0: array, 1: array<string, string>} normalized workspace item and its errors
     */
    private function item(array $cell, ?array $variables = null): array
    {
        $errors = [];
        $direction = self::DIRECTIONS[mb_strtolower($cell['direction'])] ?? '';
        $target = $this->number($cell['target']);
        $weight = $this->number($cell['weight']);
        if ($weight !== null && abs(round($weight, 4) - $weight) > 1e-9) {
            $errors['weight'] = 'bobot maksimal 4 desimal.';
        }
        $weight = $weight === null ? null : round($weight, 4);
        $min = $cell['min'] === '' ? 10.0 : $this->number($cell['min']);
        $max = $cell['max'] === '' ? 100.0 : $this->number($cell['max']);
        [$variables, $variableError] = $variables === null ? $this->variables($cell['variables']) : [$variables, null];
        $unit = mb_strtolower($cell['unit']) === 'persen' ? '%' : $cell['unit'];
        $item = [
            'id' => 'kpi-'.bin2hex(random_bytes(6)), 'name' => $cell['name'], 'pillar' => $cell['pillar'], 'method' => 'formula', 'weight' => $weight,
            'variables' => $variables, 'formula' => ltrim($cell['formula'], '= '), 'target' => $target, 'unit' => $unit, 'direction' => $direction,
            // Target 0 has one valid conversion: a zero result passes with the maximum score.
            'policy' => ['rule' => $direction === 'lower' ? 'reverse-positive' : 'target-normalized', 'zeroRule' => $cell['zeroRule'] ?? ($target === 0.0 ? 'zero-pass' : 'pending'), 'min' => $min, 'max' => $max],
        ];
        $errors += $this->rules->errors($item);
        if ($variableError) {
            $errors['variables'] = $variableError;
        }
        if ($cell['direction'] !== '' && $direction === '') {
            $errors['direction'] = 'isi Arah dengan naik atau turun.';
        }
        foreach (['target' => 'Target', 'weight' => 'Bobot', 'min' => 'Skor min', 'max' => 'Skor maks'] as $field => $label) {
            if ($cell[$field] !== '' && $this->number($cell[$field]) === null) {
                $errors[$field === 'min' || $field === 'max' ? 'policy' : $field] = "{$label} harus berupa angka.";
            }
        }

        return [$item, $errors];
    }

    /**
     * "A: Dokumen lengkap; B: Total dokumen; C: Pengali = 100" → manual A, B and fixed C (100).
     *
     * @return array{0: list<array>, 1: ?string}
     */
    private function variables(string $text): array
    {
        $variables = [];
        foreach (preg_split('/\s*[;\r\n]+\s*/u', $text, -1, PREG_SPLIT_NO_EMPTY) as $part) {
            if (! preg_match('/^([A-Za-z])\s*[:=]\s*(.+?)(?:\s*=\s*(-?[\d.,]+))?$/Du', $part, $m)) {
                return [$variables, "tulis “Kode: Nama”, mis. A: Dokumen lengkap (bagian “{$part}”)."];
            }
            $variable = ['key' => strtoupper($m[1]), 'label' => trim($m[2]), 'source' => isset($m[3]) ? 'fixed' : 'manual'];
            if (isset($m[3])) {
                $variable['value'] = $this->number($m[3]);
            }
            $variables[] = $variable;
        }

        return [$variables, null];
    }

    /** Plain decimal cell ("92,5", "92.5", "95%"); null when empty or not a number. */
    private function number(string $value): ?float
    {
        $value = rtrim(str_replace(' ', '', $value), '%');
        if (str_contains($value, ',') && ! str_contains($value, '.')) {
            $value = str_replace(',', '.', $value);
        }
        if (! preg_match('/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/D', $value)) {
            return null;
        }
        $number = (float) $value;

        return is_finite($number) ? $number : null;
    }

    private function sentence(string $message): string
    {
        return mb_strtoupper(mb_substr($message, 0, 1)).mb_substr($message, 1);
    }
}
