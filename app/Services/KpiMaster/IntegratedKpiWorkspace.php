<?php

namespace App\Services\KpiMaster;

use App\Exceptions\BusinessRule;
use App\Models\Assessment;
use App\Models\AssessmentCycle;
use App\Models\KpiTemplate;
use App\Queries\ScopedRecords;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\AccessContext;
use App\Support\KpiWorkspaceDocument;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * KPI workspace of Super HC: named KPI patterns per period, one pattern per person per period.
 * Pattern + assignment are resolved per person into sealed KPI templates (kpi_workspace_publications),
 * so assessment forms and snapshots keep using the template pipeline.
 */
class IntegratedKpiWorkspace
{
    /** Pattern target role => KPI template scope level. */
    private const LEVELS = ['staff' => 'unit', 'unit_head' => 'division'];

    private const MAX_ITEMS = 200;

    /** @var array<string, array<string, array>> people per month keyed by person id */
    private array $members = [];

    public function __construct(
        private KpiFormula $formula,
        private KpiMasterService $master,
        private AuditWriter $audit,
        private ScopedRecords $records,
        private KpiWorkspaceDocument $documents,
    ) {}

    public function show(AccessContext $context, ?string $month, bool $includeAssessments): array
    {
        $document = $this->documents->load();

        return ['revision' => $document['revision'], 'data' => $this->read($document['data'], $context, $month, $includeAssessments)];
    }

    public function save(AccessContext $context, int $revision, array $input): array
    {
        $document = $this->documents->load(true);
        if ($document['revision'] !== $revision) {
            throw ValidationException::withMessages(['revision' => 'Data KPI sudah berubah. Muat ulang halaman sebelum menyimpan.']);
        }
        $before = $this->normalize($document['data']);
        $before['periods'] = $this->periods($before['periods']);
        $input = $this->normalize($input);
        $this->validate($input, $before);
        $this->syncCycles($input['periods'], $before['periods'], $context);
        $input['patternAssignments'] = $this->publish($input, $before, $context);
        $this->syncStatuses($input['periods'], $context);
        $this->record($input, $before, $context);
        $stored = ['version' => 2, 'periods' => $input['periods'], 'patterns' => $input['patterns'], 'patternAssignments' => $input['patternAssignments']];

        return ['revision' => $this->documents->write($document['id'], $document['revision'] + 1, $stored, $context->userId)];
    }

    private function read(array $stored, AccessContext $context, ?string $month, bool $includeAssessments): array
    {
        $month = preg_match('/^\d{4}-(0[1-9]|1[0-2])$/D', $month ?? '') ? $month : now('Asia/Jakarta')->format('Y-m');
        $document = $this->normalize($stored);
        $periods = $this->periods($document['periods']);
        $index = $this->assignmentIndex($document['patternAssignments']);
        $complete = [];
        foreach ($document['patterns'] as $pattern) {
            $complete[$pattern['id']] = bccomp($this->total($pattern['items']), '100', 4) === 0;
        }
        foreach ($periods as &$period) {
            if ($period['status'] !== 'closed') {
                $period['readiness'] = $this->readiness($this->members($context, $period['id']), $index[$period['id']] ?? [], $complete);
            }
        }
        unset($period);
        $people = array_values($this->members($context, $month));
        $positions = [];
        foreach ($people as $person) {
            if ($person['type'] === 'staff') {
                $positions[$person['positionId']] = ['id' => $person['positionId'], 'name' => $person['positionName']];
            }
        }
        usort($positions, fn ($a, $b) => strcasecmp($a['name'], $b['name']));
        $units = DB::table('units as u')->join('divisions as d', 'd.id', '=', 'u.division_id')->where('u.is_active', true)->where('d.is_active', true)->orderBy('d.name')->orderBy('u.name')->get(['u.id', 'u.name', 'u.division_id', 'd.name as division_name']);
        $divisionHeads = DB::table('scope_assignments as s')->join('users as u', 'u.id', '=', 's.user_id')->where('s.role_key', 'kepala_divisi')->whereColumn('u.role_key', 's.role_key')
            ->whereNull('s.revoked_at')->where('u.is_active', true)->pluck('u.name', 's.division_id');
        $data = [
            'version' => 2,
            'selectedMonth' => $month,
            'periods' => $periods,
            'patterns' => $document['patterns'],
            'patternAssignments' => $document['patternAssignments'],
            'units' => $units->map(fn ($u) => ['id' => (string) $u->id, 'name' => $u->name, 'divisionId' => (string) $u->division_id, 'divisionName' => $u->division_name, 'divisionHeadName' => $divisionHeads[$u->division_id] ?? ''])->all(),
            'positions' => $positions,
            'people' => $people,
            'legacyTemplates' => $this->legacyTemplates($month, $people, $document['patterns'], $periods),
            'assessmentsLoaded' => $includeAssessments,
            'assessments' => [],
        ];
        if ($includeAssessments) {
            $data['assessments'] = $this->assessments($data, $index[$month] ?? []);
        }

        return $data;
    }

