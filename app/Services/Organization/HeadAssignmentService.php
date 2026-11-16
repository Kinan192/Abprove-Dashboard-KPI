<?php

namespace App\Services\Organization;

use App\Exceptions\BusinessRule;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\AccessContext;
use Illuminate\Support\Facades\DB;

/**
 * Atomic head changes for units and divisions. Every operation is expressed as the next head per
 * affected area; current assignments are revoked before new ones are inserted in one transaction.
 */
class HeadAssignmentService
{
    public const OPERATIONS = ['replace', 'move', 'swap', 'release'];

    private const ACTIONS = [
        'assign' => 'head.assigned', 'replace' => 'head.replaced', 'move' => 'head.moved',
        'swap' => 'head.swapped', 'release' => 'head.released',
    ];

    private const INPUT_ERRORS = ['REPLACEMENT_REQUIRED', 'ROLE_MISMATCH', 'DUPLICATE_HEAD', 'NO_CHANGE'];

    public function __construct(private OrganizationRules $rules, private AuditWriter $audit) {}

    public function preview(array $data): array
    {
        $plan = $this->plan($data, false);

        return [
            'operation' => $data['operation'],
            'areas' => $plan['areas'],
            'released' => $plan['released'],
            'blockers' => $plan['blockers'],
            'eligible_accounts' => $this->eligible(OrganizationRules::AREAS[$data['area']]['role']),
        ];
    }

    public function reassign(AccessContext $ctx, array $data): array
    {
        abort_unless($ctx->role === 'super_hc', 403);
        $plan = $this->plan($data, true);
        if ($plan['blockers']) {
            $code = $plan['blockers'][0]['code'];
            throw new BusinessRule($code, implode("\n", array_column($plan['blockers'], 'message')), in_array($code, self::INPUT_ERRORS, true) ? 422 : 409);
        }
        ['column' => $column, 'role' => $role] = OrganizationRules::AREAS[$data['area']];
        $now = now()->format('Y-m-d H:i:s.u');
        foreach ($plan['changed'] as $id) {
            if ($old = $plan['current'][$id] ?? null) {
                DB::table('scope_assignments')->where('id', $old->id)->update(['revoked_at' => $now, 'revoked_by' => $ctx->userId]);
            }
        }
        $released = array_column($plan['released'], 'user_id');
        foreach ($plan['changed'] as $id) {
            $old = $plan['current'][$id] ?? null;
            $newId = DB::table('scope_assignments')->insertGetId([
                'user_id' => $plan['next'][$id], 'role_key' => $role, $column => $id,
                'assigned_at' => $now, 'assigned_by' => $ctx->userId, 'note' => $data['reason'],
            ]);
            $after = (array) DB::table('scope_assignments')->where('id', $newId)->first();
            $before = $old ? (array) DB::table('scope_assignments')->where('id', $old->id)->first() : null;
            $this->audit->record($ctx, $data['area'], $id, self::ACTIONS[$data['operation']], $before,
                $after + ['operation' => $data['operation'], 'released_user_ids' => $released], $data['reason']);
        }

        return ['operation' => $data['operation'], 'areas' => $plan['areas'], 'released' => $plan['released']];
    }

    /** First head of a new or reactivated area. */
    public function assignInitial(AccessContext $ctx, string $area, int $id, int $userId, string $reason): void
    {
        $this->reassign($ctx, [
            'operation' => 'assign', 'area' => $area, 'area_id' => $id, 'user_id' => $userId,
            'expected_assignment_id' => null, 'reason' => $reason,
        ]);
    }

