<?php

namespace App\Services\Organization;

use App\Exceptions\BusinessRule;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\AccessContext;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/** Monthly staff placements: individual and bulk transfers with a server-side impact preview. */
class PlacementService
{
    public const MAX_BATCH = 500;

    public function __construct(private OrganizationRules $rules, private AuditWriter $audit) {}

    /**
     * Per-employee impact of moving the given staff to a unit from a month. Mirrors every rule of
     * place() so the confirmation step shows the same blockers the mutation would raise.
     */
    public function preview(array $employeeIds, ?int $unitId, string $from): array
    {
        $earliest = $this->rules->earliestPlacementMonth();
        $target = $unitId ? DB::table('units as u')->join('divisions as d', 'd.id', '=', 'u.division_id')->where('u.id', $unitId)
            ->first(['u.id', 'u.name', 'u.is_active', 'u.division_id', 'd.name as division_name', 'd.is_active as division_active']) : null;
        $blockers = [];
        if ($unitId && ! $target) {
            $blockers[] = ['code' => 'NOT_FOUND', 'message' => 'Unit tujuan tidak ditemukan. Muat ulang halaman.'];
        } elseif ($target && (! $target->is_active || ! $target->division_active)) {
            $blockers[] = ['code' => 'MASTER_INACTIVE', 'message' => "Unit {$target->name} atau divisinya tidak aktif."];
        }
        $heads = $target ? DB::table('scope_assignments as s')->join('users as u', 'u.id', '=', 's.user_id')->whereNull('s.revoked_at')
            ->where(fn ($q) => $q->where('s.unit_id', $target->id)->orWhere('s.division_id', $target->division_id))
            ->pluck('u.name', 's.role_key') : collect();

        $employees = DB::table('employees as e')->leftJoin('positions as p', 'p.id', '=', 'e.position_id')->whereIn('e.id', $employeeIds)
            ->orderBy('e.full_name')->get(['e.id', 'e.full_name', 'e.nip', 'e.is_active', 'p.name as position_name']);
        $placements = DB::table('employee_placements as p')->join('units as u', 'u.id', '=', 'p.unit_id')->join('divisions as d', 'd.id', '=', 'p.division_id')
            ->whereIn('p.employee_id', $employeeIds)->orderBy('p.effective_from')
            ->get(['p.id', 'p.employee_id', 'p.unit_id', 'p.division_id', 'p.effective_from', 'p.effective_until', 'u.name as unit_name', 'd.name as division_name'])
            ->groupBy('employee_id');
        $pending = $this->rules->pending(DB::table('assessments')->whereIn('employee_id', $employeeIds), $from)
            ->groupBy('employee_id')->selectRaw('employee_id, COUNT(*) as total')->pluck('total', 'employee_id');
        $origins = $placements->map(fn ($rows) => $this->covering($rows, $from))->filter();
        $used = DB::table('assessments')->whereIn('placement_id', $origins->filter(fn ($p) => $p->effective_from === $from)->pluck('id'))
            ->distinct()->pluck('placement_id')->flip();

        $staff = $employees->map(function ($e) use ($placements, $origins, $pending, $used, $from, $earliest, $target) {
            $rows = $placements[$e->id] ?? collect();
            $origin = $origins[$e->id] ?? null;
            $scheduled = $rows->filter(fn ($p) => $p->id !== $origin?->id && $p->effective_from >= $from)->values();
            $issues = [];
            if (! $e->is_active) {
                $issues[] = ['code' => 'MASTER_INACTIVE', 'message' => 'Staf nonaktif.'];
            }
            if ($rows->isNotEmpty() && $from < $earliest) {
                $issues[] = ['code' => 'PAST_PLACEMENT', 'message' => 'Bulan efektif paling awal '.$this->label($earliest).'; histori tidak ditulis mundur.'];
            }
            if ($target && $origin && (int) $origin->unit_id === (int) $target->id) {
                $issues[] = ['code' => 'SAME_UNIT', 'message' => "Sudah ditempatkan di Unit {$target->name} pada bulan itu."];
            }
            if ($scheduled->isNotEmpty()) {
                $next = $scheduled->first();
                $issues[] = ['code' => 'PLACEMENT_OVERLAP', 'message' => "Bentrok jadwal: sudah ada penempatan ke Unit {$next->unit_name} mulai {$this->label($next->effective_from)}."];
            }
            if ($count = (int) ($pending[$e->id] ?? 0)) {
                $issues[] = ['code' => 'ACTIVE_ASSESSMENTS', 'message' => "{$count} penilaian non-Final sejak {$this->label($from)}."];
            }
            if ($origin && isset($used[$origin->id])) {
                $issues[] = ['code' => 'PLACEMENT_IN_USE', 'message' => 'Penempatan bulan ini sudah dipakai penilaian; pilih bulan sesudahnya.'];
            }

            return [
                'employee_id' => $e->id, 'name' => $e->full_name, 'nip' => $e->nip, 'position_name' => $e->position_name,
                'current' => $origin ? $this->placementRow($origin) : null,
                'scheduled' => $scheduled->map(fn ($p) => $this->placementRow($p))->all(),
                'pending_assessments' => (int) ($pending[$e->id] ?? 0),
                'blockers' => $issues,
            ];
        })->values();

        return [
            'effective_from' => $from,
            'min_effective_month' => substr($earliest, 0, 7),
            'target' => $target ? [
                'unit_id' => $target->id, 'unit_name' => $target->name, 'division_id' => $target->division_id, 'division_name' => $target->division_name,
                'head_name' => $heads['kepala_unit'] ?? null, 'division_head_name' => $heads['kepala_divisi'] ?? null,
            ] : null,
            'blockers' => $blockers,
            'staff' => $staff->all(),
            'summary' => [
                'total' => $staff->count(),
                'ready' => $staff->filter(fn ($s) => ! $s['blockers'])->count(),
                'blocked' => $staff->filter(fn ($s) => (bool) $s['blockers'])->count(),
                'origins' => $staff->groupBy(fn ($s) => $s['current']['unit_name'] ?? 'Tanpa penempatan')->map->count()->all(),
            ],
        ];
    }