    /** Stored periods merged with the authoritative assessment cycles. */
    private function periods(array $stored): array
    {
        $periods = collect($stored)->keyBy('id');
        $usage = DB::table('assessments')->selectRaw("cycle_id, COUNT(*) as total, SUM(status = 'final') as finalized, SUM(status <> 'final') as pending")->groupBy('cycle_id')->get()->keyBy('cycle_id');
        $categories = DB::table('cycle_categories')->orderBy('sort_order')->get()->groupBy('cycle_id');
        $date = fn ($value) => CarbonImmutable::parse($value)->setTimezone('Asia/Jakarta')->format('Y-m-d\TH:i');
        foreach (AssessmentCycle::orderBy('assessment_month')->get() as $cycle) {
            $key = $cycle->assessment_month->format('Y-m');
            $ranges = ($categories[$cycle->id] ?? collect())->pluck('lower_bound', 'code');
            $use = $usage[$cycle->id] ?? null;
            $periods[$key] = [
                'id' => $key, 'name' => $periods[$key]['name'] ?? 'Penilaian '.$cycle->assessment_month->locale('id')->isoFormat('MMMM YYYY'), 'status' => $cycle->status,
                'opens' => $date($cycle->opens_at), 'submission' => $date($cycle->submission_due_at), 'approval' => $date($cycle->approval_due_at), 'closes' => $date($cycle->closes_at),
                'categories' => ['sb' => (float) ($ranges['sb'] ?? $ranges['sangat_baik'] ?? 90), 'b' => (float) ($ranges['b'] ?? $ranges['baik'] ?? 80), 'c' => (float) ($ranges['c'] ?? $ranges['cukup'] ?? 70)],
                'businessId' => $cycle->id, 'managed' => (bool) $cycle->workspace_managed,
                'hasAssessments' => ($use->total ?? 0) > 0, 'hasFinal' => ($use->finalized ?? 0) > 0, 'hasPending' => ($use->pending ?? 0) > 0,
            ];
        }

        return $periods->sortKeys()->values()->all();
    }

    /** People eligible in a month (staff placement and Kepala Unit assignment of that month). */
    private function members(AccessContext $context, string $month): array
    {
        if (! isset($this->members[$month])) {
            $people = [];
            foreach (['staff' => false, 'unit_head' => true] as $type => $heads) {
                foreach ($this->records->members($context, $heads, $month.'-01')->orderBy('full_name')->get() as $row) {
                    $id = ($heads ? 'head-' : 'staff-').$row->id;
                    $people[$id] ??= ['id' => $id, 'name' => $row->full_name, 'nip' => (string) $row->nip, 'type' => $type, 'unitId' => (string) $row->unit_id, 'divisionId' => (string) $row->division_id,
                        'positionId' => (string) ($row->position_id ?? ''), 'positionName' => (string) $row->position_name];
                }
            }
            $this->members[$month] = $people;
        }

        return $this->members[$month];
    }

    private function readiness(array $people, array $assigned, array $complete): array
    {
        $result = ['staff' => ['eligible' => 0, 'complete' => 0], 'unit_head' => ['eligible' => 0, 'complete' => 0]];
        foreach ($people as $person) {
            $result[$person['type']]['eligible']++;
            if ($complete[$assigned[$person['id']] ?? ''] ?? false) {
                $result[$person['type']]['complete']++;
            }
        }

        return $result;
    }

    /** Legacy unit/division templates (manual scores) of an unmanaged cycle that can be converted into patterns. */
    private function legacyTemplates(string $month, array $people, array $patterns, array $periods): array
    {
        $period = collect($periods)->firstWhere('id', $month);
        if (! $period || ! isset($period['businessId']) || $period['managed'] || $period['status'] === 'closed') {
            return [];
        }
        $converted = [];
        foreach ($patterns as $pattern) {
            if ($pattern['periodId'] === $month && isset($pattern['legacyTemplateId'])) {
                $converted[$pattern['legacyTemplateId']] = true;
            }
        }
        $date = $month.'-01';
        $templates = KpiTemplate::whereNull('workspace_hash')->whereNotNull('sealed_at')->where('effective_from', '<=', $date)
            ->where(fn ($q) => $q->whereNull('effective_until')->orWhere('effective_until', '>=', $date))
            ->with('items')->orderBy('version')->get()->groupBy(fn ($t) => $t->scope_level.'|'.$t->scope_key)->map->last();
        $names = ['unit' => DB::table('units')->pluck('name', 'id'), 'division' => DB::table('divisions')->pluck('name', 'id')];
        $result = [];
        foreach ($templates as $template) {
            if (isset($converted[$template->id])) {
                continue;
            }
            $role = $template->scope_level === 'unit' ? 'staff' : 'unit_head';
            $field = $role === 'staff' ? 'unitId' : 'divisionId';
            $ids = array_column(array_filter($people, fn ($p) => $p['type'] === $role && $p[$field] === (string) $template->scope_key), 'id');
            if ($ids) {
                $result[] = ['id' => $template->id, 'name' => $template->name, 'targetRole' => $role, 'areaName' => $names[$template->scope_level][$template->scope_key] ?? '', 'personIds' => $ids,
                    'items' => $template->items->map(fn ($i) => ['name' => $i->name, 'pillar' => $i->pillar, 'weight' => (float) $i->weight_percent])->values()->all()];
            }
        }

        return $result;
    }

