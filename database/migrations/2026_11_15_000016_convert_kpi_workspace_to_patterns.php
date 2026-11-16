<?php

use Carbon\CarbonImmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * KPI workspace v2: per-unit KPI rows ("kpis" with assignmentMode/assigneeIds) become named KPI patterns,
 * one pattern per person per period. People sharing the same effective KPI set in a unit share one pattern.
 * Patterns whose total weight is not exactly 100% are kept as drafts without assignments.
 * The v1 document is kept under scope_key "hc-v1" and restored by down().
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            $row = DB::table('kpi_workspace_documents')->where('scope_key', 'hc')->lockForUpdate()->first();
            if (! $row) {
                return;
            }
            $document = json_decode($row->data, true, 512, JSON_THROW_ON_ERROR);
            if (($document['version'] ?? 1) >= 2) {
                return;
            }
            DB::table('kpi_workspace_documents')->updateOrInsert(['scope_key' => 'hc-v1'], ['revision' => $row->revision, 'data' => $row->data, 'updated_by' => $row->updated_by, 'created_at' => now(), 'updated_at' => now()]);
            $units = DB::table('units')->pluck('name', 'id');
            $patterns = [];
            $assignments = [];
            $kpis = collect($document['kpis'] ?? [])->filter(fn ($k) => is_array($k) && isset($k['id'], $k['periodId'], $k['unitId']) && in_array($k['targetRole'] ?? '', ['staff', 'unit_head'], true));
            foreach ($kpis->groupBy('periodId') as $month => $rows) {
                $byScope = $rows->groupBy(fn ($k) => $k['unitId'].'|'.$k['targetRole']);
                $groups = [];
                foreach ($this->people($month) as $person) {
                    $own = ($byScope[$person['unitId'].'|'.$person['type']] ?? collect())
                        ->filter(fn ($k) => ($k['active'] ?? true) && (($k['assignmentMode'] ?? 'all') === 'all' || in_array($person['id'], $k['assigneeIds'] ?? [], true)))->values();
                    if ($own->isEmpty()) {
                        continue;
                    }
                    $key = $person['unitId'].'|'.$person['type'].'|'.$own->pluck('id')->implode(',');
                    $groups[$key] ??= ['unitId' => $person['unitId'], 'type' => $person['type'], 'kpis' => $own->all(), 'people' => []];
                    $groups[$key]['people'][] = $person['id'];
                }
                $names = [];
                $covered = [];
                foreach ($groups as $group) {
                    $pattern = $this->pattern($month, $group['unitId'], $group['type'], $group['kpis'], $units, $names, '');
                    $patterns[] = $pattern;
                    $covered += array_flip(array_column($group['kpis'], 'id'));
                    if (bccomp($this->total($pattern['items']), '100', 4) === 0) {
                        foreach ($group['people'] as $person) {
                            $assignments[] = ['periodId' => $month, 'personId' => $person, 'patternId' => $pattern['id']];
                        }
                    }
                }
                $rest = $rows->reject(fn ($k) => isset($covered[$k['id']]))->groupBy(fn ($k) => $k['unitId'].'|'.$k['targetRole']);
                foreach ($rest as $scope => $group) {
                    [$unitId, $type] = explode('|', $scope);
                    $patterns[] = $this->pattern($month, $unitId, $type, $group->values()->all(), $units, $names, ' (tanpa penerima)');
                }
            }
            $converted = ['version' => 2, 'periods' => $document['periods'] ?? [], 'patterns' => $patterns, 'patternAssignments' => $assignments];
            DB::table('kpi_workspace_documents')->where('id', $row->id)->update(['revision' => $row->revision + 1, 'data' => json_encode($converted, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), 'updated_at' => now()]);
        });
    }

    public function down(): void
    {
        DB::transaction(function () {
            $backup = DB::table('kpi_workspace_documents')->where('scope_key', 'hc-v1')->first();
            if (! $backup) {
                return;
            }
            $revision = (int) DB::table('kpi_workspace_documents')->where('scope_key', 'hc')->value('revision');
            DB::table('kpi_workspace_documents')->where('scope_key', 'hc')->update(['revision' => $revision + 1, 'data' => $backup->data, 'updated_at' => now()]);
            DB::table('kpi_workspace_documents')->where('id', $backup->id)->delete();
        });
    }

    private function pattern(string $month, string $unitId, string $type, array $kpis, $units, array &$names, string $suffix): array
    {
        $base = ($units[$unitId] ?? 'Unit '.$unitId).' – '.($type === 'staff' ? 'Staf' : 'Kepala Unit').$suffix;
        $name = $base;
        for ($i = 2; isset($names[mb_strtolower($name)]); $i++) {
            $name = $base.' ('.$i.')';
        }
        $names[mb_strtolower($name)] = true;

        return ['id' => 'pola-'.Str::lower(Str::random(12)), 'name' => Str::limit($name, 120, ''), 'periodId' => $month, 'targetRole' => $type, 'items' => array_map(fn ($k) => $this->item($k), $kpis)];
    }

    /** Old KPI row to a pattern item; manual/ratio/amount methods become equivalent formulas. */
    private function item(array $k): array
    {
        $policy = is_array($k['policy'] ?? null) ? $k['policy'] : [];
        $item = ['id' => (string) $k['id'], 'name' => (string) ($k['name'] ?? ''), 'pillar' => (string) ($k['pillar'] ?? 'Technical Care'), 'method' => 'formula', 'weight' => (float) ($k['weight'] ?? 0),
            'variables' => is_array($k['variables'] ?? null) ? $k['variables'] : [], 'formula' => (string) ($k['formula'] ?? ''), 'target' => is_numeric($k['target'] ?? null) ? (float) $k['target'] : 0.0,
            'unit' => (string) (($k['unit'] ?? '') ?: '%'), 'direction' => ($k['direction'] ?? 'higher') === 'lower' ? 'lower' : 'higher',
            'policy' => ['rule' => (string) ($policy['rule'] ?? 'pending'), 'zeroRule' => (string) ($policy['zeroRule'] ?? 'pending'), 'min' => (float) ($policy['min'] ?? 10), 'max' => (float) ($policy['max'] ?? 100)]];

        return match ($k['method'] ?? 'formula') {
            'manual' => array_merge($item, ['variables' => [['key' => 'A', 'label' => 'Nilai capaian (10–100)', 'source' => 'manual']], 'formula' => 'A', 'target' => 100.0, 'unit' => 'poin', 'direction' => 'higher',
                'policy' => ['rule' => 'target-normalized', 'zeroRule' => 'pending', 'min' => 10.0, 'max' => 100.0]]),
            'ratio' => array_merge($item, ['variables' => [['key' => 'A', 'label' => (string) (($k['actualLabel'] ?? '') ?: 'Realisasi'), 'source' => 'manual'], ($k['denominatorSource'] ?? '') === 'fixed'
                ? ['key' => 'B', 'label' => (string) (($k['comparisonLabel'] ?? '') ?: 'Pembanding'), 'source' => 'fixed', 'value' => (float) ($k['fixedDenominator'] ?? 0)]
                : ['key' => 'B', 'label' => (string) (($k['comparisonLabel'] ?? '') ?: 'Pembanding'), 'source' => 'manual']], 'formula' => 'A / B * 100', 'unit' => '%']),
            'amount' => array_merge($item, ['variables' => [['key' => 'A', 'label' => (string) (($k['actualLabel'] ?? '') ?: 'Realisasi'), 'source' => 'manual']], 'formula' => 'A']),
            default => $item,
        };
    }

    private function total(array $items): string
    {
        $sum = '0';
        foreach ($items as $item) {
            $sum = bcadd($sum, number_format($item['weight'], 4, '.', ''), 4);
        }

        return $sum;
    }

    /** Staff placed and Kepala Unit assigned in the month, same rules as ScopedRecords::members(). */
    private function people(string $month): array
    {
        $date = $month.'-01';
        $end = CarbonImmutable::parse($date, 'Asia/Jakarta')->addMonth()->utc()->format('Y-m-d H:i:s.u');
        $staff = DB::table('employees as e')->join('employee_placements as p', 'p.employee_id', '=', 'e.id')
            ->join('units as u', 'u.id', '=', 'p.unit_id')->join('divisions as d', 'd.id', '=', 'p.division_id')->join('positions as j', 'j.id', '=', 'e.position_id')
            ->where('p.effective_from', '<=', $date)->where(fn ($q) => $q->whereNull('p.effective_until')->orWhere('p.effective_until', '>=', $date))
            ->where('e.is_active', true)->where('u.is_active', true)->where('d.is_active', true)->where('j.is_active', true)
            ->get(['e.id', 'p.unit_id'])->map(fn ($r) => ['id' => 'staff-'.$r->id, 'unitId' => (string) $r->unit_id, 'type' => 'staff']);
        $heads = DB::table('users as e')->join('scope_assignments as h', 'h.user_id', '=', 'e.id')
            ->join('units as u', 'u.id', '=', 'h.unit_id')->join('divisions as d', 'd.id', '=', 'u.division_id')
            ->where('h.role_key', 'kepala_unit')->where('h.assigned_at', '<', $end)->where(fn ($q) => $q->whereNull('h.revoked_at')->orWhere('h.revoked_at', '>=', $end))
            ->where('e.is_active', true)->where('u.is_active', true)->where('d.is_active', true)
            ->get(['e.id', 'h.unit_id'])->map(fn ($r) => ['id' => 'head-'.$r->id, 'unitId' => (string) $r->unit_id, 'type' => 'unit_head']);

        return $staff->concat($heads)->unique('id')->values()->all();
    }
};
