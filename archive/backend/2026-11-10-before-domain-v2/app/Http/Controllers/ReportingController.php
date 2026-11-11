<?php

namespace App\Http\Controllers;

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
        $data = $r->validate(['cycle_id' => ['required_with:needs_input', 'integer', 'min:1'], 'needs_input' => ['sometimes', 'boolean'], 'search' => ['sometimes', 'string', 'max:160'], 'unit_id' => ['sometimes', 'integer', 'min:1'], 'position_id' => ['sometimes', 'integer', 'min:1']]);
        $ctx = $r->attributes->get('access_context');
        $q = $this->records->members($ctx, $heads);
        if (isset($data['unit_id'])) {
            $q->where('p.unit_id', $data['unit_id']);
        }
        if (isset($data['position_id'])) {
            $q->where('e.position_id', $data['position_id']);
        }
        if (isset($data['search'])) {
            $q->where(fn ($q) => $q->where('e.full_name', 'like', '%'.$data['search'].'%')->orWhere('e.nip', 'like', '%'.$data['search'].'%'));
        }
        $q->select('e.id', 'e.nip', 'e.full_name', 'e.position_id', 'p.id as placement_id', 'p.unit_id', 'p.division_id', 'u.name as unit_name', 'd.name as division_name', 'j.name as position_name');
        if (isset($data['cycle_id'])) {
            $visible = $this->records->assessments($ctx)->where('cycle_id', $data['cycle_id'])->select('id', 'employee_id', 'status', 'lock_version');
            $q->leftJoinSub($visible, 'a', 'a.employee_id', '=', 'e.id')->addSelect('a.id as assessment_id', 'a.status', 'a.lock_version');
            if ($data['needs_input'] ?? false) {
                $q->where(fn ($q) => $q->where('a.status', 'draft')
                    ->orWhere(fn ($q) => $q->whereNull('a.id')->whereNotExists(fn ($s) => $s->selectRaw('1')->from('assessments as existing')
                        ->whereColumn('existing.employee_id', 'e.id')->where('existing.cycle_id', $data['cycle_id']))));
            }
        }

        return response()->json($q->orderBy('e.full_name')->paginate(25));
    }

    public function team(Request $r)
    {
        $ctx = $r->attributes->get('access_context');
        $q = DB::table('units as u')->join('divisions as d', 'd.id', '=', 'u.division_id')
            ->leftJoin('scope_assignments as h', function ($j) {
                $j->on('h.unit_id', '=', 'u.id')->where('h.role_key', 'kepala_unit')->whereNull('h.revoked_at')->where('h.assigned_at', '<=', now()->format('Y-m-d H:i:s.u'));
            })->leftJoin('users as leader', 'leader.id', '=', 'h.user_id')
            ->where('u.is_active', true)->where('d.is_active', true);
        if ($ctx->role === 'kepala_divisi') {
            $q->where('u.division_id', $ctx->divisionId);
        }
        if ($ctx->role === 'kepala_unit') {
            $q->where('u.id', $ctx->unitId);
        }

        $q->select('u.id', 'u.code', 'u.name', 'u.division_id', 'd.name as division_name', 'h.id as head_assignment_id', 'leader.id as head_user_id', 'leader.name as head_name');
        $q->selectSub(DB::table('employee_placements as p')->join('employees as e', 'e.id', '=', 'p.employee_id')
            ->whereColumn('p.unit_id', 'u.id')->whereNull('p.ended_at')->where('e.is_active', true)->selectRaw('COUNT(*)'), 'employee_count');

        return response()->json(['data' => $q->orderBy('u.name')->get()]);
    }

    public function dashboard(Request $r)
    {
        $data = $r->validate(['cycle_id' => ['required', 'integer', 'min:1']]);
        $ctx = $r->attributes->get('access_context');
        $counts = $this->records->assessments($ctx)->where('cycle_id', $data['cycle_id'])->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');
        $members = $this->records->members($ctx)->count();
        $heads = $ctx->role === 'kepala_unit' ? 0 : $this->records->members($ctx, true)->count();
        $notStarted = $this->records->members($ctx)->whereNotExists(fn ($q) => $q->selectRaw('1')->from('assessments as a')->whereColumn('a.employee_id', 'e.id')->where('a.cycle_id', $data['cycle_id']))->count();
        $notStartedHeads = $ctx->role === 'kepala_unit' ? 0 : $this->records->members($ctx, true)->whereNotExists(fn ($q) => $q->selectRaw('1')->from('assessments as a')->whereColumn('a.employee_id', 'e.id')->where('a.cycle_id', $data['cycle_id']))->count();
        $breakdown = $this->records->assessments($ctx)->where('cycle_id', $data['cycle_id'])
            ->selectRaw('division_id, unit_id, assessment_kind, status, COUNT(*) as total')
            ->groupBy('division_id', 'unit_id', 'assessment_kind', 'status')->orderBy('division_id')->orderBy('unit_id')->get();

        return response()->json(['data' => ['cycle_id' => (int) $data['cycle_id'], 'members' => $members, 'unit_heads' => $heads, 'not_started_members' => $notStarted, 'not_started_heads' => $notStartedHeads, 'statuses' => $counts, 'breakdown' => $breakdown, 'history_guard' => 'O-7: histori kepala/penempatan terdahulu tidak disertakan untuk kepala.']]);
    }

    public function recap(Request $r)
    {
        $f = $r->validate(['cycle_id' => ['required', 'integer', 'min:1'], 'division_id' => ['sometimes', 'integer', 'min:1'], 'unit_id' => ['sometimes', 'integer', 'min:1'], 'format' => ['sometimes', 'in:json,tsv'], 'status' => ['sometimes', 'in:draft,submitted,returned,final,all'], 'kind' => ['sometimes', 'in:member,unit_head'], 'search' => ['sometimes', 'string', 'max:160']]);
        $q = $this->records->assessments($r->attributes->get('access_context'))->where('cycle_id', $f['cycle_id']);
        if (($f['status'] ?? 'final') !== 'all') {
            $q->where('status', $f['status'] ?? 'final');
        }
        if (isset($f['kind'])) {
            $q->where('assessment_kind', $f['kind']);
        }
        if (isset($f['search'])) {
            $q->where(fn ($q) => $q->where('employee_name_snapshot', 'like', '%'.$f['search'].'%')->orWhere('nip_snapshot', 'like', '%'.$f['search'].'%'));
        }
        foreach (['division_id', 'unit_id'] as $key) {
            if (isset($f[$key])) {
                $q->where($key, $f[$key]);
            }
        }
        $q->orderBy('id')->select('id', 'assessment_kind', 'nip_snapshot', 'employee_name_snapshot', 'division_name_snapshot', 'unit_name_snapshot', 'position_name_snapshot', 'status', 'total_score_raw', 'category_label_snapshot', 'positive_finding', 'negative_finding', 'approved_by', 'finalized_at');
        $q->selectSub(DB::table('assessment_cycles')->select('assessment_month')->whereColumn('id', 'assessments.cycle_id'), 'assessment_month');
        if (($f['format'] ?? 'json') !== 'tsv') {
            return response()->json($q->paginate(25));
        }

        return response()->streamDownload(function () use ($q) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['ID', 'Jenis', 'NIP', 'Nama', 'Divisi', 'Unit', 'Jabatan', 'Status', 'Nilai', 'Kategori', 'Temuan positif', 'Temuan negatif', 'Pemutus', 'Final UTC', 'Bulan dinilai'], "\t", '"', '');
            foreach ($q->cursor() as $row) {
                $values = array_map(function ($v) {
                    $s = str_replace(["\t", "\r", "\n"], ' ', (string) $v);

                    return preg_match('/^[=+@-]/', ltrim($s)) ? "'".$s : $s;
                }, array_values($row->toArray()));
                fputcsv($out, $values, "\t", '"', '');
            }
            fclose($out);
        }, 'rekap-kpi.tsv', ['Content-Type' => 'text/tab-separated-values; charset=UTF-8']);
    }
}