    private function assessments(array $data, array $assigned): array
    {
        $month = $data['selectedMonth'];
        $rows = Assessment::whereHas('cycle', fn ($q) => $q->where('assessment_month', $month.'-01'))->with('items')->get();
        $finalizers = DB::table('users')->whereIn('id', $rows->pluck('finalized_by')->filter()->unique())->pluck('name', 'id');
        $period = collect($data['periods'])->firstWhere('id', $month);
        $categories = $period['categories'] ?? [];
        $result = [];
        foreach ($rows as $assessment) {
            $person = ($assessment->assessment_kind === 'member' ? 'staff-' : 'head-').($assessment->employee_id ?? $assessment->subject_user_id);
            $snapshot = [];
            $inputs = [];
            foreach ($assessment->items as $item) {
                $definition = $item->definition_snapshot ?? ['id' => 'business-item-'.$item->source_kpi_item_id, 'name' => $item->kpi_name_snapshot, 'pillar' => $item->pillar_snapshot, 'method' => 'manual', 'weight' => (float) $item->weight_percent_snapshot, 'target' => $item->target_snapshot, 'periodId' => $month];
                $snapshot[] = $definition;
                $inputs[$definition['id']] = $item->measurement_inputs ?? ['value' => (float) $item->score];
            }
            $result[$person] = ['id' => 'business-'.$assessment->id, 'dbId' => $assessment->id, 'periodId' => $month, 'personId' => $person, 'subjectType' => $assessment->assessment_kind === 'member' ? 'staff' : 'unit_head',
                'unitId' => (string) $assessment->unit_id, 'divisionId' => (string) $assessment->division_id, 'status' => $assessment->status, 'snapshot' => $snapshot, 'inputs' => $inputs,
                'positive' => $assessment->positive_finding ?? '', 'negative' => $assessment->negative_finding ?? '', 'finalTotal' => $assessment->status === 'final' ? (float) $assessment->total_score_raw : null,
                'completedBy' => $finalizers[$assessment->finalized_by] ?? null, 'categorySnapshot' => $categories];
        }
        if (($period['status'] ?? '') === 'open') {
            $patterns = array_column($data['patterns'], null, 'id');
            $resolved = [];
            foreach ($data['people'] as $person) {
                $pattern = $patterns[$assigned[$person['id']] ?? ''] ?? null;
                if (isset($result[$person['id']]) || ! $pattern || $pattern['targetRole'] !== $person['type']) {
                    continue;
                }
                $result[$person['id']] = ['id' => 'pending-'.$month.'|'.$person['id'], 'periodId' => $month, 'personId' => $person['id'], 'subjectType' => $person['type'], 'unitId' => $person['unitId'], 'divisionId' => $person['divisionId'],
                    'status' => 'not_started', 'snapshot' => $resolved[$pattern['id']] ??= $this->rows($pattern), 'inputs' => [], 'positive' => '', 'negative' => '', 'categorySnapshot' => $categories];
            }
        }

        return array_values($result);
    }