    /** Assignment history of an area and of its current head, newest first. */
    public function history(string $area, int $id): array
    {
        $column = OrganizationRules::AREAS[$area]['column'];
        $rows = fn ($q) => $q->leftJoin('users as u', 'u.id', '=', 's.user_id')->leftJoin('users as by', 'by.id', '=', 's.assigned_by')
            ->leftJoin('units as un', 'un.id', '=', 's.unit_id')->leftJoin('divisions as dv', 'dv.id', '=', 's.division_id')
            ->orderByDesc('s.assigned_at')->orderByDesc('s.id')
            ->get(['s.id', 's.user_id', 's.role_key', 's.unit_id', 's.division_id', 's.assigned_at', 's.revoked_at', 's.note',
                'u.name as user_name', 'by.name as assigned_by_name', 'un.name as unit_name', 'dv.name as division_name'])
            ->map(fn ($s) => [
                'id' => $s->id, 'user_id' => $s->user_id, 'user_name' => $s->user_name, 'role_key' => $s->role_key,
                'area_name' => $s->unit_name ?? $s->division_name, 'note' => $s->note, 'assigned_by_name' => $s->assigned_by_name,
                'assigned_at' => $s->assigned_at.'Z', 'revoked_at' => $s->revoked_at ? $s->revoked_at.'Z' : null,
            ])->all();
        $area = $rows(DB::table('scope_assignments as s')->where("s.$column", $id));
        $current = collect($area)->firstWhere('revoked_at', null);

        return [
            'area' => $area,
            'head' => $current ? $rows(DB::table('scope_assignments as s')->where('s.user_id', $current['user_id'])) : [],
        ];
    }

