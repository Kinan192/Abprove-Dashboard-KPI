<?php

namespace App\Http\Controllers;

use App\Exceptions\BusinessRule;
use App\Http\Requests\Notification\NotificationReadRequest;
use App\Queries\AssessmentTasks;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\MutationRunner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function __construct(private AssessmentTasks $tasks) {}

    public function index(Request $r)
    {
        $d = $r->validate(['cycle_id' => ['required', 'integer', 'min:1'], 'page' => ['sometimes', 'integer', 'min:1'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]);
        $cycle = DB::table('assessment_cycles')->select('id', 'assessment_month')->where('id', $d['cycle_id'])->first() ?? abort(404);

        return response()->json($this->tasks->page($r->attributes->get('access_context'), $cycle, $d['per_page'] ?? 25, $d['page'] ?? 1)->withPath($r->url()));
    }

    public function read(NotificationReadRequest $r, MutationRunner $mutations, AuditWriter $audit)
    {
        $d = $r->validated();

        return response()->json($mutations->run($r, $d, 'notifications.read', fn ($c) => null, function ($ctx) use ($d, $audit) {
            $cycle = DB::table('assessment_cycles')->select('id', 'assessment_month')->where('id', $d['cycle_id'])->first();
            $keys = $d['keys'] ?? $this->tasks->keys($ctx, $cycle);
            if (isset($d['keys']) && ! $this->tasks->contains($ctx, $cycle, $keys)) {
                throw new BusinessRule('NOTIFICATION_OUT_OF_SCOPE', 'Notifikasi di luar tugas akun.', 422);
            }
            $now = now();
            foreach (array_chunk($keys, 500) as $chunk) {
                DB::table('notification_reads')->upsert(array_map(fn ($key) => ['user_id' => $ctx->userId, 'cycle_id' => $cycle->id, 'notification_key' => $key, 'read_at' => $now], $chunk),
                    ['user_id', 'cycle_id', 'notification_key'], ['read_at']);
            }
            $result = ['read_count' => count($keys)];
            $audit->record($ctx, 'user', $ctx->userId, 'notifications.read', null, $result);

            return $result;
        }));
    }
}
