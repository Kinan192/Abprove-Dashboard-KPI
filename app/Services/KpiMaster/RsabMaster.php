<?php

namespace App\Services\KpiMaster;

/**
 * RSAB master KPI workbook (one sheet per position/unit). The KPI table of a sheet is found by its header
 * labels (not by sheet name, year or position); derived output columns (Approval, NILAI, JAN–DEC) and
 * everything from the TOTAL row down (instructions, reference lists) are ignored. Each definition row is
 * translated into the canonical pattern-import cells; only exact translations are made, anything ambiguous
 * stays a row error that HC resolves in the file or with an explicit correction.
 */
final class RsabMaster
{
    /** Canonical field => source column shown with its error. */
    public const LABELS = [
        'pattern' => 'Pola', 'name' => 'KPI', 'pillar' => 'Pillar', 'method' => 'Formula Pengukuran', 'weight' => 'Bobot KPI', 'unit' => 'Satuan', 'target' => 'Target',
        'direction' => 'Arah', 'policy' => 'Skor min/maks', 'variables' => 'Numerator/Denominator', 'formula' => 'Formula Pengukuran', 'rule' => 'Ketentuan Pembobotan',
    ];

    /** Normalized header label => field. */
    private const HEADERS = [
        'no' => 'no', 'no.' => 'no', 'pillar' => 'pillar', 'pilar' => 'pillar', 'kpi' => 'name', 'numerator' => 'numerator', 'denominator' => 'denominator',
        'formula pengukuran' => 'formula', 'target' => 'target', 'bobot kpi' => 'weight', 'ketentuan pembobotan' => 'rule',
    ];

    private const REQUIRED = ['pillar', 'name', 'numerator', 'denominator', 'formula', 'target', 'weight'];

    /** Source column => canonical field its cell error belongs to. */
    private const CELL_FIELD = ['pillar' => 'pillar', 'name' => 'name', 'numerator' => 'variables', 'denominator' => 'variables', 'formula' => 'formula', 'target' => 'target', 'weight' => 'weight', 'rule' => 'rule'];

    /** The header is searched in the first rows only. */
    private const HEADER_ROWS = 10;

    /** Label of the row that closes the KPI table. */
    private const TOTALS = ['total', 'jumlah', 'total bobot', 'jumlah bobot', 'grand total'];

    private const COMPLEMENT = ['<' => '>=', '>=' => '<', '<=' => '>', '>' => '<='];

    private const NUMBER = '(\d+(?:\.\d+|,\d{1,2})?)';

    /**
     * @param  list<array{name: string, hidden: bool, rows: ?array}>  $book  TabularUpload::workbook()
     * @return list<array{name: string, label: string, supported: bool, reason: ?string, rows: list<array{line: int, cells: array<string, array>}>}>
     */
    public function discover(array $book): array
    {
        $sheets = [];
        foreach ($book as $sheet) {
            [$rows, $reason] = match (true) {
                $sheet['rows'] === null => [[], 'Bukan lembar tabel.'],
                ! $sheet['rows'] => [[], 'Lembar kosong.'],
                default => $this->table($sheet['rows']),
            };
            if (! $rows && $reason === null) {
                $reason = 'Tidak ada baris KPI.';
            }
            $sheets[] = ['name' => $sheet['name'], 'label' => $this->clean($sheet['name']), 'supported' => $reason === null, 'reason' => $reason, 'rows' => $rows];
        }

        return $sheets;
    }

