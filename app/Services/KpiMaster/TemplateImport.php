<?php

namespace App\Services\KpiMaster;

use App\Exceptions\BusinessRule;
use App\Http\Requests\KpiMaster\KpiTemplateRequest;
use App\Support\TabularUpload;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;

/** KPI template file (Master KPI editor): one row per indicator, checked with the template item rules; nothing is stored. */
class TemplateImport
{
    public const COLUMNS = ['pillar', 'name', 'numerator', 'denominator', 'measurement_formula', 'target_text', 'weight_percent'];

    private const SAMPLE_ROWS = [
        ['Technical Care', 'Kepatuhan dokumentasi', '', '', '', '95%', '60.0000'],
        ['Efficient', 'Efisiensi sumber daya', '', '', '', '<20%', '40.0000'],
    ];

    public function __construct(private TabularUpload $reader) {}

    public function rows(UploadedFile $file): array
    {
        $table = $this->reader->rows($file, 200);
        if ($table['header'] !== self::COLUMNS) {
            throw new BusinessRule('IMPORT_HEADERS', 'Kolom tidak sesuai. Gunakan template contoh dengan urutan kolom yang sama.', 422);
        }

        return array_values(array_map(fn ($row) => array_combine(self::COLUMNS, array_map(fn ($v) => $v === '' ? null : $v, $row)), $table['rows']));
    }

    /**
     * Rows of the file with their item errors and the weight total, which must be exactly 100%.
     *
     * @return array{items: list<array>, errors: array<string, list<string>>, weight_total: string, valid: bool}
     */
    public function preview(UploadedFile $file): array
    {
        $items = $this->rows($file);
        $errors = Validator::make(['items' => $items], KpiTemplateRequest::itemRules())->errors()->toArray();
        $sum = '0';
        foreach ($items as $item) {
            // Only well-formed weights count; malformed ones are already reported by the item rules.
            if (is_numeric($item['weight_percent']) && preg_match('/^\d{1,3}(?:\.\d{1,4})?$/D', $item['weight_percent'])) {
                $sum = bcadd($sum, $item['weight_percent'], 4);
            }
        }
        if (bccomp($sum, '100', 4) !== 0) {
            $errors['weight_percent'] = ['Total bobot harus tepat 100%.'];
        }

        return ['items' => $items, 'errors' => $errors, 'weight_total' => $sum, 'valid' => ! $errors];
    }

    /** Example file with the expected header and two indicators totalling 100%. */
    public function sampleCsv(): string
    {
        return implode("\r\n", array_map(fn (array $row) => implode(',', $row), [self::COLUMNS, ...self::SAMPLE_ROWS]))."\r\n";
    }
}