    /** Moves every listed employee atomically; any failure rolls back the whole batch. */
    public function transfer(AccessContext $ctx, array $data): array
    {
        abort_unless($ctx->role === 'super_hc', 403);
        $unit = $this->rules->active('units', $data['unit_id']);
        $this->rules->active('divisions', $unit->division_id);
        $items = collect($data['items'])->sortBy('employee_id')->values();
        $batch = $items->count() > 1 ? ['batch_id' => $data['request_id'], 'batch_size' => $items->count()] : [];
        $results = [];
        foreach ($items as $item) {
            try {
                $results[] = $this->place($ctx, (int) $item['employee_id'], [
                    'unit_id' => $data['unit_id'], 'effective_from' => $data['effective_from'],
                    'expected_placement_id' => $item['expected_placement_id'], 'reason' => $data['reason'],
                ], $batch);
            } catch (BusinessRule $e) {
                $name = DB::table('employees')->where('id', $item['employee_id'])->value('full_name') ?? 'Staf #'.$item['employee_id'];
                throw new BusinessRule($e->errorCode, "{$name}: {$e->getMessage()} Tidak ada staf yang dipindahkan.", $e->httpStatus);
            }
        }

        return ['moved' => count($results), 'unit_id' => $unit->id, 'effective_from' => $data['effective_from'], 'placements' => $results];
    }

