<?php

namespace App\Http\Controllers;

use App\Models\AssessmentCycle;
use App\Queries\ScopedRecords;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportingController extends Controller
{
    public function __construct(private ScopedRecords $records) {}

    public function members(Request $r)
    {
        return $this->people($r, false);
    }

    public function heads(Request $r)
    {
        return $this->people($r, true);
    }

    private function people(Request $r, bool $heads)
    {
        $d = $r->validate(['cycle_id' => ['required_with:needs_input', 'integer', 'min:1'], 'needs_input' => ['sometimes', 'boolean'], 'search' => ['sometimes', 'string', 'max:160'], 'unit_id' => ['sometimes', 'integer', 'min:1'], 'position_id' => ['sometimes', 'integer', 'min:1']]);
        $ctx = $r->attributes->get('access_context');
        $month = isset($d['cycle_id']) ? AssessmentCycle::findOrFail($d['cycle_id'])->assessment_month->format('Y-m-d') : null;
        $q = $this->records->members($ctx, $heads, $month);
        if (isset($d['unit_id'])) {
            $q->where('u.id', $d['unit_id']);
        }
        if (isset($d['position_id'])) {
            $heads ? $q->whereRaw('1=0') : $q->where('e.position_id', $d['position_id']);
        }
        if (isset($d['search'])) {
            $q->where(fn ($q) => $q->where($heads ? 'e.name' : 'e.full_name', 'like', '%'.$d['search'].'%')->orWhere($heads ? 'e.login_nip' : 'e.nip', 'like', '%'.$d['search'].'%'));
        }
        if (isset($d['cycle_id'])) {
            $visible = $this->records->assessments($ctx)->where('cycle_id', $d['cycle_id'])->where('assessment_kind', $heads ? 'unit_head' : 'member')->select('id', $heads ? 'subject_user_id' : 'employee_id', 'status', 'lock_version');
            $q->leftJoinSub($visible, 'a', $heads ? 'a.subject_user_id' : 'a.employee_id', '=', 'e.id')->addSelect('a.id as assessment_id', 'a.status', 'a.lock_version');
            if ($d['needs_input'] ?? false) {
                $q->where(fn ($q) => $q->whereNull('a.id')->orWhere('a.status', 'returned'));
            }
        }

        return response()->json($q->orderBy($heads ? 'e.name' : 'e.full_name')->paginate(25));
    }

    public function team(Request $r)
    {
        $ctx = $r->attributes->get('access_context');
        $month = now('Asia/Jakarta')->startOfMonth()->format('Y-m-d');
        $q = $this->records->units($ctx)->select('units.*')->where('units.is_active', true)
            ->selectSub(DB::table('scope_assignments as h')->join('users as u', 'u.id', '=', 'h.user_id')->whereColumn('h.unit_id', 'units.id')->whereNull('h.revoked_at')->select('u.name')->limit(1), 'head_name')
            ->selectSub(DB::table('employee_placements as p')->join('employees as e', 'e.id', '=', 'p.employee_id')->whereColumn('p.unit_id', 'units.id')->where('p.effective_from', '<=', $month)->where(fn ($q) => $q->whereNull('p.effective_until')->orWhere('p.effective_until', '>=', $month))->where('e.is_active', true)->selectRaw('COUNT(*)'), 'employee_count');

        return response()->json(['data' => $q->orderBy('name')->get()]);
    }

    public function dashboard(Request $r)
    {
        $d = $r->validate(['cycle_id' => ['required', 'integer', 'exists:assessment_cycles,id']]);
        $ctx = $r->attributes->get('access_context');
        $cycle = AssessmentCycle::findOrFail($d['cycle_id']);
        $month = $cycle->assessment_month->format('Y-m-d');
        $counts = $this->records->assessments($ctx)->where('cycle_id', $cycle->id)->selectRaw('status,COUNT(*) as total')->groupBy('status')->pluck('total', 'status');
        $pending = [];
        foreach ([false, true] as $heads) {
            if ($heads && $ctx->role === 'kepala_unit') {
                $pending['unit_heads'] = 0;
                $pending['not_started_heads'] = 0;

                continue;
            }
            $q = $this->records->members($ctx, $heads, $month);
            $pending[$heads ? 'unit_heads' : 'members'] = (clone $q)->count();
            $pending[$heads ? 'not_started_heads' : 'not_started_members'] = $q->whereNotExists(fn ($s) => $s->selectRaw('1')->from('assessments as a')->whereColumn($heads ? 'a.subject_user_id' : 'a.employee_id', 'e.id')->where('a.cycle_id', $cycle->id))->count();
        }
        $breakdown = $this->records->assessments($ctx)->where('cycle_id', $cycle->id)->selectRaw('division_id,unit_id,assessment_kind,status,COUNT(*) as total')->groupBy('division_id', 'unit_id', 'assessment_kind', 'status')->get();

        return response()->json(['data' => ['cycle_id' => $cycle->id, 'statuses' => $counts, 'breakdown' => $breakdown] + $pending]);
    }

    public function recap(Request $r)
    {
        $f = $r->validate(['cycle_id' => ['required', 'integer', 'min:1'], 'unit_id' => ['sometimes', 'integer', 'min:1'], 'division_id' => ['sometimes', 'integer', 'min:1'], 'format' => ['sometimes', 'in:json,tsv'], 'status' => ['sometimes', 'in:submitted,returned,final,all'], 'kind' => ['sometimes', 'in:member,unit_head'], 'search' => ['sometimes', 'string', 'max:160']]);
        $q = $this->records->assessments($r->attributes->get('access_context'))->where('cycle_id', $f['cycle_id']);
        if (($f['status'] ?? 'final') !== 'all') {
            $q->where('status', $f['status'] ?? 'final');
        }
        if (isset($f['kind'])) {
            $q->where('assessment_kind', $f['kind']);
        }
        foreach (['unit_id', 'division_id'] as $k) {
            if (isset($f[$k])) {
                $q->where($k, $f[$k]);
            }
        }
        if (isset($f['search'])) {
            $q->where(fn ($q) => $q->where('employee_name_snapshot', 'like', '%'.$f['search'].'%')->orWhere('nip_snapshot', 'like', '%'.$f['search'].'%'));
        }
        $q->select('id', 'assessment_kind', 'nip_snapshot', 'employee_name_snapshot', 'division_name_snapshot', 'unit_name_snapshot', 'status', 'total_score_raw', 'category_label_snapshot', 'positive_finding', 'negative_finding', 'finalized_by', 'finalized_at')->orderBy('id');
        if (($f['format'] ?? 'json') !== 'tsv') {
            return response()->json($q->paginate(25));
        }

        return response()->streamDownload(function () use ($q) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['ID', 'Jenis', 'NIP', 'Nama', 'Divisi', 'Unit', 'Status', 'Nilai', 'Kategori', 'Temuan positif', 'Temuan negatif', 'Pemutus', 'Final UTC'], "\t", '"', '');
            foreach ($q->cursor() as $row) {
                $v = array_map(function ($v) {
                    $s = str_replace(["\t", "\r", "\n"], ' ', (string) $v);

                    return preg_match('/^[=+@-]/', ltrim($s)) ? "'".$s : $s;
                }, array_values($row->toArray()));
                fputcsv($out, $v, "\t", '"', '');
            }fclose($out);
        }, 'rekap-kpi.tsv', ['Content-Type' => 'text/tab-separated-values; charset=UTF-8']);
    }
}
