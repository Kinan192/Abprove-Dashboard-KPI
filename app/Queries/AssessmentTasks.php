<?php

namespace App\Queries;

use App\Services\IdentityAccess\AccessContext;
use Illuminate\Database\Query\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Notification tasks and navigation counts of one cycle, computed in SQL. */
class AssessmentTasks
{
    public function __construct(private ScopedRecords $records) {}

    /** The cycle row the task queries work on (id and month); null when it does not exist. */
    public function cycle(int $id): ?object
    {
        return DB::table('assessment_cycles')->select('id', 'assessment_month')->where('id', $id)->first();
    }

    /** Page of tasks ordered returned, submitted, not started; read flags hydrated only for the page. */
    public function page(AccessContext $ctx, object $cycle, int $perPage, int $page = 1): LengthAwarePaginator
    {
        $paginator = $this->ordered($ctx, $cycle)->paginate($perPage, ['*'], 'page', $page);
        $paginator->setCollection($this->present($ctx, $cycle, $paginator->getCollection()));

        return $paginator;
    }

    /** Preview for the shell: first tasks, total and unread count. */
    public function summary(AccessContext $ctx, object $cycle, int $limit): array
    {
        $rows = $this->ordered($ctx, $cycle)->limit($limit)->get();
        $total = $rows->count() < $limit ? $rows->count() : DB::query()->fromSub($this->query($ctx, $cycle), 't')->count();

        return ['items' => $this->present($ctx, $cycle, $rows)->all(), 'total' => $total, 'unread' => $total - $this->readCount($ctx, $cycle)];
    }

    /** @return list<string> */
    public function keys(AccessContext $ctx, object $cycle): array
    {
        return DB::query()->fromSub($this->query($ctx, $cycle), 't')->pluck('notification_key')->all();
    }

    /** @param list<string> $keys */
    public function contains(AccessContext $ctx, object $cycle, array $keys): bool
    {
        return DB::query()->fromSub($this->query($ctx, $cycle), 't')->whereIn('notification_key', $keys)->count() === count($keys);
    }

    /** Navigation badges: KU nilai/pengajuan, KD persetujuan, Super HC rekap and pending extension requests. */
    public function navCounts(AccessContext $ctx, object $cycle): array
    {
        $statuses = $this->records->assessments($ctx)->toBase()->where('cycle_id', $cycle->id)
            ->when($ctx->role === 'kepala_divisi', fn ($q) => $q->where('assessment_kind', 'member'))
            ->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');

        return match ($ctx->role) {
            'kepala_unit' => [
                'nilai' => $this->notStarted($ctx, $cycle, false)->count() + (int) ($statuses['returned'] ?? 0),
                'pengajuan' => (int) ($statuses['returned'] ?? 0),
            ],
            'kepala_divisi' => ['persetujuan' => (int) ($statuses['submitted'] ?? 0)],
            default => ['rekap' => (int) ($statuses['final'] ?? 0),
                'perpanjangan' => DB::table('deadline_extensions')->where('cycle_id', $cycle->id)->where('status', 'pending')->count()],
        };
    }

    private function ordered(AccessContext $ctx, object $cycle): Builder
    {
        return DB::query()->fromSub($this->query($ctx, $cycle), 't')->orderBy('priority')->orderBy('name')->orderBy('notification_key');
    }

    /** Union of decisions waiting for this role and roster members without an assessment (NOT EXISTS). */
    private function query(AccessContext $ctx, object $cycle): Builder
    {
        $statuses = match ($ctx->role) {
            'kepala_unit' => ['returned'],
            'kepala_divisi' => ['submitted'],
            default => ['submitted', 'returned'],
        };
        $query = $this->records->assessments($ctx)->toBase()->where('cycle_id', $cycle->id)->whereIn('status', $statuses)
            ->selectRaw("CONCAT('assessment:', id, ':', lock_version, ':', status) as notification_key, id as assessment_id,
                CONCAT(IF(assessment_kind = 'member', 'EMP-', 'HEAD-'), IF(assessment_kind = 'member', employee_id, subject_user_id)) as person_id,
                employee_name_snapshot as name, status, assessment_kind as kind, IF(status = 'returned', 0, 1) as priority");
        $kinds = match ($ctx->role) {
            'kepala_unit' => [],
            'kepala_divisi' => [true],
            default => [false, true],
        };
        foreach ($kinds as $head) {
            $prefix = $head ? 'head' : 'member';
            $query->unionAll($this->notStarted($ctx, $cycle, $head)->select(
                DB::raw("CONCAT('$prefix:', e.id, ':', ".(int) $cycle->id.", ':not_started') as notification_key"),
                DB::raw('NULL as assessment_id'),
                DB::raw("CONCAT('".($head ? 'HEAD-' : 'EMP-')."', e.id) as person_id"),
                DB::raw(($head ? 'e.name' : 'e.full_name').' as name'),
                DB::raw("'not_started' as status"),
                DB::raw("'".($head ? 'unit_head' : 'member')."' as kind"),
                DB::raw('2 as priority'),
            ));
        }

        return $query;
    }

    private function notStarted(AccessContext $ctx, object $cycle, bool $head): Builder
    {
        $month = substr((string) $cycle->assessment_month, 0, 10);

        return $this->records->members($ctx, $head, $month)->whereNotExists(fn ($q) => $q->selectRaw('1')->from('assessments as a')
            ->whereColumn($head ? 'a.subject_user_id' : 'a.employee_id', 'e.id')->where('a.cycle_id', $cycle->id));
    }

    private function readCount(AccessContext $ctx, object $cycle): int
    {
        return DB::query()->fromSub($this->query($ctx, $cycle), 't')->whereIn('notification_key', $this->readKeys($ctx, $cycle))->count();
    }

    private function readKeys(AccessContext $ctx, object $cycle): Builder
    {
        return DB::table('notification_reads')->select('notification_key')->where('user_id', $ctx->userId)->where('cycle_id', $cycle->id);
    }

    private function present(AccessContext $ctx, object $cycle, Collection $rows): Collection
    {
        $read = $rows->isEmpty() ? collect() : $this->readKeys($ctx, $cycle)->whereIn('notification_key', $rows->pluck('notification_key'))->pluck('notification_key')->flip();

        return $rows->map(fn ($row) => ['key' => $row->notification_key, 'assessment_id' => $row->assessment_id === null ? null : (int) $row->assessment_id,
            'person_id' => $row->person_id, 'name' => $row->name, 'status' => $row->status, 'kind' => $row->kind, 'read' => $read->has($row->notification_key)])->values();
    }
}
