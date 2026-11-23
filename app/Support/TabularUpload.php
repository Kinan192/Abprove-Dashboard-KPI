<?php

namespace App\Support;

use App\Exceptions\BusinessRule;
use Carbon\CarbonImmutable;
use DOMDocument;
use DOMElement;
use Illuminate\Http\UploadedFile;
use ZipArchive;

/**
 * Bounded CSV / XLSX upload reader.
 *
 * rows(): first sheet as raw text cells; header matching and cell semantics belong to the caller.
 * Result: ['header' => list<string>, 'rows' => array<int, list<string>>]
 * - header: first non-blank row, trimmed, BOM stripped, trailing empty cells dropped.
 * - rows: keyed by 1-based source line (CSV line / XLSX row), blank rows omitted, each row trimmed and
 *   padded to the header width. A non-empty cell beyond the header width is rejected. Excel formulas and
 *   error cells are rejected.
 *
 * workbook(): every sheet of an XLSX master, cells tagged with their kind so the caller decides which
 * columns are derived output (formulas there are ignored, never evaluated).
 */
class TabularUpload
{
    public const MAX_COLUMNS = 64;

    public const MAX_CELL = 10000;

    private const MAX_FILE = 5 * 1024 * 1024;

    private const MAX_XML = 20 * 1024 * 1024;

    private const MAX_UNZIPPED = 25 * 1024 * 1024;

    private const MAX_SHEETS = 100;

    private const MAX_SHARED = 200000;

    private const MAX_WORKBOOK_CELLS = 200000;

    private const MAX_ROW = 1048576;

    private const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

    /** @return array{header: list<string>, rows: array<int, list<string>>} */
    public function rows(UploadedFile $file, int $maxRows): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        if (! in_array($extension, ['csv', 'xlsx'], true)) {
            throw new BusinessRule('IMPORT_TYPE', 'Gunakan file CSV atau XLSX.', 422);
        }
        if (! $file->isValid() || $file->getSize() > self::MAX_FILE) {
            throw new BusinessRule('IMPORT_SIZE', 'File tidak dapat dibaca atau terlalu besar.', 422);
        }
        $header = null;
        $rows = [];
        $add = function (int $line, array $cells) use (&$header, &$rows, $maxRows) {
            $cells = array_map(fn ($v) => $this->cell($v, $line), $cells);
            if (! array_filter($cells, fn ($v) => $v !== '')) {
                return;
            }
            if ($header === null) {
                $cells[0] = ltrim($cells[0] ?? '', "\u{FEFF}");
                while ($cells && end($cells) === '') {
                    array_pop($cells);
                }
                $header = $cells;

                return;
            }
            if (count($rows) >= $maxRows) {
                throw new BusinessRule('IMPORT_ROWS', "Maksimal {$maxRows} baris data per file.", 422);
            }
            foreach (array_slice($cells, count($header), null, true) as $value) {
                if ($value !== '') {
                    throw new BusinessRule('IMPORT_COLUMNS', "Baris {$line}: ada isi di luar kolom template.", 422);
                }
            }
            $rows[$line] = array_pad(array_slice($cells, 0, count($header)), count($header), '');
        };
        $extension === 'csv' ? $this->csv($file->getRealPath(), $add) : $this->xlsx($file->getRealPath(), $add);
        if ($header === null || ! $rows) {
            throw new BusinessRule('IMPORT_EMPTY', 'File harus berisi baris judul dan minimal 1 baris data.', 422);
        }

