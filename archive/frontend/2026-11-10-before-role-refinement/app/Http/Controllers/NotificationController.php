<?php

namespace App\Http\Controllers;

use App\Http\Requests\RequestIdRequest;
use App\Models\AssessmentCycle;
use App\Queries\ScopedRecords;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\MutationRunner;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function __construct(private ScopedRecords $records) {}

    public function tasks($ctx, int $cycle)
    {
        $month = AssessmentCycle::findOrFail($cycle)->assessment_month->format('Y-m-d');
        $rows = $this->records->assessments($ctx)->where('cycle_id', $cycle)->where('status', '!=', 'final')->get();
        $tasks = $rows->filter(fn ($a) => $ctx->role === 'super_hc' || ($ctx->role === 'kepala_unit' ? $a->status === 'returned' : $a->status === 'submitted'))->map(fn ($a) => ['key' => 'assessment:'.$a->id.':'.$a->lock_version.':'.$a->status, 'assessment_id' => $a->id, 'name' => $a->employee_name_snapshot, 'status' => $a->status, 'kind' => $a->assessment_kind]);
        if ($ctx->role !== 'kepala_unit') {
            foreach ([false, true] as $head) {
                if (! $head && $ctx->role === 'kepala_divisi') {
                    continue;
                }
                $existing = $this->records->assessments($ctx)->where('cycle_id', $cycle)->pluck($head ? 'subject_user_id' : 'employee_id')->filter();
                foreach ($this->records->members($ctx, $head, $month)->whereNotIn('e.id', $existing)->get() as $p) {
                    $tasks->push(['key' => ($head ? 'head:' : 'member:').$p->id.':'.$cycle.':not_started', 'name' => $p->full_name, 'status' => 'not_started', 'kind' => $head ? 'unit_head' : 'member']);
                }
            }
        }
        $read = DB::table('notification_reads')->where('user_id', $ctx->userId)->where('cycle_id', $cycle)->pluck('notification_key');

        return $tasks->map(fn ($a) => $a + ['read' => $read->contains($a['key'])])->values();
    }

    public function index(Request $r)
    {
        $d = $r->validate(['cycle_id' => ['required', 'integer', 'min:1'], 'page' => ['sometimes', 'integer', 'min:1']]);
        $items = $this->tasks($r->attributes->get('access_context'), $d['cycle_id']);
        $page = $r->integer('page', 1);

        return response()->json(new LengthAwarePaginator($items->slice(($page - 1) * 25, 25)->values(), $items->count(), 25, $page, ['path' => $r->url()]));
    }

    public function read(RequestIdRequest $r, MutationRunner $mutations, AuditWriter $audit)
    {
        $d = $r->validate(['request_id' => ['required', 'uuid'], 'cycle_id' => ['required', 'integer', 'min:1'], 'keys' => ['sometimes', 'array', 'max:500'], 'keys.*' => ['required', 'string', 'max:160', 'distinct']]);

        return response()->json($mutations->run($r, $d, 'notifications.read', fn ($c) => null, function ($ctx) use ($d, $audit) {
            $allowed = $this->tasks($ctx, $d['cycle_id'])->pluck('key');
            $keys = $d['keys'] ?? $allowed->all();
            if (array_diff($keys, $allowed->all())) {
                abort(422, 'Notifikasi di luar tugas akun.');
            }
            foreach ($keys as $key) {
                DB::table('notification_reads')->updateOrInsert(['user_id' => $ctx->userId, 'cycle_id' => $d['cycle_id'], 'notification_key' => $key], ['read_at' => now()]);
            }
            $result = ['read_count' => count($keys)];
            $audit->record($ctx, 'user', $ctx->userId, 'notifications.read', null, $result);

            return $result;
        }));
    }

    public function remind(RequestIdRequest $r, MutationRunner $mutations, AuditWriter $audit, int $unit)
    {
        return response()->json($mutations->run($r, $r->validated(), 'unit.reminder:'.$unit, fn ($c) => abort_unless($c->role === 'super_hc', 403), function ($ctx) use ($unit, $audit) {
            DB::table('units')->where('id', $unit)->firstOrFail();
            $result = ['unit_id' => $unit, 'recorded' => true, 'message_sent' => false];
            $audit->record($ctx, 'units', $unit, 'reminder.recorded', null, $result);

            return $result;
        }));
    }
}
