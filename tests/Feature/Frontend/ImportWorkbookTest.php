<?php

namespace Tests\Feature\Frontend;

use Illuminate\Http\UploadedFile;
use Tests\Support\BackendTestCase;
use ZipArchive;

class ImportWorkbookTest extends BackendTestCase
{
    private function workbook(bool $formula = false): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'kpi-xlsx-');
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::OVERWRITE);
        $zip->addFromString('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="KPI" sheetId="1" r:id="rId1"/></sheets></workbook>');
        $zip->addFromString('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
        $headers = ['pillar', 'name', 'numerator', 'denominator', 'measurement_formula', 'target_text', 'weight_percent'];
        $xml = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">';
        foreach ($headers as $i => $name) {
            $xml .= '<c r="'.chr(65 + $i).'1" t="inlineStr"><is><t>'.$name.'</t></is></c>';
        }
        $xml .= '</row><row r="2"><c r="A2" t="inlineStr"><is><t>Technical Care</t></is></c><c r="B2" t="s"><v>0</v></c><c r="F2" t="inlineStr"><is><t>&lt;20%</t></is></c><c r="G2">'.($formula ? '<f>50+50</f>' : '').'<v>100</v></c></row></sheetData></worksheet>';
        $zip->addFromString('xl/worksheets/sheet1.xml', $xml);
        $zip->addFromString('xl/sharedStrings.xml', '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Kepatuhan dokumentasi</t></si></sst>');
        $zip->close();
        $data = file_get_contents($path);
        unlink($path);

        return UploadedFile::fake()->createWithContent('kpi.xlsx', $data);
    }

    public function test_xlsx_preview_reads_shared_strings_inline_text_and_decimal_weight(): void
    {
        $this->asRole('hc')->postJson('/hc/kpi-templates/import-preview', ['file' => $this->workbook()])->assertOk()
            ->assertJsonPath('data.valid', true)->assertJsonPath('data.items.0.name', 'Kepatuhan dokumentasi')->assertJsonPath('data.items.0.target_text', '<20%')->assertJsonPath('data.weight_total', '100.0000');
    }

    public function test_xlsx_formula_is_rejected_without_evaluating_it(): void
    {
        $this->asRole('hc')->postJson('/hc/kpi-templates/import-preview', ['file' => $this->workbook(true)])->assertUnprocessable()->assertJsonPath('code', 'IMPORT_FORMULA');
    }
}
