<?php

namespace App\Services\KpiMaster;

use Illuminate\Validation\ValidationException;

/**
 * Rules of one normalized workspace KPI item (formula KPI). Shared by pattern saves and pattern imports.
 */
class KpiItemRules
{
    public const MAX_VARIABLES = 26;

    public function __construct(private KpiFormula $formula) {}

    /** @return array<string, string> field => message; empty when the item is valid */
    public function errors(array $item): array
    {
        $e = [];
        if ($item['name'] === '' || mb_strlen($item['name']) > 150) {
            $e['name'] = 'nama KPI wajib diisi, maksimal 150 karakter.';
        }
        if ($item['pillar'] === '' || mb_strlen($item['pillar']) > 64) {
            $e['pillar'] = 'pilar wajib diisi, maksimal 64 karakter.';
        }
        if ($item['method'] !== 'formula') {
            $e['method'] = 'KPI harus dinilai otomatis dari formula.';
        }
        if ($item['weight'] === null || $item['weight'] <= 0 || $item['weight'] > 100) {
            $e['weight'] = 'bobot harus lebih dari 0 sampai 100% dengan maksimal 4 desimal.';
        }
        if ($item['unit'] === '' || mb_strlen($item['unit']) > 32) {
            $e['unit'] = 'pilih satuan pengukuran (maksimal 32 karakter).';
        }
        if ($item['target'] === null || $item['target'] < 0) {
            $e['target'] = 'target harus angka nol atau lebih.';
        }
        if (! in_array($item['direction'], ['higher', 'lower'], true)) {
            $e['direction'] = 'pilih polaritas.';
        }
        $policy = $item['policy'];
        if ($policy['min'] === null || $policy['max'] === null || $policy['min'] < 0 || $policy['max'] > 100 || $policy['min'] >= $policy['max']) {
            $e['policy'] = 'rentang skor otomatis harus 0 ≤ minimum < maksimum ≤ 100.';
        } elseif ($item['target'] !== null && ! isset($e['direction'])
            && (($item['target'] == 0 && $policy['zeroRule'] !== 'zero-pass') || ($item['target'] > 0 && $policy['rule'] !== ($item['direction'] === 'lower' ? 'reverse-positive' : 'target-normalized')))) {
            $e['policy'] = 'aturan konversi belum sesuai target dan polaritas.';
        }
        $keys = [];
        if (! $item['variables'] || count($item['variables']) > self::MAX_VARIABLES) {
            $e['variables'] = 'isi 1 sampai '.self::MAX_VARIABLES.' variabel.';
        }
        foreach ($item['variables'] as $variable) {
            if (! preg_match('/^[A-Z]$/D', $variable['key']) || isset($keys[$variable['key']]) || $variable['label'] === '' || mb_strlen($variable['label']) > 150 || ! in_array($variable['source'], ['manual', 'fixed'], true)) {
                $e['variables'] ??= 'setiap variabel wajib berkode A–Z unik, bernama (maksimal 150 karakter), dan bersumber jelas.';
            } elseif ($variable['source'] === 'fixed' && ($variable['value'] === null || ! is_finite($variable['value']))) {
                $e['variables'] ??= "angka tetap variabel {$variable['key']} tidak valid.";
            }
            $keys[$variable['key']] = true;
        }
        if ($item['formula'] === '' || mb_strlen($item['formula']) > 1200) {
            $e['formula'] = 'formula wajib diisi, maksimal 1200 karakter.';
        } else {
            try {
                if (array_diff($this->formula->variables($this->formula->compile($item['formula'])), array_keys($keys))) {
                    $e['formula'] = 'formula memakai variabel yang belum didefinisikan.';
                }
            } catch (ValidationException $ex) {
                $e['formula'] = collect($ex->errors())->flatten()->first();
            }
        }

        return $e;
    }
}