    public function place(AccessContext $ctx, int $employee, array $data, array $batch = []): array
    {
        $this->rules->active('employees', $employee);
        $unit = $this->rules->active('units', $data['unit_id']);
        $this->rules->active('divisions', $unit->division_id);
        $from = $data['effective_from'];
        $rows = DB::table('employee_placements')->where('employee_id', $employee)->orderBy('effective_from')->lockForUpdate()->get();
        $earliest = $this->rules->earliestPlacementMonth();
        if ($rows->isNotEmpty() && $from < $earliest) {
            throw new BusinessRule('PAST_PLACEMENT', 'Bulan efektif paling awal '.$this->label($earliest).'; histori tidak ditulis mundur.', 422);
        }
        $old = $this->covering($rows, $from);
        if (($old ? (int) $old->id : null) !== (isset($data['expected_placement_id']) ? (int) $data['expected_placement_id'] : null)) {
            throw new BusinessRule('STALE_PLACEMENT', 'Penempatan berubah sejak pratinjau; muat ulang pratinjau.');
        }
        if ($old && (int) $old->unit_id === (int) $unit->id) {
            throw new BusinessRule('SAME_UNIT', "Unit tujuan sama dengan unit saat ini ({$unit->name}).");
        }
        if ($next = $rows->first(fn ($p) => $p->id !== ($old->id ?? null) && $p->effective_from >= $from)) {
            throw new BusinessRule('PLACEMENT_OVERLAP', 'Bentrok jadwal: sudah ada penempatan mulai '.$this->label($next->effective_from).'.');
        }
        $this->rules->noPending(DB::table('assessments')->where('employee_id', $employee), $from);
        if ($old && $old->effective_from === $from) {
            if (DB::table('assessments')->where('placement_id', $old->id)->exists()) {
                throw new BusinessRule('PLACEMENT_IN_USE', 'Penempatan bulan ini sudah dipakai penilaian; pilih bulan sesudahnya.');
            }
            DB::table('employee_placements')->where('id', $old->id)->delete();
        } elseif ($old) {
            DB::table('employee_placements')->where('id', $old->id)->update(['effective_until' => CarbonImmutable::parse($from)->subMonth()->format('Y-m-d')]);
        }
        $new = DB::table('employee_placements')->insertGetId(['employee_id' => $employee, 'unit_id' => $unit->id, 'division_id' => $unit->division_id, 'effective_from' => $from, 'reason' => $data['reason'], 'created_by' => $ctx->userId]);
        $result = (array) DB::table('employee_placements')->where('id', $new)->first();
        // full_name lets audit lists name the staff without loading the employee row.
        $name = ['full_name' => DB::table('employees')->where('id', $employee)->value('full_name')];
        $this->audit->record($ctx, 'employee', $employee, $old ? 'employee.transferred' : 'employee.placed', $old ? (array) $old : null, $result + $name + $batch, $data['reason']);

        return $result;
    }

    /** Placement history with unit and division names, newest first. */
    public function history(int $employee): array
    {
        return DB::table('employee_placements as p')->join('units as u', 'u.id', '=', 'p.unit_id')->join('divisions as d', 'd.id', '=', 'p.division_id')
            ->leftJoin('users as by', 'by.id', '=', 'p.created_by')->where('p.employee_id', $employee)->orderByDesc('p.effective_from')
            ->get(['p.id', 'p.unit_id', 'p.division_id', 'p.effective_from', 'p.effective_until', 'p.reason', 'p.created_at',
                'u.name as unit_name', 'd.name as division_name', 'by.name as created_by_name'])
            ->map(fn ($p) => $this->placementRow($p) + ['reason' => $p->reason, 'created_by_name' => $p->created_by_name, 'created_at' => $p->created_at.'Z'])
            ->all();
    }

    private function covering($rows, string $from): ?object
    {
        return $rows->first(fn ($p) => $p->effective_from <= $from && (! $p->effective_until || $p->effective_until >= $from));
    }

    private function placementRow(object $p): array
    {
        return [
            'placement_id' => $p->id, 'unit_id' => $p->unit_id, 'unit_name' => $p->unit_name, 'division_id' => $p->division_id,
            'division_name' => $p->division_name, 'from' => substr($p->effective_from, 0, 7), 'until' => $p->effective_until ? substr($p->effective_until, 0, 7) : null,
        ];
    }

    private function label(string $month): string
    {
        return CarbonImmutable::parse($month)->locale('id')->translatedFormat('F Y');
    }
}