    private function eligible(string $role): array
    {
        return DB::table('users as u')->where('u.role_key', $role)->where('u.is_active', true)
            ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('scope_assignments as s')->whereColumn('s.user_id', 'u.id')->whereNull('s.revoked_at'))
            ->orderBy('u.name')->get(['u.id', 'u.name', 'u.login_nip', 'u.email'])->all();
    }

    private function plan(array $d, bool $lock): array
    {
        $op = $d['operation'];
        ['column' => $column, 'role' => $role, 'label' => $label] = OrganizationRules::AREAS[$d['area']];
        $roleLabel = $role === 'kepala_unit' ? 'Kepala Unit' : 'Kepala Divisi';
        $source = (int) $d['area_id'];
        $target = isset($d['target_area_id']) ? (int) $d['target_area_id'] : null;
        $pair = in_array($op, ['move', 'swap'], true);
        if ($pair && ($target === null || $target === $source)) {
            throw new BusinessRule('SAME_AREA', "Pilih {$label} tujuan yang berbeda dari {$label} asal.", 422);
        }
        $ids = $pair ? [$source, $target] : [$source];
        $locked = fn ($q) => $lock ? $q->lockForUpdate() : $q;
        $areas = $locked(DB::table($d['area'])->whereIn('id', $ids))->get()->keyBy('id');
        if ($areas->count() !== count($ids)) {
            throw new BusinessRule('NOT_FOUND', "{$label} tidak ditemukan. Muat ulang halaman.", 404);
        }
        $divisions = $d['area'] === 'units' ? DB::table('divisions')->whereIn('id', $areas->pluck('division_id'))->get()->keyBy('id') : collect();
        $current = $locked(DB::table('scope_assignments')->whereIn($column, $ids)->where('role_key', $role)->whereNull('revoked_at'))->get()->keyBy($column);
        $headOf = fn (int $id) => isset($current[$id]) ? (int) $current[$id]->user_id : null;
        $userId = isset($d['user_id']) ? (int) $d['user_id'] : null;
        $next = match ($op) {
            'move' => [$source => $userId, $target => $headOf($source)],
            'swap' => [$source => $headOf($target), $target => $headOf($source)],
            default => [$source => $userId],
        };
        $name = fn (int $id) => "{$label} {$areas[$id]->name}";
        $blockers = [];
        $block = function (string $code, string $message) use (&$blockers) {
            $blockers[] = ['code' => $code, 'message' => $message];
        };

        $expected = [$source => 'expected_assignment_id'] + ($pair ? [$target => 'target_expected_assignment_id'] : []);
        foreach ($expected as $id => $key) {
            // Preview may omit the optimistic check; mutations always send it (validated as present).
            if (array_key_exists($key, $d) && (int) ($current[$id]->id ?? 0) !== (int) ($d[$key] ?? 0)) {
                $block('STALE_ASSIGNMENT', "Kepala {$name($id)} berubah sejak data dimuat. Muat ulang pratinjau.");
            }
        }
        foreach ($areas as $area) {
            if (! $area->is_active) {
                $block('MASTER_INACTIVE', "{$name($area->id)} tidak aktif.");
            }
            if ($d['area'] === 'units' && ! $divisions[$area->division_id]->is_active) {
                $block('MASTER_INACTIVE', "Divisi induk {$divisions[$area->division_id]->name} tidak aktif.");
            }
        }
        if ($pair && $headOf($source) === null) {
            $block('HEAD_MISSING', "{$name($source)} belum memiliki kepala untuk dipindahkan.");
        }
        if ($op === 'swap' && $headOf($target) === null) {
            $block('HEAD_MISSING', "{$name($target)} belum memiliki kepala untuk ditukar.");
        }
        if ($op !== 'swap' && $userId === null) {
            $block('REPLACEMENT_REQUIRED', "{$name($source)} wajib mendapat kepala pengganti dalam transaksi yang sama.");
        }

        $userIds = array_values(array_filter($next));
        $people = DB::table('users')->whereIn('id', array_merge($userIds, $current->pluck('user_id')->all()))->get()->keyBy('id');
        $elsewhere = $locked(DB::table('scope_assignments as s')->leftJoin('units as un', 'un.id', '=', 's.unit_id')->leftJoin('divisions as dv', 'dv.id', '=', 's.division_id')
            ->whereIn('s.user_id', $userIds)->whereNull('s.revoked_at')->whereNotIn('s.id', $current->pluck('id')))
            ->get(['s.user_id', 'un.name as unit_name', 'dv.name as division_name'])->keyBy('user_id');
        if (count($userIds) !== count(array_unique($userIds))) {
            $block('DUPLICATE_HEAD', 'Satu akun hanya boleh memimpin satu area.');
        }
        foreach ($userIds as $id) {
            $user = $people[$id] ?? null;
            if (! $user) {
                $block('NOT_FOUND', 'Akun kepala tidak ditemukan. Muat ulang pratinjau.');

                continue;
            }
            if (! $user->is_active) {
                $block('ACCOUNT_INACTIVE', "Akun {$user->name} nonaktif. Pilih akun lain atau minta Admin mengaktifkannya.");
            }
            if ($user->role_key !== $role) {
                $block('ROLE_MISMATCH', "Akun {$user->name} bukan akun {$roleLabel}.");
            }
            if ($other = $elsewhere[$id] ?? null) {
                $where = $other->unit_name ? "Unit {$other->unit_name}" : ($other->division_name ? "Divisi {$other->division_name}" : 'cakupan lain');
                $block('ACCOUNT_ASSIGNED', "Akun {$user->name} masih memimpin {$where}. Gunakan Pindah atau Tukar kepala.");
            }
        }

        $changed = array_keys(array_filter($next, fn ($user, $id) => $user !== null && $user !== $headOf($id), ARRAY_FILTER_USE_BOTH));
        if (! $changed && ! $blockers) {
            $block('NO_CHANGE', 'Kepala tidak berubah. Pilih akun atau area lain.');
        }
        $pending = $this->rules->pending(DB::table('assessments')->whereIn($column, $ids))
            ->groupBy($column)->selectRaw("$column as area_id, COUNT(*) as total")->pluck('total', 'area_id');
        $busy = array_filter($changed, fn ($id) => ($pending[$id] ?? 0) > 0);
        if ($busy) {
            $block('ACTIVE_ASSESSMENTS', implode('; ', array_map(fn ($id) => "{$pending[$id]} penilaian non-Final di {$name($id)}", $busy))
                .'. Selesaikan hingga Final sebelum mengganti kepala.');
        }

        return [
            'blockers' => $blockers, 'changed' => $changed, 'current' => $current, 'next' => $next,
            'released' => $current->reject(fn ($s) => in_array((int) $s->user_id, $userIds, true))
                ->map(fn ($s) => ['user_id' => (int) $s->user_id, 'name' => $people[$s->user_id]->name ?? '-'])->values()->all(),
            'areas' => array_map(fn ($id) => [
                'area' => $d['area'], 'id' => $id, 'name' => $areas[$id]->name,
                'division_name' => isset($areas[$id]->division_id) ? $divisions[$areas[$id]->division_id]->name : null,
                'current' => isset($current[$id]) ? [
                    'assignment_id' => $current[$id]->id, 'user_id' => (int) $current[$id]->user_id,
                    'name' => $people[$current[$id]->user_id]->name ?? '-', 'since' => $current[$id]->assigned_at.'Z',
                ] : null,
                'next' => $next[$id] ? ['user_id' => $next[$id], 'name' => $people[$next[$id]]->name ?? '-'] : null,
                'changed' => in_array($id, $changed, true),
                'pending_assessments' => (int) ($pending[$id] ?? 0),
            ], $ids),
        ];
    }
}
