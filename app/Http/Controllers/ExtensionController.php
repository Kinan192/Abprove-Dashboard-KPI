<?php

namespace App\Http\Controllers;

use App\Http\Requests\Assessment\ExtensionRequest;
use App\Http\Requests\RequestIdRequest;
use App\Services\Assessment\DeadlineExtensionService;
use App\Services\IdentityAccess\MutationRunner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Deadline extensions: requests by Kepala Unit / Kepala Divisi, decisions and direct grants by Super HC. */
class ExtensionController extends Controller
{
    public function __construct(private DeadlineExtensionService $extensions, private MutationRunner $mutations) {}

    public function overview(Request $r): JsonResponse
    {
        $ctx = $r->attributes->get('access_context');
        $month = (string) $r->query('cycle', now('Asia/Jakarta')->format('Y-m'));
        $cycle = DB::table('assessment_cycles')->where('assessment_month', $month.'-01')->value('id')
            ?? DB::table('assessment_cycles')->where('status', 'open')->orderByDesc('assessment_month')->value('id')
            ?? abort(404, 'Periode belum dibuat.');

        return response()->json(['data' => $this->extensions->overview($ctx, (int) $cycle)]);
    }

    public function store(ExtensionRequest $r): JsonResponse
    {
        $data = $r->validated();

        return $this->run($r, $data, 'extension.request:'.$data['cycle_id'],
            fn ($ctx) => $this->extensions->request($ctx, (int) $data['cycle_id'], $data['due'], $data['reason']));
    }

    public function cancel(RequestIdRequest $r, int $extension): JsonResponse
    {
        return $this->run($r, $r->validated(), 'extension.cancel:'.$extension, fn ($ctx) => $this->extensions->cancel($ctx, $extension));
    }

    public function approve(ExtensionRequest $r, int $extension): JsonResponse
    {
        $data = $r->validated();

        return $this->run($r, $data, 'extension.approve:'.$extension,
            fn ($ctx) => $this->extensions->approve($ctx, $extension, $data['due'], $data['approval_due'] ?? null, $data['note'] ?? null));
    }

    public function reject(ExtensionRequest $r, int $extension): JsonResponse
    {
        $data = $r->validated();

        return $this->run($r, $data, 'extension.reject:'.$extension, fn ($ctx) => $this->extensions->reject($ctx, $extension, $data['note']));
    }

    public function grant(ExtensionRequest $r): JsonResponse
    {
        $data = $r->validated();

        return $this->run($r, $data, 'extension.grant:'.$data['cycle_id'], fn ($ctx) => $this->extensions->grant($ctx, (int) $data['cycle_id'], $data['role'],
            isset($data['division_id']) ? (int) $data['division_id'] : null, isset($data['unit_id']) ? (int) $data['unit_id'] : null,
            $data['due'], $data['approval_due'] ?? null, $data['note'] ?? null));
    }

    private function run(Request $r, array $data, string $action, callable $operation): JsonResponse
    {
        return response()->json($this->mutations->run($r, $data, $action, fn () => null, $operation));
    }
}
