<?php

namespace App\Http\Controllers\SuperHc;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\OrganizationRequest;
use App\Models\AuditEvent;
use App\Services\IdentityAccess\MutationRunner;
use App\Services\Organization\OrganizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrganizationController extends Controller
{
    public function __construct(private OrganizationService $service, private MutationRunner $mutations) {}

    public function index(Request $r, string $resource)
    {
        abort_unless(in_array($resource, OrganizationService::RESOURCES), 404);
        $data = $r->validate(['search' => ['sometimes', 'string', 'max:160'], 'division_id' => ['sometimes', 'integer', 'min:1']]);
        $q = DB::table($resource);
        if ($resource === 'users') {
            $q->select('id', 'name', 'email', 'login_nip', 'role_key', 'is_active', 'last_login_at', 'created_at', 'updated_at');
        }
        if (isset($data['search'])) {
            $field = $resource === 'employees' ? 'full_name' : 'name';
            $q->where($field, 'like', '%'.$data['search'].'%');
        }
        if ($resource === 'units' && isset($data['division_id'])) {
            $q->where('division_id', $data['division_id']);
        }

        return response()->json($q->orderBy('id')->paginate(25));
    }

    public function show(Request $r, string $resource, int $id)
    {
        abort_unless(in_array($resource, OrganizationService::RESOURCES), 404);

        return response()->json(['data' => $this->service->safeRow($resource, $id)]);
    }

    public function store(OrganizationRequest $r, string $resource)
    {
        return $this->save($r, $resource, null);
    }

    public function update(OrganizationRequest $r, string $resource, int $id)
    {
        return $this->save($r, $resource, $id);
    }

    private function save(OrganizationRequest $r, string $resource, ?int $id)
    {
        $data = $r->validated();

        return response()->json($this->mutations->run($r, $data, $resource.':'.($id ?? 'new'),
            fn ($ctx) => abort_unless($ctx->role === 'super_hc', 403), fn ($ctx) => $this->service->save($ctx, $resource, $id, $data)));
    }

    public function destroy(OrganizationRequest $r, string $resource, int $id)
    {
        return response()->json($this->mutations->run($r, $r->validated(), $resource.':delete:'.$id,
            fn ($ctx) => abort_unless($ctx->role === 'super_hc', 403), fn ($ctx) => $this->service->destroy($ctx, $resource, $id)));
    }

    public function placementPreview(Request $r, int $employee)
    {
        return response()->json(['data' => $this->service->placementPreview($employee)]);
    }

    public function headPreview(Request $r, string $area, int $id)
    {
        return response()->json(['data' => $this->service->headPreview($area, $id)]);
    }

    public function place(OrganizationRequest $r, int $employee)
    {
        return $this->mutate($r, 'employee.place:'.$employee, fn ($ctx, $data) => $this->service->place($ctx, $employee, $data));
    }

    public function assignHead(OrganizationRequest $r, string $area, int $id)
    {
        return $this->mutate($r, 'head.assign:'.$area.':'.$id, fn ($ctx, $data) => $this->service->assignHead($ctx, $area, $id, $data));
    }

    public function grantHc(OrganizationRequest $r, int $user)
    {
        return $this->mutate($r, 'hc.grant:'.$user, fn ($ctx, $data) => $this->service->grantHc($ctx, $user, $data));
    }

    public function revoke(OrganizationRequest $r, int $assignment)
    {
        return $this->mutate($r, 'scope.revoke:'.$assignment, fn ($ctx, $data) => $this->service->revoke($ctx, $assignment, $data));
    }

    public function assignments(Request $r)
    {
        return response()->json(DB::table('scope_assignments')->orderBy('id')->paginate(25));
    }

    public function audit(Request $r)
    {
        $filters = $r->validate(['subject_type' => ['sometimes', 'string', 'max:64'], 'subject_id' => ['sometimes', 'integer', 'min:1']]);
        $q = AuditEvent::query();
        foreach ($filters as $field => $value) {
            $q->where($field, $value);
        }

        return response()->json($q->orderByDesc('id')->paginate(25));
    }

    private function mutate(OrganizationRequest $r, string $action, callable $fn)
    {
        $data = $r->validated();

        return response()->json($this->mutations->run($r, $data, $action, fn ($ctx) => abort_unless($ctx->role === 'super_hc', 403), fn ($ctx) => $fn($ctx, $data)));
    }

    public function activity(Request $r, int $activity)
    {
        abort_unless($r->attributes->get('access_context')->role === 'super_hc', 403);
        $event = AuditEvent::findOrFail($activity);

        return response()->json(['data' => [
            'id' => (string) $event->id,
            'before' => $event->before_data,
            'after' => $event->after_data,
        ]]);
    }
}