    /** Whether any sheet carries the master KPI header. */
    public static function recognized(array $sheets): bool
    {
        foreach ($sheets as $sheet) {
            if ($sheet['supported'] || ! in_array($sheet['reason'], ['Bukan lembar tabel.', 'Lembar kosong.', 'Judul kolom master KPI tidak ditemukan.'], true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Canonical cells of one KPI row (strings in the template convention), the source variables, the errors
     * keyed by canonical field and the raw source shown to HC. `assumedDirection`: a plain nonzero target
     * without an explicit weighting rule; the source states no direction, so "naik" is a default.
     *
     * @return array{cells: array<string, string>, variables: list<array>, errors: array<string, string>, source: array<string, string>, ruleUnsupported: bool, transformed: bool, assumedDirection: bool}
     */
    public function convert(array $defs): array
    {
        $errors = [];
        $raw = [];
        foreach (array_keys(self::CELL_FIELD) as $field) {
            $cell = $defs[$field] ?? null;
            if ($cell && ($cell['kind'] === 'formula' || $cell['kind'] === 'error')) {
                $errors[self::CELL_FIELD[$field]] ??= "sel {$cell['ref']} berisi ".($cell['kind'] === 'formula' ? 'formula' : 'error').' Excel; isi nilai tetap.';
                $cell = null;
            }
            $raw[$field] = $cell;
        }
        $text = fn (string $field) => $raw[$field] ? $this->clean($raw[$field]['value']) : '';
        $label = fn (string $field) => $text($field) === '-' ? '' : $text($field);
        $source = ['target' => $this->display($defs['target'] ?? null), 'formula' => $this->display($defs['formula'] ?? null), 'weight' => $this->display($defs['weight'] ?? null),
            'rule' => $this->display($defs['rule'] ?? null), 'numerator' => $this->display($defs['numerator'] ?? null), 'denominator' => $this->display($defs['denominator'] ?? null)];

        [$weight, $error] = $this->weight($raw['weight']);
        if ($error) {
            $errors['weight'] ??= $error;
        }
        [$measure, $error] = $raw['formula'] ? $this->measure($text('formula'), $label('numerator'), $label('denominator')) : [null, isset($errors['formula']) ? null : 'Formula Pengukuran kosong.'];
        if ($error) {
            $errors['formula'] ??= $error;
        }
        [$target, $error] = $raw['target'] ? $this->target($raw['target']) : [null, isset($errors['target']) ? null : 'Target kosong.'];
        if ($error) {
            $errors['target'] ??= $error;
        }
        $rule = isset($errors['rule']) ? ['type' => 'none'] : $this->rule($text('rule'), $weight);

        $cells = ['name' => $text('name'), 'pillar' => $text('pillar'), 'unit' => '', 'direction' => '', 'target' => '', 'weight' => $weight === null ? '' : self::number($weight),
            'variables' => '', 'formula' => '', 'min' => '', 'max' => ''];
        $variables = $measure['variables'] ?? [];
        $cells['variables'] = implode('; ', array_map(fn ($v) => "{$v['key']}: {$v['label']}", $variables));
        $scale = null;
        if ($measure) {
            $scale = $measure['count'] ? 'count' : match ($measure['multiplier']) {
                100 => 'percent', 1000 => 'permille', default => $target && $target['percent'] ? 'percent' : 'plain',
            };
            $cells['formula'] = $measure['expression'].match ($scale) { 'percent' => '*100', 'permille' => '*1000', default => '' };
        }

        $unsupported = $rule['type'] === 'unsupported' || isset($errors['rule']);
        $transformed = false;
        $applied = false;
        $assumed = false;
        if ($measure && $target && ! $unsupported) {
            $zero = $target['value'] == 0;
            $mismatch = match (true) {
                $target['percent'] && ! $zero && $scale !== 'percent' => 'target persen tidak cocok dengan Formula Pengukuran.',
                ! $target['percent'] && ! $zero && $scale === 'percent' && $target['words'] === null => 'target harus persen karena formula dikali 100%.',
                ! $zero && $scale === 'permille' => 'target per mil (‰) tidak dapat dibaca; tulis angka per mil.',
                $target['words'] !== null && $scale !== 'count' => 'satuan target tidak cocok dengan Formula Pengukuran.',
                default => null,
            };
            if ($mismatch) {
                $errors['target'] ??= $mismatch;
            } else {
                $unit = match ($scale) { 'percent' => '%', 'permille' => '‰', 'plain' => 'rasio', default => $target['words'] ?? $measure['unit'] };
                $kind = $target['cmp'] !== null ? 'threshold' : ($zero ? 'zero' : 'proportional');
                $agrees = match ($rule['type']) {
                    'none' => true,
                    'proportional' => $kind === 'proportional',
                    'zero' => $kind === 'zero',
                    'binary' => $kind === 'threshold' && $rule['pass']['op'] === $target['cmp'] && $rule['pass']['value'] == $target['value'] && $rule['pass']['percent'] === $target['percent'],
                };
                if (! $agrees) {
                    $unsupported = true;
                } elseif ($kind === 'threshold') {
                    // A strict/inclusive target threshold scores all or nothing, exactly as the comparison states.
                    $cells = ['formula' => 'IF('.$cells['formula'].$target['cmp'].self::number($target['value']).',100,0)', 'target' => '100', 'unit' => 'poin', 'direction' => 'naik', 'min' => '0', 'max' => '100'] + $cells;
                    [$applied, $transformed] = [true, true];
                } elseif ($kind === 'zero') {
                    // Target 0: a zero result scores 100, anything else 0.
                    $cells = ['target' => '0', 'unit' => $unit, 'direction' => 'turun', 'min' => '0', 'max' => '100'] + $cells;
                    [$applied, $transformed] = [true, $rule['type'] !== 'none'];
                } else {
                    // Achievement / target; the source rule caps it at the full weight and has no floor.
                    $cells = ['target' => self::number($target['value']), 'unit' => $unit, 'direction' => 'naik', 'min' => $rule['type'] === 'proportional' ? '0' : '10', 'max' => '100'] + $cells;
                    [$applied, $transformed, $assumed] = [true, $rule['type'] !== 'none', $rule['type'] === 'none'];
                }
            }
        }
        // A source weighting rule that could not be applied must never be dropped by a later correction.
        if ($unsupported || ($rule['type'] !== 'none' && ! $applied)) {
            $unsupported = true;
            $errors['rule'] ??= 'ketentuan sumber tidak dapat dipetakan tepat ke formula; perbaiki file atau isi formula pengganti dan setujui penggantian.';
        }

        return ['cells' => $cells, 'variables' => $variables, 'errors' => $errors, 'source' => $source, 'ruleUnsupported' => $unsupported, 'transformed' => $transformed, 'assumedDirection' => $assumed];
    }

    /** Decimal without exponent notation or trailing zeros (formula and cell convention). */
    public static function number(float $value): string
    {
        $text = rtrim(rtrim(number_format($value, 10, '.', ''), '0'), '.');

        return $text === '-0' ? '0' : $text;
    }

    /** @return array{0: list<array{line: int, cells: array<string, array>}>, 1: ?string} KPI rows, or the reason the sheet is unsupported */
    private function table(array $rows): array
    {
        ksort($rows);
        $columns = null;
        $header = 0;
        foreach ($rows as $line => $cells) {
            if ($line > self::HEADER_ROWS) {
                break;
            }
            $found = [];
            foreach ($cells as $col => $cell) {
                $field = $cell['kind'] === 'text' ? (self::HEADERS[$this->key($cell['value'])] ?? null) : null;
                if ($field !== null) {
                    if (isset($found[$field])) {
                        return [[], 'Judul kolom “'.$cell['value'].'” ganda.'];
                    }
                    $found[$field] = $col;
                }
            }
            if (! array_diff(self::REQUIRED, array_keys($found))) {
                [$columns, $header] = [$found, $line];
                break;
            }
        }
        if ($columns === null) {
            return [[], 'Judul kolom master KPI tidak ditemukan.'];
        }
        $kpis = [];
        foreach ($rows as $line => $cells) {
            if ($line <= $header) {
                continue;
            }
            $defs = [];
            foreach ($columns as $field => $col) {
                if (isset($cells[$col])) {
                    $defs[$field] = $cells[$col] + ['ref' => $this->column($col).$line];
                }
            }
            if ($this->closes($defs)) {
                return [$kpis, null];
            }
            // Blank separators and label-only notes (no number, definition or weight) are not KPI rows.
            if (! array_diff_key($defs, ['pillar' => true, 'name' => true])) {
                continue;
            }
            $kpis[] = ['line' => $line, 'cells' => $defs];
        }

        return [[], 'Baris TOTAL di bawah tabel KPI tidak ditemukan.'];
    }

    /**
     * End of the KPI table: a TOTAL label in a structural column (No., Pillar, KPI, Formula Pengukuran) of a
     * row without a real KPI definition, or a summed weight without a KPI. A numerator/denominator/target
     * text such as "Total" on a real KPI row never ends the table.
     */
    private function closes(array $defs): bool
    {
        $total = fn (string $field) => ($defs[$field]['kind'] ?? null) === 'text' && in_array($this->key($defs[$field]['value']), self::TOTALS, true);
        $labelled = $total('no') || $total('pillar') || $total('name') || $total('formula');
        $kpi = (isset($defs['name']) && ! $total('name')) || isset($defs['numerator']) || isset($defs['denominator']) || isset($defs['target']) || isset($defs['rule']);
        if ($labelled && ! $kpi) {
            return true;
        }

        return ! isset($defs['name']) && ($defs['weight']['kind'] ?? null) === 'formula';
    }

    /**
     * "Numerator/Denominator (x 100%)", the literal labels "<numerator> / <denominator>", or a single count
     * ("Kasus", "Jumlah complaint dalam 1 bulan") without denominator.
     *
     * @return array{0: ?array, 1: ?string}
     */
    private function measure(string $formula, string $numerator, string $denominator): array
    {
        $key = fn (string $s) => preg_replace('~\s*/\s*~u', '/', $this->key($s));
        preg_match('~^(.*?)(?:\s*[x×*]\s*(1000|100\s*%|100))?$~u', $key($formula), $m);
        $base = trim($m[1]);
        $multiplier = isset($m[2]) ? ($m[2] === '1000' ? 1000 : 100) : null;
        [$num, $den] = [$key($numerator), $key($denominator)];
        if ($base === 'numerator/denominator' || ($num !== '' && $den !== '' && $base === "{$num}/{$den}")) {
            return [['count' => false, 'expression' => 'A/B', 'multiplier' => $multiplier, 'unit' => null, 'variables' => [
                ['key' => 'A', 'label' => $numerator !== '' ? $numerator : 'Numerator', 'source' => 'manual'],
                ['key' => 'B', 'label' => $denominator !== '' ? $denominator : 'Denominator', 'source' => 'manual'],
            ]], null];
        }
        if ($multiplier === null && $den === '' && ! str_contains($base, '/') && ! preg_match('~\s[x×*]\s*\d~u', $base)
            && ($base === 'kasus' || $base === $num || preg_match('~^jumlah\s~u', $base))) {
            return [['count' => true, 'expression' => 'A', 'multiplier' => null, 'unit' => $base === 'kasus' ? 'kasus' : 'jumlah', 'variables' => [
                ['key' => 'A', 'label' => $numerator !== '' ? $numerator : $formula, 'source' => 'manual'],
            ]], null];
        }

        return [null, "Formula Pengukuran “{$formula}” tidak dapat diterjemahkan; gunakan Numerator/Denominator (x 100%)."];
    }

    /** @return array{0: ?array{cmp: ?string, value: float, percent: bool, words: ?string}, 1: ?string} */
    private function target(array $cell): array
    {
        if ($cell['kind'] === 'number') {
            if (! is_numeric($cell['value']) || ! is_finite((float) $cell['value'])) {
                return [null, 'Target bukan angka.'];
            }

            return [['cmp' => null, 'value' => $cell['percent'] ? round((float) $cell['value'] * 100, 10) : (float) $cell['value'], 'percent' => $cell['percent'], 'words' => null], null];
        }
        $text = strtr($this->key($cell['value']), ['≤' => '<=', '≥' => '>=', '=<' => '<=', '=>' => '>=']);
        if (preg_match('/^(?:0\s*|tidak ada\s+)(kasus|complaint|komplain)$/u', $text, $m)) {
            return [['cmp' => null, 'value' => 0.0, 'percent' => false, 'words' => $m[1]], null];
        }
        if (preg_match('/^(<=|>=|<|>)?\s*'.self::NUMBER.'\s*(%|[a-z][a-z ]{0,30})?$/u', $text, $m)) {
            $suffix = trim($m[3] ?? '');

            return [['cmp' => $m[1] !== '' ? $m[1] : null, 'value' => (float) str_replace(',', '.', $m[2]), 'percent' => $suffix === '%', 'words' => $suffix === '' || $suffix === '%' ? null : $suffix], null];
        }

        return [null, "Target “{$cell['value']}” bukan angka atau ambang (<, >, ≤, ≥) yang jelas."];
    }

    /** @return array{0: ?float, 1: ?string} weight in percent points */
    private function weight(?array $cell): array
    {
        if (! $cell) {
            return [null, 'Bobot KPI kosong.'];
        }
        if ($cell['kind'] === 'number' && is_numeric($cell['value'])) {
            return [$cell['percent'] ? round((float) $cell['value'] * 100, 10) : (float) $cell['value'], null];
        }
        if (preg_match('/^'.self::NUMBER.'\s*%?$/u', $this->key($cell['value']), $m)) {
            return [(float) str_replace(',', '.', $m[1]), null];
        }

        return [null, 'Bobot KPI harus angka atau persen.'];
    }

    /**
     * Ketentuan Pembobotan: none, proportional ("Pencapaian/Target x Bobot"), an all-or-nothing rule of two
     * lines whose conditions cover every result exactly (binary threshold, or zero cases), else unsupported.
     */
    private function rule(string $text, ?float $weight): array
    {
        if ($text === '') {
            return ['type' => 'none'];
        }
        if (preg_match('~^pencapaian\s*/\s*target\s*x\s*bobot\b~u', $this->key($text))) {
            return ['type' => 'proportional'];
        }
        $lines = [];
        // Conditions are separated by line breaks or semicolons ("0 kasus = bobot 50%; bila ada 1 kasus …").
        foreach (preg_split('/[\r\n;]+/u', $text) as $line) {
            $line = strtr($this->key($line), ['≤' => '<=', '≥' => '>=', '=<' => '<=', '=>' => '>=']);
            if ($line === '') {
                continue;
            }
            if (preg_match('~^(?:[a-z]+\s+)?(<=|>=|<|>)?\s*'.self::NUMBER.'\s*(%|kasus)?\s*=\s*(?:pencapaian\s+)?(?:bobot\s*)?'.self::NUMBER.'\s*%$~u', $line, $m)) {
                $lines[] = ['op' => $m[1] !== '' ? $m[1] : '==', 'value' => (float) str_replace(',', '.', $m[2]), 'percent' => ($m[3] ?? '') === '%', 'weight' => (float) str_replace(',', '.', $m[4])];
            } elseif (preg_match('~^bila ada (\d+) kasus atau lebih,?\s*bobot\s*'.self::NUMBER.'\s*%$~u', $line, $m)) {
                $lines[] = ['op' => '>=', 'value' => (float) $m[1], 'percent' => false, 'weight' => (float) str_replace(',', '.', $m[2])];
            } else {
                return ['type' => 'unsupported'];
            }
        }
        $full = array_values(array_filter($lines, fn ($l) => $weight !== null && $weight > 0 && abs($l['weight'] - $weight) < 1e-9));
        $none = array_values(array_filter($lines, fn ($l) => $l['weight'] == 0));
        if (count($lines) !== 2 || count($full) !== 1 || count($none) !== 1) {
            return ['type' => 'unsupported'];
        }
        [$pass, $fail] = [$full[0], $none[0]];
        if ($pass['op'] === '==' && $pass['value'] == 0 && (($fail['op'] === '>' && $fail['value'] == 0) || ($fail['op'] === '>=' && $fail['value'] == 1 && ! $fail['percent']))) {
            return ['type' => 'zero'];
        }
        if ((self::COMPLEMENT[$pass['op']] ?? null) === $fail['op'] && $pass['value'] == $fail['value'] && $pass['percent'] === $fail['percent']) {
            return ['type' => 'binary', 'pass' => $pass];
        }

        // Gaps or overlaps (e.g. "<3%" and ">3%" leave 3% undefined) are not guessed.
        return ['type' => 'unsupported'];
    }

    /** Source cell as HC sees it: numbers without exponent notation, percentage formats as percent. */
    private function display(?array $cell): string
    {
        if (! $cell) {
            return '';
        }
        if ($cell['kind'] !== 'number' || ! is_numeric($cell['value'])) {
            return $cell['value'];
        }

        return $cell['percent'] ? self::number(round((float) $cell['value'] * 100, 10)).'%' : self::number((float) $cell['value']);
    }

    private function clean(string $value): string
    {
        return trim(preg_replace('/[\s\x{00A0}]+/u', ' ', $value));
    }

    private function key(string $value): string
    {
        return mb_strtolower($this->clean($value));
    }

    private function column(int $col): string
    {
        $name = '';
        for (; $col > 0; $col = intdiv($col - 1, 26)) {
            $name = chr(65 + ($col - 1) % 26).$name;
        }

        return $name;
    }
}