        return ['header' => $header, 'rows' => $rows];
    }

    /** Y-m-d of an Excel serial date, Y-m-d, d/m/Y or d-m-Y cell; null when it is not a valid date. */
    public static function date(string $value): ?string
    {
        $value = trim($value);
        if (preg_match('/^\d{1,6}(?:\.\d+)?$/D', $value)) {
            $days = (int) floor((float) $value);

            return $days >= 1 && $days <= 2958465 ? CarbonImmutable::create(1899, 12, 30)->addDays($days)->format('Y-m-d') : null;
        }
        foreach (['!Y-m-d', '!d/m/Y', '!d-m-Y'] as $format) {
            try {
                $date = CarbonImmutable::createFromFormat($format, $value);
            } catch (\Throwable) {
                continue;
            }
            if ($date && $date->format(substr($format, 1)) === $value) {
                return $date->format('Y-m-d');
            }
        }

        return null;
    }

    private function cell(mixed $value, int $line): string
    {
        $value = (string) $value;
        if (! mb_check_encoding($value, 'UTF-8')) {
            $value = mb_convert_encoding($value, 'UTF-8', 'Windows-1252');
        }
        $value = trim($value);
        if (mb_strlen($value) > self::MAX_CELL) {
            throw new BusinessRule('IMPORT_CELL', "Baris {$line}: isi sel terlalu panjang.", 422);
        }

        return $value;
    }

    private function csv(string $path, callable $add): void
    {
        $handle = fopen($path, 'r');
        if (! $handle) {
            throw new BusinessRule('IMPORT_CSV', 'File CSV tidak dapat dibaca.', 422);
        }
        try {
            $first = (string) fgets($handle);
            // Excel with an Indonesian locale saves CSV with ";".
            $delimiter = substr_count($first, ';') > substr_count($first, ',') ? ';' : ',';
            rewind($handle);
            $line = 0;
            while (($row = fgetcsv($handle, 0, $delimiter, '"', '')) !== false) {
                $line++;
                if (count($row) > self::MAX_COLUMNS) {
                    throw new BusinessRule('IMPORT_COLUMNS', 'Maksimal '.self::MAX_COLUMNS.' kolom.', 422);
                }
                $add($line, $row === [null] ? [] : $row);
            }
        } finally {
            fclose($handle);
        }
    }

    private function xml(string $text): DOMDocument
    {
        if (strlen($text) > self::MAX_XML || stripos($text, '<!DOCTYPE') !== false || stripos($text, '<!ENTITY') !== false) {
            throw new BusinessRule('IMPORT_XML', 'Isi workbook tidak didukung.', 422);
        }
        $doc = new DOMDocument;
        if (! @$doc->loadXML($text, LIBXML_NONET | LIBXML_COMPACT)) {
            throw new BusinessRule('IMPORT_XML', 'Workbook tidak dapat dibaca.', 422);
        }

        return $doc;
    }

    /** Text of a shared/inline string without phonetic runs. */
    private function text(DOMElement $node): string
    {
        $text = '';
        foreach ($node->getElementsByTagName('t') as $t) {
            if (($t->parentNode?->localName ?? '') !== 'rPh') {
                $text .= $t->textContent;
            }
        }

        return $text;
    }

    /**
     * All sheets of an XLSX workbook in workbook order. `rows` is null for a sheet that is not a worksheet
     * (chart sheet). Rows are keyed by 1-based line, cells by 1-based column; only non-empty cells within
     * MAX_COLUMNS are kept. A formula cell keeps "=<formula>" as value (its cached result is not trusted).
     *
     * @return list<array{name: string, hidden: bool, rows: ?array<int, array<int, array{value: string, kind: 'text'|'number'|'formula'|'error', percent: bool}>>}>
     */
    public function workbook(UploadedFile $file): array
    {
        if (strtolower($file->getClientOriginalExtension()) !== 'xlsx') {
            throw new BusinessRule('IMPORT_TYPE', 'Gunakan file XLSX.', 422);
        }
        if (! $file->isValid() || $file->getSize() > self::MAX_FILE) {
            throw new BusinessRule('IMPORT_SIZE', 'File tidak dapat dibaca atau terlalu besar.', 422);
        }
        $zip = $this->open($file->getRealPath());
        try {
            $sheets = $this->sheets($zip);
            if (count($sheets) > self::MAX_SHEETS) {
                throw new BusinessRule('IMPORT_SHEETS', 'Workbook memiliki lebih dari '.self::MAX_SHEETS.' lembar.', 422);
            }
            $shared = $this->shared($zip);
            $percent = $this->percentStyles($zip);
            $count = 0;
            $book = [];
            foreach ($sheets as $sheet) {
                $rows = null;
                if ($sheet['path'] !== null) {
                    $rows = [];
                    $this->scan($this->xml($zip->getFromName($sheet['path']) ?: ''), $shared, function (int $line, array $cells) use (&$rows, &$count, $percent, $sheet) {
                        foreach ($cells as $col => $c) {
                            if ($col > self::MAX_COLUMNS || $line > self::MAX_ROW) {
                                continue;
                            }
                            $kind = match (true) {
                                $c['formula'] !== null => 'formula',
                                $c['type'] === 'e' => 'error',
                                $c['type'] === '' || $c['type'] === 'n' => 'number',
                                default => 'text',
                            };
                            $value = $kind === 'formula' ? '='.($c['formula'] !== '' ? $c['formula'] : '…') : (string) $c['value'];
                            if (! mb_check_encoding($value, 'UTF-8')) {
                                $value = mb_convert_encoding($value, 'UTF-8', 'Windows-1252');
                            }
                            $value = trim($value);
                            if ($value === '') {
                                continue;
                            }
                            if (mb_strlen($value) > self::MAX_CELL) {
                                throw new BusinessRule('IMPORT_CELL', "Lembar “{$sheet['name']}” sel {$c['ref']}: isi sel terlalu panjang.", 422);
                            }
                            if (++$count > self::MAX_WORKBOOK_CELLS) {
                                throw new BusinessRule('IMPORT_SIZE', 'Workbook terlalu besar. Hapus lembar atau baris yang tidak diperlukan.', 422);
                            }
                            $rows[$line][$col] = ['value' => $value, 'kind' => $kind, 'percent' => $kind === 'number' && ($percent[$c['style']] ?? false)];
                        }
                    });
                }
                $book[] = ['name' => $sheet['name'], 'hidden' => $sheet['hidden'], 'rows' => $rows];
            }

            return $book;
        } finally {
            $zip->close();
        }
    }

    /** First sheet only; formulas and error cells are rejected. */
    private function xlsx(string $path, callable $add): void
    {
        $zip = $this->open($path);
        try {
            $sheetPath = $this->sheets($zip)[0]['path'] ?? null;
            if (! $sheetPath) {
                throw new BusinessRule('IMPORT_SHEET', 'Lembar pertama workbook tidak dapat dibaca.', 422);
            }
            $shared = $this->shared($zip);
            $this->scan($this->xml($zip->getFromName($sheetPath) ?: ''), $shared, function (int $line, array $row) use ($add) {
                $cells = [];
                foreach ($row as $col => $c) {
                    if ($c['formula'] !== null) {
                        throw new BusinessRule('IMPORT_FORMULA', "Baris {$line}: gunakan teks/angka, bukan formula Excel (sel {$c['ref']}).", 422);
                    }
                    if ($c['type'] === 'e') {
                        throw new BusinessRule('IMPORT_CELL', "Baris {$line}: sel {$c['ref']} berisi error Excel.", 422);
                    }
                    if (trim($c['value']) === '') {
                        continue;
                    }
                    if ($col > self::MAX_COLUMNS) {
                        throw new BusinessRule('IMPORT_COLUMNS', 'Maksimal '.self::MAX_COLUMNS.' kolom.', 422);
                    }
                    $cells[$col - 1] = $c['value'];
                }
                $add($line, $cells ? array_replace(array_fill(0, max(array_keys($cells)) + 1, ''), $cells) : []);
            });
        } finally {
            $zip->close();
        }
    }

    /** Opens an XLSX archive within the archive bounds. */
    private function open(string $path): ZipArchive
    {
        $handle = fopen($path, 'rb');
        $magic = $handle ? fread($handle, 4) : '';
        $handle && fclose($handle);
        $zip = new ZipArchive;
        if ($magic !== "PK\x03\x04" || $zip->open($path, ZipArchive::RDONLY) !== true) {
            throw new BusinessRule('IMPORT_XLSX', 'File XLSX tidak valid.', 422);
        }
        $bytes = 0;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $bytes += $zip->statIndex($i)['size'];
        }
        if ($zip->numFiles > 2000 || $bytes > self::MAX_UNZIPPED) {
            $zip->close();
            throw new BusinessRule('IMPORT_SIZE', 'Workbook terlalu besar. Gunakan file template sederhana.', 422);
        }

        return $zip;
    }

    /**
     * Sheets in workbook order with their part inside the archive; `path` is null for anything that is not
     * an internal worksheet part (chart sheets, external targets).
     *
     * @return list<array{name: string, hidden: bool, path: ?string}>
     */
    private function sheets(ZipArchive $zip): array
    {
        $targets = $this->relations($zip);
        $sheets = [];
        foreach ($this->xml($zip->getFromName('xl/workbook.xml') ?: '')->getElementsByTagName('sheet') as $sheet) {
            $path = $targets[$sheet->getAttributeNS(self::REL, 'id')] ?? null;
            $sheets[] = ['name' => $sheet->getAttribute('name'), 'hidden' => in_array($sheet->getAttribute('state'), ['hidden', 'veryHidden'], true),
                'path' => $path !== null && preg_match('~^xl/worksheets/[^/]+\.xml$~D', $path) ? $path : null];
        }

        return $sheets;
    }

    /** @return array<string, string> internal workbook relationship id => archive path */
    private function relations(ZipArchive $zip): array
    {
        $targets = [];
        foreach ($this->xml($zip->getFromName('xl/_rels/workbook.xml.rels') ?: '')->getElementsByTagName('Relationship') as $rel) {
            if (strcasecmp($rel->getAttribute('TargetMode'), 'External') === 0) {
                continue;
            }
            $target = ltrim($rel->getAttribute('Target'), '/');
            $targets[$rel->getAttribute('Id')] = str_starts_with($target, 'xl/') ? $target : 'xl/'.$target;
        }

        return $targets;
    }

    /** @return list<string> */
    private function shared(ZipArchive $zip): array
    {
        $shared = [];
        if ($strings = $zip->getFromName('xl/sharedStrings.xml')) {
            foreach ($this->xml($strings)->getElementsByTagName('si') as $si) {
                if (count($shared) >= self::MAX_SHARED) {
                    throw new BusinessRule('IMPORT_SIZE', 'Workbook terlalu besar. Gunakan file template sederhana.', 422);
                }
                $shared[] = $this->text($si);
            }
        }

        return $shared;
    }

    /** @return array<int, bool> cell style index => number format shows a percentage */
    private function percentStyles(ZipArchive $zip): array
    {
        $text = $zip->getFromName('xl/styles.xml');
        if (! $text) {
            return [];
        }
        $doc = $this->xml($text);
        $custom = [];
        foreach ($doc->getElementsByTagName('numFmt') as $format) {
            // Quoted literals and escaped characters are not the percent operator.
            $code = preg_replace('/"[^"]*"|\\\\./u', '', $format->getAttribute('formatCode'));
            $custom[(int) $format->getAttribute('numFmtId')] = str_contains((string) $code, '%');
        }
        $percent = [];
        $xfs = $doc->getElementsByTagName('cellXfs')->item(0);
        if ($xfs) {
            foreach ($xfs->childNodes as $xf) {
                if ($xf instanceof DOMElement && $xf->localName === 'xf') {
                    $id = (int) $xf->getAttribute('numFmtId');
                    $percent[] = $id === 9 || $id === 10 || ($custom[$id] ?? false);
                }
            }
        }

        return $percent;
    }

    /**
     * Calls $visit(line, cells) for every <row>; cells keyed by 1-based column with the raw type, resolved
     * value, formula text (null when none) and style index.
     */
    private function scan(DOMDocument $doc, array $shared, callable $visit): void
    {
        $line = 0;
        foreach ($doc->getElementsByTagName('row') as $row) {
            $line = max($line + 1, (int) $row->getAttribute('r'));
            $cells = [];
            $next = 1;
            foreach ($row->getElementsByTagName('c') as $cell) {
                $col = $next;
                if (preg_match('/^([A-Z]{1,3})\d*$/D', $cell->getAttribute('r'), $m)) {
                    $col = 0;
                    foreach (str_split($m[1]) as $letter) {
                        $col = $col * 26 + ord($letter) - 64;
                    }
                }
                $next = $col + 1;
                $type = $cell->getAttribute('t');
                $formula = $cell->getElementsByTagName('f')->item(0);
                $cells[$col] = [
                    'ref' => $cell->getAttribute('r'), 'type' => $type, 'formula' => $formula ? trim($formula->textContent) : null, 'style' => (int) $cell->getAttribute('s'),
                    'value' => match ($type) {
                        's' => $shared[(int) ($cell->getElementsByTagName('v')->item(0)?->textContent ?? -1)] ?? '',
                        'inlineStr' => ($is = $cell->getElementsByTagName('is')->item(0)) ? $this->text($is) : '',
                        default => $cell->getElementsByTagName('v')->item(0)?->textContent ?? '',
                    },
                ];
            }
            $visit($line, $cells);
        }
    }
}
