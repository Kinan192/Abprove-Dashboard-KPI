<?php

namespace App\Services\Admin;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Read-only, server-paginated access to audit, login and email logs. */
class LogService
{
    public const TYPES = ['audit', 'login', 'email'];

    /** First readable name in the audit snapshot, so list rows stay informative without loading before/after JSON. */
    private const SUMMARY = 'COALESCE('.
        "NULLIF(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(a.after_data, a.before_data), '$.full_name')), 'null'), ".
        "NULLIF(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(a.after_data, a.before_data), '$.employee_name_snapshot')), 'null'), ".
        "NULLIF(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(a.after_data, a.before_data), '$.name')), 'null'), ".
        "NULLIF(JSON_UNQUOTE(JSON_EXTRACT(COALESCE(a.after_data, a.before_data), '$.assessment_month')), 'null')) as summary";

    public function paginate(string $type, array $filters): LengthAwarePaginator
    {
        $perPage = $filters['per_page'] ?? 25;

        return match ($type) {
            'audit' => $this->audit($filters)->paginate($perPage),
            'login' => $this->logins($filters)->paginate($perPage),
            'email' => $this->emails($filters)->paginate($perPage),
        };
    }

    public function auditDetail(int $id): array
    {
        $event = DB::table('audit_events as a')->leftJoin('users as u', 'u.id', '=', 'a.actor_user_id')
            ->where('a.id', $id)->firstOrFail(['a.*', 'u.name as actor_name']);

        return [
            'id' => $event->id, 'action' => $event->action, 'actor_name' => $event->actor_name, 'actor_role' => $event->actor_role_key,
            'subject_type' => $event->subject_type, 'subject_id' => $event->subject_id, 'reason' => $event->reason,
            'recorded_at' => $event->recorded_at,
            'before' => $event->before_data ? json_decode($event->before_data, true) : null,
            'after' => $event->after_data ? json_decode($event->after_data, true) : null,
        ];
    }

    private function audit(array $f): Builder
    {
        return DB::table('audit_events as a')->leftJoin('users as u', 'u.id', '=', 'a.actor_user_id')
            ->when($f['search'] ?? null, fn ($q, $s) => $q->where(fn ($q) => $q->where('u.name', 'like', "%{$s}%")
                ->orWhere('a.action', 'like', "%{$s}%")->orWhere('a.reason', 'like', "%{$s}%")))
            ->when($f['role'] ?? null, fn ($q, $role) => $q->where('a.actor_role_key', $role))
            ->when($f['action'] ?? null, fn ($q, $action) => $q->where('a.action', 'like', $action.'%'))
            ->tap(fn ($q) => $this->period($q, 'a.recorded_at', $f))
            ->orderByDesc('a.id')
            ->select('a.id', 'a.action', 'a.subject_type', 'a.subject_id', 'a.reason', 'a.actor_role_key', 'a.recorded_at', 'u.name as actor_name', DB::raw(self::SUMMARY));
    }

    private function logins(array $f): Builder
    {
        return DB::table('login_events as l')->leftJoin('users as u', 'u.id', '=', 'l.user_id')
            ->when($f['search'] ?? null, fn ($q, $s) => $q->where(fn ($q) => $q->where('l.identifier', 'like', "%{$s}%")
                ->orWhere('u.name', 'like', "%{$s}%")->orWhere('l.ip_address', 'like', "%{$s}%")))
            ->when($f['event'] ?? null, fn ($q, $event) => $q->where('l.event', $event))
            ->when($f['role'] ?? null, fn ($q, $role) => $q->where('u.role_key', $role))
            ->tap(fn ($q) => $this->period($q, 'l.occurred_at', $f))
            ->orderByDesc('l.id')
            ->select('l.id', 'l.identifier', 'l.event', 'l.ip_address', 'l.user_agent', 'l.occurred_at', 'u.name as user_name', 'u.role_key');
    }

    private function emails(array $f): Builder
    {
        return DB::table('reminder_emails as m')->join('users as r', 'r.id', '=', 'm.recipient_user_id')
            ->join('users as s', 's.id', '=', 'm.sent_by')->join('assessment_cycles as c', 'c.id', '=', 'm.cycle_id')
            ->when($f['search'] ?? null, fn ($q, $s) => $q->where(fn ($q) => $q->where('r.name', 'like', "%{$s}%")
                ->orWhere('m.recipient_email', 'like', "%{$s}%")->orWhere('m.subject', 'like', "%{$s}%")))
            ->when($f['status'] ?? null, fn ($q, $status) => $q->where('m.status', $status))
            ->when($f['role'] ?? null, fn ($q, $role) => $q->where('m.recipient_role', $role))
            ->tap(fn ($q) => $this->period($q, 'm.created_at', $f))
            ->orderByDesc('m.id')
            ->select('m.id', 'm.batch_id', 'm.recipient_email', 'm.recipient_role', 'm.subject', 'm.status', 'm.error', 'm.created_at', 'm.sent_at',
                'r.name as recipient_name', 's.name as sender_name', 'c.assessment_month');
    }

    /** Dates arrive as Asia/Jakarta calendar days; stored timestamps are UTC. */
    private function period(Builder $q, string $column, array $f): void
    {
        if (! empty($f['from'])) {
            $q->where($column, '>=', Carbon::parse($f['from'], 'Asia/Jakarta')->startOfDay()->utc()->format('Y-m-d H:i:s.u'));
        }
        if (! empty($f['to'])) {
            $q->where($column, '<', Carbon::parse($f['to'], 'Asia/Jakarta')->addDay()->startOfDay()->utc()->format('Y-m-d H:i:s.u'));
        }
    }
}
