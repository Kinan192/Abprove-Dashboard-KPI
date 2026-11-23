<?php

namespace App\Services\KpiMaster;

use App\Services\IdentityAccess\AccessContext;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

/**
 * "Impor pola" use cases of KPI & Periode: check a file against the selected period (nothing is stored) and
 * add the patterns of a valid file to that period. Reading the file and the row rules live in KpiPatternImport;
 * storing goes through the regular workspace save pipeline (revision check, item rules, audit).
 */
class PatternImportService
{
    public function __construct(private KpiPatternImport $reader, private IntegratedKpiWorkspace $workspace) {}

    /**
     * Row-level preview of the file for `month`. Pattern items are left out: the screen only shows
     * counts and weight totals per pattern.
     *
     * @param  ?list<string>  $sheets  exact worksheet names of an RSAB master; null for a template file
     */
    public function preview(UploadedFile $file, string $month, ?array $sheets, array $edits): array
    {
        $read = $this->read($file, $month, $sheets, $edits);
        $read['patterns'] = array_map(fn (array $pattern) => [
            'name' => $pattern['name'],
            'sheet' => $pattern['sheet'],
            'count' => count($pattern['items']),
            'total' => $pattern['total'],
            'complete' => $pattern['complete'],
            'lines' => $pattern['lines'],
        ], $read['patterns']);

        return ['month' => $month] + $read;
    }

    /**
     * Adds every pattern of the file to `month` (all rows or nothing). The file is read again here, so a
     * preview that went stale (other names taken meanwhile, changed corrections) is never committed.
     *
     * @return array{patterns: int, kpis: int, names: list<string>, edited: int}
     */
    public function import(AccessContext $context, int $revision, UploadedFile $file, string $month, ?array $sheets, array $edits): array
    {
        $read = $this->read($file, $month, $sheets, $edits);
        if (! $read['valid']) {
            throw ValidationException::withMessages(['file' => $this->blockedReason($read, $sheets)]);
        }
        $this->workspace->import($context, $revision, $month, array_map(KpiPatternImport::stored(...), $read['patterns']));

        return [
            'patterns' => count($read['patterns']),
            'kpis' => array_sum(array_map(fn (array $pattern) => count($pattern['items']), $read['patterns'])),
            'names' => array_column($read['patterns'], 'name'),
            'edited' => count(array_filter($read['rows'], fn (array $row) => $row['edited'])),
        ];
    }

    private function read(UploadedFile $file, string $month, ?array $sheets, array $edits): array
    {
        return $this->reader->read($file, $month, $this->workspace->importNames($month), $sheets, $edits);
    }

    /** Why an invalid read cannot be imported, in the words of the import screen. */
    private function blockedReason(array $read, ?array $sheets): string
    {
        return match (true) {
            $read['errorCount'] > 0 => "File masih memiliki {$read['errorCount']} kesalahan. Periksa pratinjau.",
            $read['format'] === 'rsab' && ! $sheets => 'Pilih minimal satu lembar master KPI.',
            default => 'File tidak berisi KPI.',
        };
    }
}