    private function validate(array $input, array $before): void
    {
        $periods = [];
        foreach ($input['periods'] as $period) {
            if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/D', $period['id']) || isset($periods[$period['id']])) {
                $this->invalid('Bulan periode tidak valid atau ganda.');
            }
            if ($period['name'] === '' || mb_strlen($period['name']) > 190) {
                $this->invalid('Nama periode wajib diisi, maksimal 190 karakter.');
            }
            if (! in_array($period['status'], ['planned', 'open', 'closed'], true)) {
                $this->invalid('Status periode tidak valid.');
            }
            Validator::make($this->periodPayload($period), ['opens_at' => ['required', 'date'], 'submission_due_at' => ['required', 'date', 'after:opens_at'], 'approval_due_at' => ['required', 'date', 'after_or_equal:submission_due_at'], 'closes_at' => ['required', 'date', 'after_or_equal:approval_due_at']])->validate();
            $c = $period['categories'];
            if ($c['sb'] === null || $c['b'] === null || $c['c'] === null || ! ($c['sb'] <= 100 && $c['sb'] > $c['b'] && $c['b'] > $c['c'] && $c['c'] > 0)) {
                $this->invalid('Batas kategori tidak valid.');
            }
            $periods[$period['id']] = $period;
        }
        $closed = [];
        foreach ($before['periods'] as $period) {
            if ($period['status'] === 'closed') {
                $closed[$period['id']] = true;
            }
        }
        $previous = array_column($before['patterns'], null, 'id');
        $patterns = [];
        $names = [];
        foreach ($input['patterns'] as $pattern) {
            $label = 'Pola “'.($pattern['name'] ?: 'tanpa nama').'”';
            if (! preg_match('/^[A-Za-z0-9_-]{1,100}$/D', $pattern['id']) || isset($patterns[$pattern['id']])) {
                $this->invalid("{$label}: ID pola tidak valid atau ganda.");
            }
            if (! isset($periods[$pattern['periodId']])) {
                $this->invalid("{$label}: periode pola tidak tersedia.");
            }
            $old = $previous[$pattern['id']] ?? null;
            if ($old && $old['periodId'] !== $pattern['periodId']) {
                $this->invalid("{$label} tidak dapat dipindah ke periode lain. Gunakan Salin pola.");
            }
            $changed = ! $old || $this->signature($old) !== $this->signature($pattern);
            if ($changed && isset($closed[$pattern['periodId']])) {
                $this->invalid("{$label}: periode yang ditutup hanya dapat dibaca.");
            }
            if ($pattern['name'] === '' || mb_strlen($pattern['name']) > 120) {
                $this->invalid('Nama pola wajib diisi, maksimal 120 karakter.');
            }
            $nameKey = $pattern['periodId'].'|'.mb_strtolower($pattern['name']);
            if (isset($names[$nameKey])) {
                $this->invalid("{$label} sudah ada pada periode yang sama. Gunakan nama lain.");
            }
            $names[$nameKey] = true;
            if (! isset(self::LEVELS[$pattern['targetRole']])) {
                $this->invalid("{$label}: pilih jalur penerima Staf atau Kepala Unit.");
            }
            if (! $pattern['items'] || count($pattern['items']) > self::MAX_ITEMS) {
                $this->invalid("{$label}: isi 1 sampai ".self::MAX_ITEMS.' KPI.');
            }
            $patterns[$pattern['id']] = $pattern + ['changed' => $changed, 'label' => $label];
        }
        foreach ($previous as $id => $old) {
            if (! isset($patterns[$id]) && isset($closed[$old['periodId']])) {
                $this->invalid('Pola “'.$old['name'].'” pada periode yang ditutup tidak dapat dihapus.');
            }
        }
        $assigned = [];
        $used = [];
        foreach ($input['patternAssignments'] as $row) {
            $key = $row['periodId'].'|'.$row['personId'];
            if (isset($assigned[$key])) {
                $this->invalid('Satu orang hanya boleh memiliki satu pola per periode.');
            }
            $pattern = $patterns[$row['patternId']] ?? null;
            if (! $pattern || $pattern['periodId'] !== $row['periodId'] || $row['personId'] === '') {
                $this->invalid('Penugasan merujuk pola yang tidak tersedia pada periodenya.');
            }
            $assigned[$key] = $row['patternId'];
            $used[$row['patternId']] = true;
        }
        $previousAssigned = [];
        foreach ($before['patternAssignments'] as $row) {
            $previousAssigned[$row['periodId'].'|'.$row['personId']] = $row['patternId'];
        }
        foreach ($previousAssigned + $assigned as $key => $_) {
            if (isset($closed[strstr($key, '|', true)]) && ($previousAssigned[$key] ?? null) !== ($assigned[$key] ?? null)) {
                $this->invalid('Penugasan pola pada periode yang ditutup hanya dapat dibaca.');
            }
        }
        $usedBefore = array_flip(array_unique($previousAssigned));
        foreach ($patterns as $id => $pattern) {
            if (isset($closed[$pattern['periodId']])) {
                continue;
            }
            if ($pattern['changed'] || (isset($used[$id]) && ! isset($usedBefore[$id]))) {
                $this->validateItems($pattern['items'], $pattern['label']);
            }
            $total = $this->total($pattern['items']);
            if (isset($used[$id]) && bccomp($total, '100', 4) !== 0) {
                $this->invalid($pattern['label'].' sudah diterapkan sehingga total bobot wajib tepat 100% (saat ini '.rtrim(rtrim($total, '0'), '.').'%).');
            }
        }
    }

    private function validateItems(array $items, string $label): void
    {
        $ids = [];
        foreach ($items as $item) {
            $name = $label.', KPI “'.($item['name'] ?: 'tanpa nama').'”';
            if (! preg_match('/^[A-Za-z0-9_.-]{1,100}$/D', $item['id']) || isset($ids[$item['id']])) {
                $this->invalid("{$name}: ID KPI tidak valid atau ganda.");
            }
            $ids[$item['id']] = true;
            if ($item['name'] === '' || mb_strlen($item['name']) > 150) {
                $this->invalid("{$label}: nama KPI wajib diisi, maksimal 150 karakter.");
            }
            if ($item['pillar'] === '' || mb_strlen($item['pillar']) > 64) {
                $this->invalid("{$name}: pilar wajib diisi, maksimal 64 karakter.");
            }
            if ($item['method'] !== 'formula') {
                $this->invalid("{$name}: KPI harus dinilai otomatis dari formula.");
            }
            if ($item['weight'] === null || $item['weight'] <= 0 || $item['weight'] > 100) {
                $this->invalid("{$name}: bobot harus lebih dari 0 sampai 100% dengan maksimal 4 desimal.");
            }
            if ($item['unit'] === '' || mb_strlen($item['unit']) > 32) {
                $this->invalid("{$name}: pilih satuan pengukuran.");
            }
            if ($item['target'] === null || $item['target'] < 0) {
                $this->invalid("{$name}: target harus angka nol atau lebih.");
            }
            if (! in_array($item['direction'], ['higher', 'lower'], true)) {
                $this->invalid("{$name}: pilih polaritas.");
            }
            $policy = $item['policy'];
            if ($policy['min'] === null || $policy['max'] === null || $policy['min'] < 0 || $policy['max'] > 100 || $policy['min'] >= $policy['max']) {
                $this->invalid("{$name}: rentang skor otomatis harus 0 ≤ minimum < maksimum ≤ 100.");
            }
            if (($item['target'] == 0 && $policy['zeroRule'] !== 'zero-pass') || ($item['target'] > 0 && $policy['rule'] !== ($item['direction'] === 'lower' ? 'reverse-positive' : 'target-normalized'))) {
                $this->invalid("{$name}: aturan konversi belum sesuai target dan polaritas.");
            }
            $keys = [];
            if (! $item['variables'] || count($item['variables']) > 26) {
                $this->invalid("{$name}: isi 1 sampai 26 variabel.");
            }
            foreach ($item['variables'] as $variable) {
                if (! preg_match('/^[A-Z]$/D', $variable['key']) || isset($keys[$variable['key']]) || $variable['label'] === '' || mb_strlen($variable['label']) > 150 || ! in_array($variable['source'], ['manual', 'fixed'], true)) {
                    $this->invalid("{$name}: setiap variabel wajib berkode A–Z unik, bernama, dan bersumber jelas.");
                }
                if ($variable['source'] === 'fixed' && ($variable['value'] === null || ! is_finite($variable['value']))) {
                    $this->invalid("{$name}: angka tetap variabel {$variable['key']} tidak valid.");
                }
                $keys[$variable['key']] = true;
            }
            if ($item['formula'] === '' || mb_strlen($item['formula']) > 1200) {
                $this->invalid("{$name}: formula wajib diisi, maksimal 1200 karakter.");
            }
            try {
                $tree = $this->formula->compile($item['formula']);
            } catch (ValidationException $e) {
                $this->invalid("{$name}: ".collect($e->errors())->flatten()->first());
            }
            if (array_diff($this->formula->variables($tree), array_keys($keys))) {
                $this->invalid("{$name}: formula memakai variabel yang belum didefinisikan.");
            }
        }
    }

    private function syncCycles(array $periods, array $before, AccessContext $context): void
    {
        $previous = array_column($before, null, 'id');
        $cycles = AssessmentCycle::whereIn('assessment_month', array_map(fn ($p) => $p['id'].'-01', $periods))->lockForUpdate()->get()->keyBy(fn ($c) => $c->assessment_month->format('Y-m'));
        $used = DB::table('assessments')->whereIn('cycle_id', $cycles->pluck('id'))->distinct()->pluck('cycle_id')->flip();
        foreach ($periods as $period) {
            $cycle = $cycles[$period['id']] ?? null;
            if ($cycle && $this->periodSignature($previous[$period['id']] ?? null) === $this->periodSignature($period)) {
                continue;
            }
            if ($cycle && isset($used[$cycle->id])) {
                throw new BusinessRule('CYCLE_IN_USE', 'Jadwal dan kategori periode terpakai tidak dapat diubah. Gunakan periode berikutnya.', 422);
            }
            $payload = $this->periodPayload($period);
            $payload['status'] = $cycle?->status === 'closed' ? 'closed' : 'planned';
            $saved = $this->master->cycle($context, $cycle?->id, $payload);
            if (! $cycle) {
                DB::table('assessment_cycles')->where('id', $saved['id'])->update(['workspace_managed' => true]);
            }
        }
    }

    private function syncStatuses(array $periods, AccessContext $context): void
    {
        $cycles = AssessmentCycle::whereIn('assessment_month', array_map(fn ($p) => $p['id'].'-01', $periods))->get()->keyBy(fn ($c) => $c->assessment_month->format('Y-m'));
        foreach ($periods as $period) {
            $cycle = $cycles[$period['id']];
            if ($cycle->status === $period['status']) {
                continue;
            }
            if ($period['status'] === 'closed') {
                $this->master->close($context, $cycle->id);
            } else {
                $this->master->cycle($context, $cycle->id, $this->periodPayload($period));
            }
        }
    }

    /**
     * Resolves pattern assignments per eligible person of each non-closed period and synchronises publications.
     * Returns the assignments to store (assignments of people no longer eligible are pruned).
     */
    private function publish(array $input, array $before, AccessContext $context): array
    {
        $patterns = array_column($input['patterns'], null, 'id');
        $previous = $this->assignmentIndex($before['patternAssignments']);
        $current = $this->assignmentIndex($input['patternAssignments']);
        $closed = [];
        foreach ($before['periods'] as $period) {
            if ($period['status'] === 'closed') {
                $closed[$period['id']] = true;
            }
        }
        $kept = [];
        $plans = [];
        $delete = [];
        $resolved = [];
        $hashes = [];
        foreach ($input['periods'] as $period) {
            $month = $period['id'];
            $assigned = $current[$month] ?? [];
            if (isset($closed[$month])) {
                foreach ($assigned as $personId => $patternId) {
                    $kept[] = ['periodId' => $month, 'personId' => $personId, 'patternId' => $patternId];
                }

                continue;
            }
            $people = $this->members($context, $month);
            $assessed = $this->assessed($month);
            $old = $previous[$month] ?? [];
            foreach (array_keys($assigned + $old) as $personId) {
                if (isset($assessed[$personId]) && ($assigned[$personId] ?? null) !== ($old[$personId] ?? null)) {
                    throw new BusinessRule('PATTERN_IN_USE', ($people[$personId]['name'] ?? $personId).' sudah dinilai pada '.$this->label($month).'; polanya tidak dapat diganti atau dilepas.', 422);
                }
            }
            $valid = [];
            foreach ($assigned as $personId => $patternId) {
                $person = $people[$personId] ?? null;
                if (! $person || $person['type'] !== $patterns[$patternId]['targetRole']) {
                    if (($old[$personId] ?? null) !== $patternId) {
                        throw new BusinessRule('PATTERN_NOT_ELIGIBLE', ($person['name'] ?? $personId).' tidak memenuhi syarat pola “'.$patterns[$patternId]['name'].'” pada '.$this->label($month).'. Pola Staf hanya untuk staf, pola Kepala Unit hanya untuk Kepala Unit yang aktif pada bulan tersebut.', 422);
                    }

                    continue;
                }
                $valid[$personId] = $patternId;
                $kept[] = ['periodId' => $month, 'personId' => $personId, 'patternId' => $patternId];
            }
            $publications = DB::table('kpi_workspace_publications as p')->leftJoin('kpi_templates as t', 't.id', '=', 'p.template_id')
                ->where('p.assessment_month', $month.'-01')->get(['p.id', 'p.person_key', 't.workspace_hash'])->keyBy('person_key');
            foreach ($publications as $key => $publication) {
                if (! isset($people[$key]) && ! isset($assessed[$key])) {
                    $delete[] = $publication->id;
                }
            }
            foreach ($people as $personId => $person) {
                if (isset($assessed[$personId])) {
                    continue;
                }
                $publication = $publications[$personId] ?? null;
                $patternId = $valid[$personId] ?? null;
                if ($patternId === null) {
                    if ($publication) {
                        $delete[] = $publication->id;
                    }

                    continue;
                }
                $level = self::LEVELS[$person['type']];
                $area = $level === 'unit' ? $person['unitId'] : $person['divisionId'];
                $rows = $resolved[$patternId] ??= $this->rows($patterns[$patternId]);
                $hash = $hashes[$month.'|'.$patternId.'|'.$level.'|'.$area] ??= $this->signature([$level, $area, $month, $rows]);
                if ($publication?->workspace_hash !== $hash) {
                    $plans[] = ['month' => $month, 'person' => $personId, 'hash' => $hash, 'level' => $level, 'area' => $area, 'pattern' => $patternId];
                }
            }
        }
        $templates = $plans ? KpiTemplate::whereIn('workspace_hash', array_unique(array_column($plans, 'hash')))->pluck('id', 'workspace_hash')->all() : [];
        $now = now();
        $upserts = [];
        foreach ($plans as $plan) {
            $templates[$plan['hash']] ??= $this->template($resolved[$plan['pattern']], $patterns[$plan['pattern']]['name'], $plan, $context);
            $upserts[] = ['assessment_month' => $plan['month'].'-01', 'person_key' => $plan['person'], 'template_id' => $templates[$plan['hash']], 'created_at' => $now, 'updated_at' => $now];
        }
        foreach (array_chunk($delete, 1000) as $ids) {
            DB::table('kpi_workspace_publications')->whereIn('id', $ids)->delete();
        }
        foreach (array_chunk($upserts, 500) as $rows) {
            DB::table('kpi_workspace_publications')->upsert($rows, ['assessment_month', 'person_key'], ['template_id', 'updated_at']);
        }

        return $kept;
    }

    private function template(array $rows, string $name, array $plan, AccessContext $context): int
    {
        $level = $plan['level'];
        $area = $plan['area'];
        $scope = DB::table('kpi_scopes')->where('scope_level', $level)->where('scope_key', $area)->lockForUpdate()->first();
        if (! $scope) {
            $id = DB::table('kpi_scopes')->insertGetId(['scope_level' => $level, $level === 'unit' ? 'unit_id' : 'division_id' => $area, 'created_by' => $context->userId]);
            $scope = DB::table('kpi_scopes')->where('id', $id)->lockForUpdate()->first();
        }
        $id = DB::table('kpi_templates')->insertGetId(['scope_id' => $scope->id, 'scope_level' => $level, 'scope_key' => $area, 'name' => Str::limit($name, 170, '…').' · '.$plan['month'], 'version' => $scope->next_version,
            'effective_from' => $plan['month'].'-01', 'effective_until' => $plan['month'].'-01', 'expected_item_count' => count($rows), 'created_by' => $context->userId, 'workspace_hash' => $plan['hash']]);
        DB::table('kpi_items')->insert(array_map(fn ($kpi, $index) => ['template_id' => $id, 'sort_order' => $index + 1, 'pillar' => $kpi['pillar'], 'name' => $kpi['name'], 'numerator' => $kpi['variables'][0]['label'] ?? null,
            'denominator' => $kpi['variables'][1]['label'] ?? null, 'measurement_formula' => $kpi['formula'], 'target_text' => (string) $kpi['target'], 'weight_percent' => number_format($kpi['weight'], 4, '.', ''),
            'workspace_definition' => json_encode($kpi, JSON_THROW_ON_ERROR)], $rows, array_keys($rows)));
        DB::table('kpi_templates')->where('id', $id)->update(['sealed_at' => now()]);
        DB::table('kpi_scopes')->where('id', $scope->id)->increment('next_version');

        return $id;
    }

    /** Published KPI definitions of a pattern (same shape for every assigned person). */
    private function rows(array $pattern): array
    {
        return array_map(fn ($item) => $item + ['periodId' => $pattern['periodId'], 'targetRole' => $pattern['targetRole'], 'patternId' => $pattern['id'], 'patternName' => $pattern['name']], $pattern['items']);
    }

    private function assessed(string $month): array
    {
        return DB::table('assessments as a')->join('assessment_cycles as c', 'c.id', '=', 'a.cycle_id')->where('c.assessment_month', $month.'-01')
            ->get(['a.assessment_kind', 'a.employee_id', 'a.subject_user_id'])
            ->mapWithKeys(fn ($a) => [($a->assessment_kind === 'member' ? 'staff-'.$a->employee_id : 'head-'.$a->subject_user_id) => true])->all();
    }

    private function record(array $input, array $before, AccessContext $context): void
    {
        $old = array_column($before['patterns'], null, 'id');
        $new = array_column($input['patterns'], null, 'id');
        foreach ($new as $id => $pattern) {
            if (! isset($old[$id]) || $this->signature($old[$id]) !== $this->signature($pattern)) {
                $this->audit->record($context, 'kpi_pattern', 0, 'template.applied', $old[$id] ?? null, $pattern);
            }
        }
        foreach (array_diff_key($old, $new) as $pattern) {
            $this->audit->record($context, 'kpi_pattern', 0, 'template.deleted', $pattern, null);
        }
        $previous = $this->assignmentIndex($before['patternAssignments']);
        $current = $this->assignmentIndex($input['patternAssignments']);
        foreach (array_keys($previous + $current) as $month) {
            $from = $previous[$month] ?? [];
            $to = $current[$month] ?? [];
            $changed = array_keys(array_filter($from + $to, fn ($_, $person) => ($from[$person] ?? null) !== ($to[$person] ?? null), ARRAY_FILTER_USE_BOTH));
            if ($changed) {
                $keys = array_flip($changed);
                $this->audit->record($context, 'kpi_pattern_assignment', 0, 'template.applied', ['periodId' => $month, 'assignments' => array_intersect_key($from, $keys)],
                    ['name' => 'Penugasan pola KPI '.$this->label($month).' ('.count($changed).' orang)', 'periodId' => $month, 'assignments' => array_intersect_key($to, $keys)]);
            }
        }
    }

    /** @return array<string, array<string, string>> periodId => personId => patternId */
    private function assignmentIndex(array $assignments): array
    {
        $index = [];
        foreach ($assignments as $row) {
            $index[$row['periodId']][$row['personId']] = $row['patternId'];
        }

        return $index;
    }

    private function normalize(array $document): array
    {
        $list = fn ($value) => is_array($value) ? array_values(array_filter($value, 'is_array')) : [];

        return [
            'periods' => array_map(fn ($p) => $this->period($p), $list($document['periods'] ?? [])),
            'patterns' => array_map(fn ($p) => $this->pattern($p), $list($document['patterns'] ?? [])),
            'patternAssignments' => array_map(fn ($a) => ['periodId' => $this->text($a['periodId'] ?? ''), 'personId' => $this->text($a['personId'] ?? ''), 'patternId' => $this->text($a['patternId'] ?? '')], $list($document['patternAssignments'] ?? [])),
        ];
    }

    private function period(array $period): array
    {
        $c = is_array($period['categories'] ?? null) ? $period['categories'] : [];
        $result = ['categories' => ['sb' => $this->number($c['sb'] ?? null), 'b' => $this->number($c['b'] ?? null), 'c' => $this->number($c['c'] ?? null)]];
        foreach (['id', 'name', 'status', 'opens', 'submission', 'approval', 'closes'] as $key) {
            $result[$key] = $this->text($period[$key] ?? '');
        }

        return $result;
    }

    private function pattern(array $pattern): array
    {
        $result = ['id' => $this->text($pattern['id'] ?? ''), 'name' => $this->text($pattern['name'] ?? ''), 'periodId' => $this->text($pattern['periodId'] ?? ''), 'targetRole' => $this->text($pattern['targetRole'] ?? ''),
            'items' => array_map(fn ($item) => $this->item($item), is_array($pattern['items'] ?? null) ? array_values(array_filter($pattern['items'], 'is_array')) : [])];
        if (is_numeric($pattern['legacyTemplateId'] ?? null)) {
            $result['legacyTemplateId'] = (int) $pattern['legacyTemplateId'];
        }

        return $result;
    }

    private function item(array $item): array
    {
        $policy = is_array($item['policy'] ?? null) ? $item['policy'] : [];
        $weight = $item['weight'] ?? null;
        $variables = [];
        foreach (is_array($item['variables'] ?? null) ? $item['variables'] : [] as $variable) {
            $variable = is_array($variable) ? $variable : [];
            $row = ['key' => $this->text($variable['key'] ?? ''), 'label' => $this->text($variable['label'] ?? ''), 'source' => $this->text($variable['source'] ?? '')];
            if ($row['source'] === 'fixed') {
                $row['value'] = $this->number($variable['value'] ?? null);
            }
            $variables[] = $row;
        }

        return [
            'id' => $this->text($item['id'] ?? ''), 'name' => $this->text($item['name'] ?? ''), 'pillar' => $this->text($item['pillar'] ?? ''), 'method' => $this->text($item['method'] ?? ''),
            'weight' => is_numeric($weight) && preg_match('/^\d{1,3}(?:\.\d{1,4})?$/D', (string) $weight) ? (float) $weight : null,
            'variables' => $variables, 'formula' => $this->text($item['formula'] ?? ''), 'target' => $this->number($item['target'] ?? null),
            'unit' => $this->text($item['unit'] ?? ''), 'direction' => $this->text($item['direction'] ?? ''),
            'policy' => ['rule' => $this->text($policy['rule'] ?? ''), 'zeroRule' => $this->text($policy['zeroRule'] ?? ''), 'min' => $this->number($policy['min'] ?? null), 'max' => $this->number($policy['max'] ?? null)],
        ];
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string) $value) : '';
    }

    private function number(mixed $value): ?float
    {
        return is_numeric($value) && is_finite((float) $value) ? (float) $value : null;
    }

    private function total(array $items): string
    {
        $sum = '0';
        foreach ($items as $item) {
            $sum = bcadd($sum, number_format((float) $item['weight'], 4, '.', ''), 4);
        }

        return $sum;
    }

    private function signature(array $rows): string
    {
        return hash('sha256', json_encode($rows, JSON_THROW_ON_ERROR));
    }

    private function label(string $month): string
    {
        return CarbonImmutable::parse($month.'-01')->locale('id')->isoFormat('MMMM YYYY');
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

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['data' => $message]);
    }
}
