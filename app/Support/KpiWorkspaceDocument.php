<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class KpiWorkspaceDocument
{
    public function initial(): array
    {
        if ($this->demoUnits()->isNotEmpty()) {
            $demoUnits = $this->demoUnits();
            $demoDivisions = DB::table('divisions')->where('code', 'like', 'DEMO-%')->pluck('id');
            $units = DB::table('units')->where('is_active', true)->whereIn('id', $demoUnits)->orderBy('id')->get(['id', 'name', 'division_id']);
            $divisionNames = DB::table('divisions')->where('is_active', true)->whereIn('id', $demoDivisions)->pluck('name', 'id');
        } else {
            $units = DB::table('units')->where('is_active', true)->orderBy('id')->get(['id', 'name', 'division_id']);
            $divisionNames = DB::table('divisions')->where('is_active', true)->pluck('name', 'id');
        }
        $demo = $this->demoUnits()->isNotEmpty();

        $people = [];
        $unitDivision = $units->pluck('division_id', 'id');

        $staff = DB::table('employees as e')
            ->join('employee_placements as p', 'p.employee_id', '=', 'e.id')
            ->where('e.is_active', true)
            ->when($demo, fn ($q) => $q->whereIn('p.unit_id', $units->pluck('id')))
            ->where('p.effective_from', '<=', now('Asia/Jakarta')->toDateString())
            ->where(fn ($q) => $q->whereNull('p.effective_until')->orWhere('p.effective_until', '>=', now('Asia/Jakarta')->toDateString()))
            ->orderBy('e.id')
            ->get(['e.id', 'e.full_name', 'e.nip', 'p.unit_id', 'p.division_id']);
        foreach ($staff as $row) {
            $people[] = [
                'id' => 'staff-'.$row->id,
                'name' => $row->full_name,
                'nip' => $row->nip,
                'type' => 'staff',
                'unitId' => (string) $row->unit_id,
                'divisionId' => (string) $row->division_id,
            ];
        }

        $assignments = DB::table('scope_assignments as s')
            ->join('users as u', 'u.id', '=', 's.user_id')
            ->whereNull('s.revoked_at')
            ->where('u.is_active', true)
            ->when($demo, fn ($q) => $q->where(fn ($q) => $q->whereIn('s.unit_id', $units->pluck('id'))->orWhereIn('s.division_id', $divisionNames->keys())))
            ->orderBy('s.id')
            ->get(['s.role_key', 's.unit_id', 's.division_id', 'u.id', 'u.name', 'u.login_nip']);
        foreach ($assignments as $row) {
            if ($row->role_key === 'kepala_unit' && $row->unit_id) {
                $people[] = [
                    'id' => 'head-'.$row->id,
                    'name' => $row->name,
                    'nip' => $row->login_nip,
                    'type' => 'unit_head',
                    'unitId' => (string) $row->unit_id,
                    'divisionId' => (string) ($unitDivision[$row->unit_id] ?? ''),
                ];
            }
            if ($row->role_key === 'kepala_divisi' && $row->division_id) {
                $people[] = [
                    'id' => 'head-'.$row->id,
                    'name' => $row->name,
                    'nip' => $row->login_nip,
                    'type' => 'division_head',
                    'unitId' => '',
                    'divisionId' => (string) $row->division_id,
                ];
            }
        }

        $month = now('Asia/Jakarta')->format('Y-m');
        $periods = [[
            'id' => $month,
            'name' => 'Penilaian '.CarbonImmutable::parse($month.'-01')->locale('id')->isoFormat('MMMM YYYY'),
            'status' => 'planned',
            'opens' => now('Asia/Jakarta')->startOfMonth()->format('Y-m-d\TH:i'),
            'submission' => now('Asia/Jakarta')->addDays(5)->format('Y-m-d\TH:i'),
            'approval' => now('Asia/Jakarta')->addDays(8)->format('Y-m-d\TH:i'),
            'closes' => now('Asia/Jakarta')->addDays(10)->format('Y-m-d\TH:i'),
            'categories' => ['sb' => 90, 'b' => 80, 'c' => 70],
        ]];

        return [
            'version' => 1,
            'revision' => 0,
            'kpis' => [],
            'assessments' => [],
            'audit' => [],
            'units' => $units->map(fn ($u) => [
                'id' => (string) $u->id,
                'name' => $u->name,
                'divisionId' => (string) $u->division_id,
                'divisionName' => $divisionNames[$u->division_id] ?? '',
            ])->values()->all(),
            'people' => $people,
            'periods' => $periods,
        ];
    }

    private function demoUnits()
    {
        return DB::table('units')->where('code', 'like', 'DEMO-%')->pluck('id');
    }
}
