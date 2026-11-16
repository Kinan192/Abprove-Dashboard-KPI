<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Single stored KPI workspace document (periods, KPI patterns and pattern assignments) with optimistic revisions.
 */
class KpiWorkspaceDocument
{
    private const SCOPE = 'hc';

    /** @return array{id: int, revision: int, data: array} */
    public function load(bool $lock = false): array
    {
        $query = fn () => DB::table('kpi_workspace_documents')->where('scope_key', self::SCOPE);
        if (! $query()->exists()) {
            DB::table('kpi_workspace_documents')->insertOrIgnore([
                'scope_key' => self::SCOPE,
                'revision' => 0,
                'data' => json_encode($this->initial(), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        $row = ($lock ? $query()->lockForUpdate() : $query())->firstOrFail();

        return ['id' => (int) $row->id, 'revision' => (int) $row->revision, 'data' => json_decode($row->data, true, 512, JSON_THROW_ON_ERROR)];
    }

    public function write(int $id, int $revision, array $data, int $userId): int
    {
        DB::table('kpi_workspace_documents')->where('id', $id)->update([
            'revision' => $revision,
            'data' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            'updated_by' => $userId,
            'updated_at' => now(),
        ]);

        return $revision;
    }

    private function initial(): array
    {
        $now = CarbonImmutable::now('Asia/Jakarta');
        $month = $now->format('Y-m');

        return [
            'version' => 2,
            'periods' => [[
                'id' => $month,
                'name' => 'Penilaian '.CarbonImmutable::parse($month.'-01')->locale('id')->isoFormat('MMMM YYYY'),
                'status' => 'planned',
                'opens' => $now->startOfMonth()->format('Y-m-d\TH:i'),
                'submission' => $now->addDays(5)->format('Y-m-d\TH:i'),
                'approval' => $now->addDays(8)->format('Y-m-d\TH:i'),
                'closes' => $now->addDays(10)->format('Y-m-d\TH:i'),
                'categories' => ['sb' => 90, 'b' => 80, 'c' => 70],
            ]],
            'patterns' => [],
            'patternAssignments' => [],
        ];
    }
}
