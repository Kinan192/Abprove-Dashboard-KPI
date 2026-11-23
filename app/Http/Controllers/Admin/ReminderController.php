<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReminderRequest;
use App\Http\Requests\Admin\ReminderSettingsRequest;
use App\Models\AssessmentCycle;
use App\Models\ReminderEmail;
use App\Models\ReminderSetting;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\MutationRunner;
use App\Services\Notification\AutoReminderService;
use App\Services\Notification\ReminderService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReminderController extends Controller
{
    public function __construct(private ReminderService $reminders, private AutoReminderService $auto) {}

    public function cycles(): JsonResponse
    {
        return response()->json(['data' => AssessmentCycle::orderByDesc('assessment_month')
            ->get(['id', 'assessment_month', 'status', 'submission_due_at', 'approval_due_at'])
            ->map(fn ($c) => ['id' => $c->id, 'month' => $c->assessment_month->format('Y-m'), 'status' => $c->status])]);
    }

    public function preview(Request $r): JsonResponse
    {
        $data = $r->validate([
            'cycle_id' => ['required', 'integer', 'exists:assessment_cycles,id'],
            'target' => ['required', Rule::in(ReminderService::TARGETS)],
        ]);
        $cycle = AssessmentCycle::findOrFail($data['cycle_id']);

        return response()->json(['data' => $this->reminders->recipients($cycle, $data['target'])]);
    }

    public function store(ReminderRequest $r, MutationRunner $mutations): JsonResponse
    {
        $data = $r->validated();

        return response()->json($mutations->run($r, $data, 'reminder.email:'.$data['cycle_id'],
            fn ($ctx) => abort_unless($ctx->role === 'admin', 403),
            fn ($ctx) => $this->reminders->send($ctx, AssessmentCycle::findOrFail($data['cycle_id']), $data)));
    }

    public function settings(): JsonResponse
    {
        return response()->json(['data' => $this->settingsPayload()]);
    }

    public function updateSettings(ReminderSettingsRequest $r, MutationRunner $mutations, AuditWriter $audit): JsonResponse
    {
        $data = $r->validated();

        return response()->json($mutations->run($r, $data, 'reminder.auto',
            fn ($ctx) => abort_unless($ctx->role === 'admin', 403),
            function ($ctx) use ($data, $audit) {
                $setting = ReminderSetting::whereKey(1)->lockForUpdate()->firstOrFail();
                $before = $setting->summary();
                $offsets = array_map('intval', $data['offsets']);
                rsort($offsets);
                $setting->forceFill([
                    'enabled' => (bool) $data['enabled'], 'offsets' => $offsets, 'send_time' => $data['send_time'],
                    'targets' => array_values(array_intersect(array_keys(AutoReminderService::TARGETS), $data['targets'])),
                    'updated_by' => $ctx->userId,
                ])->save();
                $after = $setting->summary();
                if ($after !== $before) {
                    $roles = array_map(fn ($role) => ['kepala_unit' => 'Kepala Unit', 'kepala_divisi' => 'Kepala Divisi'][$role], $after['targets']);
                    $audit->record($ctx, 'reminder_setting', $setting->id, 'reminder.auto_updated', $before, $after,
                        ($after['enabled'] ? 'Aktif' : 'Nonaktif').' · H-'.implode(', H-', $after['offsets']).' · '.$after['send_time'].' WIB · '.implode(', ', $roles));
                }

                return $this->settingsPayload();
            }));
    }

    private function settingsPayload(): array
    {
        $setting = ReminderSetting::with('editor:id,name')->findOrFail(1);
        $last = ReminderEmail::whereNotNull('delivery_key')->max('created_at');
        $wib = fn ($at) => $at ? CarbonImmutable::parse($at, 'UTC')->setTimezone(AutoReminderService::ZONE)->format('Y-m-d H:i') : null;

        return $setting->summary() + [
            'last_sent_at' => $wib($last), 'upcoming' => $this->auto->upcoming(CarbonImmutable::now()),
            'updated_at' => $wib($setting->updated_at?->format('Y-m-d H:i:s')), 'updated_by' => $setting->editor?->name,
        ];
    }
}
