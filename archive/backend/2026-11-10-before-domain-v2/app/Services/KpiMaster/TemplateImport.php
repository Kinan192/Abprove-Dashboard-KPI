<?php

namespace App\Services\KpiMaster;

use App\Exceptions\BusinessRule;
use DOMDocument;
use Illuminate\Http\UploadedFile;
use ZipArchive;

class TemplateImport
{
    public const COLUMNS = ['pillar', 'name', 'numerator', 'denominator', 'measurement_formula', 'target_text', 'weight_percent'];

    public function rows(UploadedFile $file): array
    {
        if (strtolower($file->getClientOriginalExtension()) === 'csv') {
            $handle = fopen($file->getRealPath(), 'r');
            $rows = [];
            while (($row = fgetcsv($handle, 0, ',', '"', '')) !== false) {
                $rows[] = $row;
                if (count($rows) > 201) {
                    break;
                }
            }
            fclose($handle);
        } else {
            $rows = $this->xlsx($file->getRealPath());
        }
        if (count($rows) < 2 || count($rows) > 201) {
            throw new BusinessRule('IMPORT_ROWS', 'File harus berisi header dan 1–200 baris KPI.', 422);
        }
        $header = array_map(fn ($s) => trim(ltrim((string) $s, "\xEF\xBB\xBF")), array_shift($rows));
        if ($header !== self::COLUMNS) {
            throw new BusinessRule('IMPORT_HEADERS', 'Kolom tidak sesuai. Gunakan template contoh dengan urutan kolom yang sama.', 422);
        }
        $items = [];
        foreach ($rows as $row) {
            if (! array_filter($row, fn ($v) => trim((string) $v) !== '')) {
                continue;
            }
            if (count($row) > 7) {
                throw new BusinessRule('IMPORT_COLUMNS', 'Terdapat kolom berlebih pada file.', 422);
            }
            $row = array_pad($row, 7, null);
            $items[] = array_combine(self::COLUMNS, array_map(fn ($v) => trim((string) $v) === '' ? null : trim((string) $v), $row));
        }

        return $items;
    }

    private function xml(string $text): DOMDocument
    {
        if (strlen($text) > 15000000 || stripos($text, '<!DOCTYPE') !== false) {
            throw new BusinessRule('IMPORT_XML', 'Isi workbook tidak didukung.', 422);
        }
        $doc = new DOMDocument;
        if (! @$doc->loadXML($text, LIBXML_NONET)) {
            throw new BusinessRule('IMPORT_XML', 'Workbook tidak dapat dibaca.', 422);
        }

        return $doc;
    }

    private function xlsx(string $path): array
    {
        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            throw new BusinessRule('IMPORT_XLSX', 'File XLSX tidak valid.', 422);
        }
        try {
            $bytes = 0;
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $bytes += $zip->statIndex($i)['size'];
            }
            if ($zip->numFiles > 2000 || $bytes > 25000000) {
                throw new BusinessRule('IMPORT_SIZE', 'Workbook terlalu besar. Gunakan file template sederhana.', 422);
            }
            $book = $this->xml($zip->getFromName('xl/workbook.xml') ?: '');
            $sheet = $book->getElementsByTagName('sheet')->item(0);
            $rid = $sheet?->getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
            $rels = $this->xml($zip->getFromName('xl/_rels/workbook.xml.rels') ?: '');
            $sheetPath = null;
            foreach ($rels->getElementsByTagName('Relationship') as $rel) {
                if ($rel->getAttribute('Id') === $rid) {
                    $sheetPath = ltrim($rel->getAttribute('Target'), '/');
                }
            }
            if ($sheetPath && ! str_starts_with($sheetPath, 'xl/')) {
                $sheetPath = 'xl/'.$sheetPath;
            }
            if (! $sheetPath || ! preg_match('~^xl/worksheets/[^/]+\.xml$~D', $sheetPath)) {
                throw new BusinessRule('IMPORT_SHEET', 'Lembar pertama workbook tidak dapat dibaca.', 422);
            }
            $shared = [];
            if ($strings = $zip->getFromName('xl/sharedStrings.xml')) {
                foreach ($this->xml($strings)->getElementsByTagName('si') as $si) {
                    $shared[] = $si->textContent;
                }
            }
            $doc = $this->xml($zip->getFromName($sheetPath) ?: '');
            $rows = [];
            foreach ($doc->getElementsByTagName('row') as $row) {
                $cells = [];
                foreach ($row->getElementsByTagName('c') as $cell) {
                    if ($cell->getElementsByTagName('f')->length) {
                        throw new BusinessRule('IMPORT_FORMULA', 'Gunakan nilai teks/angka, bukan formula Excel.', 422);
                    }
                    preg_match('/^([A-Z]+)/', $cell->getAttribute('r'), $m);
                    $col = 0;
                    foreach (str_split($m[1] ?? '') as $letter) {
                        $col = $col * 26 + ord($letter) - 64;
                    }
                    if ($col < 1 || $col > 7) {
                        throw new BusinessRule('IMPORT_COLUMNS', 'Workbook memiliki kolom di luar template.', 422);
                    }
                    $value = $cell->getElementsByTagName('v')->item(0)?->textContent ?? '';
                    if ($cell->getAttribute('t') === 's') {
                        $value = $shared[(int) $value] ?? '';
                    }
                    if ($cell->getAttribute('t') === 'inlineStr') {
                        $value = $cell->getElementsByTagName('is')->item(0)?->textContent ?? '';
                    }
                    $cells[$col - 1] = $value;
                }
                $line = array_fill(0, 7, null);
                foreach ($cells as $i => $v) {
                    $line[$i] = $v;
                } $rows[] = $line;
                if (count($rows) > 201) {
                    break;
                }
            }

            return $rows;
        } finally {
            $zip->close();
        }
    }
}
