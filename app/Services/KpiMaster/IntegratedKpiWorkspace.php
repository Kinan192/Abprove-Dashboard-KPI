<?php

namespace App\Services\KpiMaster;

use App\Exceptions\BusinessRule;
use App\Models\Assessment;
use App\Models\AssessmentCycle;
use App\Models\KpiTemplate;
use App\Queries\ScopedRecords;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\AccessContext;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class IntegratedKpiWorkspace
{
    public function __construct(private KpiFormula $formula, private KpiMasterService $master, private AuditWriter $audit) {}

    public function read(array $stored, AccessContext $context, ?string $selectedMonth = null, bool $includeAssessments = true): array
    {
        $selectedMonth = preg_match('/^\d{4}-(0[1-9]|1[0-2])$/D', $selectedMonth ?? '') ? $selectedMonth : now('Asia/Jakarta')->format('Y-m');
        $units = DB::table('units as u')->join('divisions as d', 'd.id', '=', 'u.division_id')->where('u.is_active', true)->where('d.is_active', true)->orderBy('u.id')->get(['u.*', 'd.name as division_name']);
        $people = [];
        $month = $selectedMonth.'-01';
        foreach ([false, true] as $heads) {
            foreach (app(ScopedRecords::class)->members($context, $heads, $month)->get() as $person) {
                $people[] = ['id' => ($heads ? 'head-' : 'staff-').$person->id, 'name' => $person->full_name, 'nip' => $person->nip, 'type' => $heads ? 'unit_head' : 'staff', 'unitId' => (string) $person->unit_id, 'divisionId' => (string) $person->division_id];
            }
        }
        $periods = collect($stored['periods'] ?? [])->keyBy('id');
        $usage = DB::table('assessments')->selectRaw("cycle_id, COUNT(*) as total, SUM(status = 'final') as finalized, SUM(status <> 'final') as pending")->groupBy('cycle_id')->get()->keyBy('cycle_id');
        $categories = DB::table('cycle_categories')->orderBy('sort_order')->get()->groupBy('cycle_id');
        foreach (AssessmentCycle::orderBy('assessment_month')->get() as $cycle) {
            $key = $cycle->assessment_month->format('Y-m');
            $ranges = ($categories[$cycle->id] ?? collect())->pluck('lower_bound', 'code');
            $date = fn ($value) => CarbonImmutable::parse($value)->setTimezone('Asia/Jakarta')->format('Y-m-d\TH:i');
            $periods[$key] = ['id' => $key, 'businessId' => $cycle->id, 'name' => $periods[$key]['name'] ?? 'Penilaian '.$cycle->assessment_month->locale('id')->isoFormat('MMMM YYYY'), 'status' => $cycle->status,
                'opens' => $date($cycle->opens_at), 'submission' => $date($cycle->submission_due_at), 'approval' => $date($cycle->approval_due_at), 'closes' => $date($cycle->closes_at),
                'categories' => ['sb' => (float) ($ranges['sb'] ?? $ranges['sangat_baik'] ?? 90), 'b' => (float) ($ranges['b'] ?? $ranges['baik'] ?? 80), 'c' => (float) ($ranges['c'] ?? $ranges['cukup'] ?? 70)], 'hasAssessments' => ($usage[$cycle->id]->total ?? 0) > 0, 'hasFinal' => ($usage[$cycle->id]->finalized ?? 0) > 0, 'hasPending' => ($usage[$cycle->id]->pending ?? 0) > 0];
        }
        if (! isset($stored['integrationVersion'])) {
            $periods = $periods->map(function ($period) {
                if (empty($period['businessId']) && $period['status'] === 'open') {
                    $period['status'] = 'planned';
                }

                return $period;
            });
        }
        $data = ['version' => 1, 'integrationVersion' => 1, 'selectedMonth' => $selectedMonth, 'legacyManaged' => $stored['legacyManaged'] ?? [], 'revision' => $stored['revision'] ?? 0, 'kpis' => $stored['kpis'] ?? [], 'assessments' => [], 'audit' => [],
            'units' => $units->map(fn ($u) => ['id' => (string) $u->id, 'name' => $u->name, 'divisionId' => (string) $u->division_id, 'divisionName' => $u->division_name])->all(), 'people' => $people, 'periods' => $periods->values()->all()];
        $this->importLegacy($data);
        $data['assessmentsLoaded'] = $includeAssessments;
        if ($includeAssessments) {
            $data['assessments'] = $this->assessments($data);
        } else {
            $data['usedKpiIds'] = DB::table('assessment_items as i')->join('assessments as a', 'a.id', '=', 'i.assessment_id')->join('assessment_cycles as c', 'c.id', '=', 'a.cycle_id')->where('c.assessment_month', $selectedMonth.'-01')->whereNotNull('i.definition_snapshot')->selectRaw("DISTINCT JSON_UNQUOTE(JSON_EXTRACT(i.definition_snapshot, '$.id')) as kpi_id")->pluck('kpi_id')->filter()->values()->all();
            foreach ($data['periods'] as &$period) {
                if ($period['id'] !== $selectedMonth || $period['status'] !== 'open' || ($period['hasPending'] ?? false)) {
                    continue;
                }
                $started = DB::table('assessments as a')->join('assessment_cycles as c', 'c.id', '=', 'a.cycle_id')->where('c.assessment_month', $selectedMonth.'-01')->get(['a.assessment_kind', 'a.employee_id', 'a.subject_user_id'])->mapWithKeys(fn ($a) => [($a->assessment_kind === 'member' ? 'staff-'.$a->employee_id : 'head-'.$a->subject_user_id) => true]);
                foreach ($data['people'] as $person) {
                    if (! isset($started[$person['id']]) && $this->definitions($data['kpis'], $selectedMonth, $person)) {
                        $period['hasPending'] = true;
                        break;
                    }
                }
            }
            unset($period);
        }

        return $data;
    }

    private function importLegacy(array &$data): void
    {
        $month = $data['selectedMonth'].'-01';
        $templates = KpiTemplate::whereNull('workspace_hash')->whereNotNull('sealed_at')->where('effective_from', '<=', $month)->where(fn ($q) => $q->whereNull('effective_until')->orWhere('effective_until', '>=', $month))->with('items')->orderBy('version')->get();
        foreach ($data['periods'] as $period) {
            if ($period['id'] !== $data['selectedMonth'] || AssessmentCycle::where('assessment_month', $period['id'].'-01')->where('workspace_managed', true)->exists()) {
                continue;
            }
            foreach ($data['units'] as $unit) {
                foreach (['staff' => 'unit', 'unit_head' => 'division'] as $role => $level) {
                    if (in_array($period['id'].'|'.$unit['id'].'|'.$role, $data['legacyManaged'], true)) {
                        continue;
                    }
                    $area = $level === 'unit' ? $unit['id'] : $unit['divisionId'];
                    $template = $templates->last(fn ($t) => $t->scope_level === $level && $t->scope_key == $area && substr($t->effective_from, 0, 7) <= $period['id'] && (! $t->effective_until || substr($t->effective_until, 0, 7) >= $period['id']));
                    if (! $template) {
                        continue;
                    }
                    $custom = collect($data['kpis'])->filter(fn ($k) => $k['periodId'] === $period['id'] && $k['unitId'] === $unit['id'] && $k['targetRole'] === $role);
                    $recipients = collect($data['people'])->filter(fn ($p) => $p['unitId'] === $unit['id'] && $p['type'] === $role)->filter(fn ($p) => ! $custom->contains(fn ($k) => ($k['assignmentMode'] ?? 'all') === 'all' || in_array($p['id'], $k['assigneeIds'] ?? [], true)))->pluck('id')->all();
                    if ($custom->isNotEmpty() && ! $recipients) {
                        continue;
                    }
                    foreach ($template->items as $item) {
                        $data['kpis'][] = ['id' => 'legacy-'.$period['id'].'-'.$unit['id'].'-'.$item->id, 'name' => $item->name, 'pillar' => $item->pillar, 'unitId' => $unit['id'], 'divisionId' => $unit['divisionId'], 'targetRole' => $role, 'periodId' => $period['id'],
                            'method' => 'manual', 'weight' => (float) $item->weight_percent, 'rubric' => 'Nilai sesuai bukti dan panduan indikator '.$item->name.'.', 'target' => is_numeric($item->target_text) ? $item->target_text : '', 'unit' => 'poin', 'direction' => 'higher', 'variables' => [], 'formula' => '', 'parentId' => '',
                            'active' => true, 'assignmentMode' => $custom->isEmpty() ? 'all' : 'selected', 'assigneeIds' => $recipients, 'policy' => ['min' => 10, 'max' => 100, 'rule' => 'target-normalized', 'zeroRule' => 'pending'], 'legacyItemId' => $item->id, 'legacyTemplateId' => $template->id];
                    }
                }
            }
        }
    }

    public function save(array $input, array $before, AccessContext $context): array
    {
        $normalize = function ($kpi) {
            foreach (['formula', 'parentId', 'target'] as $field) {
                $kpi[$field] ??= '';
            }
            $kpi['weight'] = is_numeric($kpi['weight'] ?? null) ? (float) $kpi['weight'] : ($kpi['weight'] ?? null);
            if (is_numeric($kpi['target'])) {
                $kpi['target'] = (float) $kpi['target'];
            }

            return $kpi;
        };
        $input['kpis'] = array_map($normalize, $input['kpis'] ?? []);
        $before['kpis'] = array_map($normalize, $before['kpis']);
        $this->validate($input, $before);
        $people = collect($before['people'])->keyBy('id');
        $legacyManaged = $before['legacyManaged'] ?? [];
        $group = fn ($k) => $k['periodId'].'|'.$k['unitId'].'|'.$k['targetRole'];
        foreach (collect($before['kpis'])->groupBy($group) as $key => $rows) {
            if ($rows->contains(fn ($k) => isset($k['legacyItemId'])) && $this->signature($rows->values()->all()) !== $this->signature(array_values(array_filter($input['kpis'], fn ($k) => $group($k) === $key)))) {
                $legacyManaged[] = $key;
            }
        }
        $legacyManaged = array_values(array_unique($legacyManaged));
        $periodIds = collect($input['periods'])->pluck('id');
        foreach (AssessmentCycle::whereIn('assessment_month', $periodIds->map(fn ($id) => $id.'-01'))->lockForUpdate()->get() as $cycle) {
            $period = collect($input['periods'])->firstWhere('id', $cycle->assessment_month->format('Y-m'));
            $previous = collect($before['periods'])->firstWhere('id', $period['id']);
            if ($this->periodSignature($previous) !== $this->periodSignature($period) && Assessment::where('cycle_id', $cycle->id)->exists()) {
                throw new BusinessRule('CYCLE_IN_USE', 'Jadwal dan kategori periode terpakai tidak dapat diubah. Gunakan periode berikutnya.', 422);
            }
        }
        foreach ($input['periods'] as $period) {
            $cycle = AssessmentCycle::where('assessment_month', $period['id'].'-01')->first();
            $previous = collect($before['periods'])->firstWhere('id', $period['id']);
            if (! $cycle || $this->periodSignature($previous) !== $this->periodSignature($period)) {
                $payload = $this->periodPayload($period);
                $payload['status'] = $cycle?->status === 'closed' ? 'closed' : 'planned';
                $saved = $this->master->cycle($context, $cycle?->id, $payload);
                if (! $cycle) {
                    DB::table('assessment_cycles')->where('id', $saved['id'])->update(['workspace_managed' => true]);
                }
            }
        }
        $publicationMonths = collect(array_merge($input['kpis'], $before['kpis']))->pluck('periodId')->unique();
        $publications = DB::table('kpi_workspace_publications')->whereIn('assessment_month', $publicationMonths->map(fn ($m) => $m.'-01'))->get()->keyBy(fn ($p) => substr($p->assessment_month, 0, 7).'|'.$p->person_key);
        $managedCycles = AssessmentCycle::where('workspace_managed', true)->pluck('assessment_month')->map(fn ($date) => substr($date, 0, 7))->all();
        foreach ($input['periods'] as $period) {
            if (! $publicationMonths->contains($period['id'])) {
                continue;
            }
            foreach ($people as $person) {
                $rows = $this->definitions($input['kpis'], $period['id'], $person);
                $old = $this->definitions($before['kpis'], $period['id'], $person);
                $publication = $publications[$period['id'].'|'.$person['id']] ?? null;
                if (! $rows && in_array($period['id'], $managedCycles, true)) {
                    if ($publication) {
                        DB::table('kpi_workspace_publications')->where('id', $publication->id)->delete();
                    }

                    continue;
                }
                $custom = collect($rows)->contains(fn ($k) => ! isset($k['legacyItemId']));
                if (! $publication && ! $custom && $this->signature($old) === $this->signature($rows)) {
                    continue;
                }
                $template = $rows && bccomp((string) collect($rows)->sum('weight'), '100', 4) === 0 ? $this->publish($rows, $person, $period['id'], $context) : null;
                DB::table('kpi_workspace_publications')->updateOrInsert(['assessment_month' => $period['id'].'-01', 'person_key' => $person['id']], ['template_id' => $template, 'updated_at' => now(), 'created_at' => $publication?->created_at ?? now()]);
            }
        }
        foreach ($input['periods'] as $period) {
            $cycle = AssessmentCycle::where('assessment_month', $period['id'].'-01')->firstOrFail();
            if ($cycle->status === $period['status']) {
                continue;
            }
            if ($period['status'] === 'closed') {
                if (Assessment::where('cycle_id', $cycle->id)->where('status', '<>', 'final')->exists()) {
                    throw new BusinessRule('CYCLE_IN_USE', 'Masih ada pengajuan yang belum Final.', 422);
                }
                $this->master->close($context, $cycle->id);
            } else {
                $this->master->cycle($context, $cycle->id, $this->periodPayload($period));
            }
        }
        foreach ($input['kpis'] as $kpi) {
            $old = collect($before['kpis'])->firstWhere('id', $kpi['id']);
            if ($old !== $kpi) {
                $this->audit->record($context, 'kpi_workspace', 0, 'template.applied', $old, $kpi);
            }
        }
        foreach ($before['kpis'] as $kpi) {
            if (! collect($input['kpis'])->contains('id', $kpi['id'])) {
                $this->audit->record($context, 'kpi_workspace', 0, 'template.deleted', $kpi, null);
            }
        }
        $stored = ['version' => 1, 'integrationVersion' => 1, 'legacyManaged' => $legacyManaged, 'revision' => ($before['revision'] ?? 0) + 1, 'kpis' => array_values(array_filter($input['kpis'], fn ($k) => ! isset($k['legacyItemId']) || in_array($group($k), $legacyManaged, true))), 'periods' => $input['periods']];
        $result = $this->read($stored, $context, $before['selectedMonth'], $before['assessmentsLoaded'] ?? true);
        $result['_stored'] = $stored;

        return $result;
    }

    private function validate(array $data, array $before): void
    {
        Validator::make($data, [
            'kpis' => ['present', 'array', 'max:10000'], 'kpis.*.id' => ['required', 'string', 'max:100', 'distinct'], 'kpis.*.name' => ['required', 'string', 'max:150'], 'kpis.*.pillar' => ['required', 'string', 'max:64'],
            'kpis.*.unitId' => ['required', Rule::in(array_column($before['units'], 'id'))], 'kpis.*.targetRole' => ['required', Rule::in(['staff', 'unit_head', 'division_head'])],
            'kpis.*.periodId' => ['required', Rule::in(array_column($data['periods'] ?? [], 'id'))], 'kpis.*.weight' => ['required', 'numeric', 'gt:0', 'lte:100', 'regex:/^\d{1,3}(?:\.\d{1,4})?$/D'],
            'kpis.*.method' => ['required', Rule::in(['manual', 'formula'])], 'kpis.*.active' => ['required', 'boolean'], 'kpis.*.assignmentMode' => ['required', Rule::in(['all', 'selected'])], 'kpis.*.assigneeIds' => ['present', 'array'],
            'periods' => ['required', 'array', 'min:1', 'max:120'], 'periods.*.id' => ['required', 'date_format:Y-m', 'distinct'], 'periods.*.name' => ['required', 'string', 'max:190'], 'periods.*.status' => ['required', Rule::in(['planned', 'open', 'closed'])],
        ])->validate();
        $people = collect($before['people'])->keyBy('id');
        foreach ($data['periods'] as $period) {
            $payload = $this->periodPayload($period);
            Validator::make($payload, ['opens_at' => ['required', 'date'], 'submission_due_at' => ['required', 'date', 'after:opens_at'], 'approval_due_at' => ['required', 'date', 'after_or_equal:submission_due_at'], 'closes_at' => ['required', 'date', 'after_or_equal:approval_due_at']])->validate();
            $c = $period['categories'] ?? [];
            if (! isset($c['sb'], $c['b'], $c['c']) || ! is_numeric($c['sb']) || ! is_numeric($c['b']) || ! is_numeric($c['c']) || ! ($c['sb'] <= 100 && $c['sb'] > $c['b'] && $c['b'] > $c['c'] && $c['c'] > 0)) {
                $this->invalid('Batas kategori tidak valid.');
            }
        }
        foreach ($data['kpis'] as $kpi) {
            if ($kpi['assignmentMode'] === 'selected' && ! $kpi['assigneeIds']) {
                $this->invalid('Pilih sekurangnya satu penerima KPI.');
            }
            foreach ($kpi['assigneeIds'] as $id) {
                $person = $people[$id] ?? null;
                if (! $person || $person['unitId'] !== $kpi['unitId'] || $person['type'] !== $kpi['targetRole']) {
                    $this->invalid('Penerima KPI harus sesuai unit dan jabatan.');
                }
            }
            $period = collect($data['periods'])->firstWhere('id', $kpi['periodId']);
            $previous = collect($before['kpis'])->firstWhere('id', $kpi['id']);
            if ($period['status'] === 'closed' && $previous !== $kpi) {
                $this->invalid('KPI periode tertutup hanya dapat dibaca.');
            }
            if ($kpi['method'] === 'manual') {
                if (! trim($kpi['rubric'] ?? '')) {
                    $this->invalid('Rubrik penilaian manual wajib diisi.');
                }

                continue;
            }
            Validator::make($kpi, ['formula' => ['required', 'string', 'max:1200'], 'variables' => ['required', 'array', 'min:1', 'max:26'], 'variables.*.key' => ['required', 'regex:/^[A-Z]$/D', 'distinct'], 'variables.*.label' => ['required', 'string', 'max:150'], 'variables.*.source' => ['required', Rule::in(['manual', 'fixed'])], 'target' => ['required', 'numeric', 'min:0'], 'direction' => ['required', Rule::in(['higher', 'lower'])], 'policy.min' => ['required', 'numeric', 'min:0', 'lt:policy.max'], 'policy.max' => ['required', 'numeric', 'max:100']])->validate();
            foreach ($kpi['variables'] as $variable) {
                if ($variable['source'] === 'fixed' && (! is_numeric($variable['value'] ?? null) || ! is_finite((float) $variable['value']))) {
                    $this->invalid('Angka tetap variabel tidak valid.');
                }
            }
            $tree = $this->formula->compile($kpi['formula']);
            if (array_diff($this->formula->variables($tree), array_column($kpi['variables'], 'key'))) {
                $this->invalid('Formula memakai variabel yang belum didefinisikan.');
            }
            if ($kpi['active'] && (($kpi['target'] == 0 && ($kpi['policy']['zeroRule'] ?? '') !== 'zero-pass') || ($kpi['target'] > 0 && ($kpi['policy']['rule'] ?? '') !== ($kpi['direction'] === 'lower' ? 'reverse-positive' : 'target-normalized')))) {
                $this->invalid('Aturan konversi KPI belum sesuai target dan polaritas.');
            }
            if ($kpi['parentId'] ?? null) {
                $parent = collect($data['kpis'])->firstWhere('id', $kpi['parentId']);
                $unit = collect($before['units'])->firstWhere('id', $kpi['unitId']);
                $parentUnit = $parent ? collect($before['units'])->firstWhere('id', $parent['unitId']) : null;
                if (! $parent || $parent['id'] === $kpi['id'] || $parent['periodId'] !== $kpi['periodId'] || $parent['targetRole'] !== 'unit_head' || $parentUnit['divisionId'] !== $unit['divisionId']) {
                    $this->invalid('KPI atasan harus dalam divisi dan periode yang sama.');
                }
            }
        }
    }

    private function definitions(array $kpis, string $month, array $person): array
    {
        return array_values(array_filter($kpis, fn ($k) => $k['periodId'] === $month && $k['unitId'] === $person['unitId'] && $k['targetRole'] === $person['type'] && $k['active'] && ($k['assignmentMode'] === 'all' || in_array($person['id'], $k['assigneeIds'], true))));
    }

    private function signature(array $rows): string
    {
        return hash('sha256', json_encode($rows, JSON_THROW_ON_ERROR));
    }

    private function publish(array $rows, array $person, string $month, AccessContext $context): int
    {
        if (count($rows) > 200) {
            $this->invalid('Maksimal 200 indikator per penerima dan periode.');
        }
        $level = $person['type'] === 'staff' ? 'unit' : 'division';
        $area = $person[$level === 'unit' ? 'unitId' : 'divisionId'];
        $hash = $this->signature([$level, $area, $month, $rows]);
        if ($id = KpiTemplate::where('workspace_hash', $hash)->value('id')) {
            return $id;
        }
        $scope = DB::table('kpi_scopes')->where('scope_level', $level)->where('scope_key', $area)->lockForUpdate()->first();
        if (! $scope) {
            $id = DB::table('kpi_scopes')->insertGetId(['scope_level' => $level, $level === 'unit' ? 'unit_id' : 'division_id' => $area, 'created_by' => $context->userId]);
            $scope = DB::table('kpi_scopes')->where('id', $id)->lockForUpdate()->first();
        }
        $id = DB::table('kpi_templates')->insertGetId(['scope_id' => $scope->id, 'scope_level' => $level, 'scope_key' => $area, 'name' => 'KPI / Goals '.$month, 'version' => $scope->next_version, 'effective_from' => $month.'-01', 'effective_until' => $month.'-01', 'expected_item_count' => count($rows), 'created_by' => $context->userId, 'workspace_hash' => $hash]);
        foreach ($rows as $index => $kpi) {
            DB::table('kpi_items')->insert(['template_id' => $id, 'sort_order' => $index + 1, 'pillar' => $kpi['pillar'], 'name' => $kpi['name'], 'numerator' => $kpi['variables'][0]['label'] ?? null, 'denominator' => $kpi['variables'][1]['label'] ?? null, 'measurement_formula' => $kpi['formula'] ?? '', 'target_text' => (string) ($kpi['target'] ?? ''), 'weight_percent' => $kpi['weight'], 'workspace_definition' => json_encode($kpi, JSON_THROW_ON_ERROR)]);
        }
        DB::table('kpi_templates')->where('id', $id)->update(['sealed_at' => now()]);
        DB::table('kpi_scopes')->where('id', $scope->id)->increment('next_version');

        return $id;
    }

    private function periodPayload(array $period): array
    {
        $c = $period['categories'] ?? [];
        $payload = ['assessment_month' => $period['id'].'-01', 'status' => $period['status'], 'categories' => []];
        foreach (['opens' => 'opens_at', 'submission' => 'submission_due_at', 'approval' => 'approval_due_at', 'closes' => 'closes_at'] as $key => $field) {
            try {
                $payload[$field] = CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $period[$key] ?? '', 'Asia/Jakarta')->toIso8601String();
            } catch (\Throwable) {
                $this->invalid('Tanggal dan jam periode tidak valid.');
            }
        }
        $bounds = [0, $c['c'] ?? 70, $c['b'] ?? 80, $c['sb'] ?? 90, null];
        foreach (['k' => 'Kurang', 'c' => 'Cukup', 'b' => 'Baik', 'sb' => 'Sangat Baik'] as $code => $label) {
            $index = count($payload['categories']);
            $payload['categories'][] = ['code' => $code, 'label' => $label, 'lower_bound' => $bounds[$index], 'upper_bound' => $bounds[$index + 1]];
        }

        return $payload;
    }

    private function periodSignature(?array $period): ?string
    {
        if (! $period) {
            return null;
        }
        $p = $this->periodPayload($period);
        unset($p['status']);

        return json_encode($p, JSON_THROW_ON_ERROR);
    }

    private function assessments(array $data): array
    {
        $result = [];
        $cycles = AssessmentCycle::all()->keyBy('id');
        foreach (Assessment::whereHas('cycle', fn ($q) => $q->where('assessment_month', $data['selectedMonth'].'-01'))->with('items')->get() as $assessment) {
            $month = $cycles[$assessment->cycle_id]->assessment_month->format('Y-m');
            $person = ($assessment->assessment_kind === 'member' ? 'staff-' : 'head-').($assessment->employee_id ?? $assessment->subject_user_id);
            $snapshot = [];
            $inputs = [];
            foreach ($assessment->items as $item) {
                $definition = $item->definition_snapshot ?? ['id' => 'business-item-'.$item->source_kpi_item_id, 'name' => $item->kpi_name_snapshot, 'pillar' => $item->pillar_snapshot, 'method' => 'manual', 'weight' => (float) $item->weight_percent_snapshot, 'target' => $item->target_snapshot, 'rubric' => '', 'periodId' => $month];
                $snapshot[] = $definition;
                $inputs[$definition['id']] = $item->measurement_inputs ?? ['value' => (float) $item->score];
            }
            $result[$month.'|'.$person] = ['id' => 'business-'.$assessment->id, 'dbId' => $assessment->id, 'periodId' => $month, 'personId' => $person, 'subjectType' => $assessment->assessment_kind === 'member' ? 'staff' : 'unit_head', 'unitId' => (string) $assessment->unit_id, 'divisionId' => (string) $assessment->division_id, 'status' => $assessment->status, 'snapshot' => $snapshot, 'inputs' => $inputs, 'positive' => $assessment->positive_finding ?? '', 'negative' => $assessment->negative_finding ?? '', 'finalTotal' => $assessment->status === 'final' ? (float) $assessment->total_score_raw : null, 'completedBy' => DB::table('users')->where('id', $assessment->finalized_by)->value('name'), 'history' => [], 'categorySnapshot' => collect($data['periods'])->firstWhere('id', $month)['categories'] ?? []];
        }
        foreach ($data['periods'] as $period) {
            if ($period['id'] !== $data['selectedMonth'] || $period['status'] !== 'open') {
                continue;
            }
            foreach ($data['people'] as $person) {
                $key = $period['id'].'|'.$person['id'];
                $rows = $this->definitions($data['kpis'], $period['id'], $person);
                if (isset($result[$key]) || ! $rows) {
                    continue;
                }
                $result[$key] = ['id' => 'pending-'.$key, 'periodId' => $period['id'], 'personId' => $person['id'], 'subjectType' => $person['type'], 'unitId' => $person['unitId'], 'divisionId' => $person['divisionId'], 'status' => 'not_started', 'snapshot' => $rows, 'inputs' => [], 'positive' => '', 'negative' => '', 'history' => [], 'categorySnapshot' => $period['categories']];
            }
        }

        return array_values($result);
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['data' => $message]);
    }
}
