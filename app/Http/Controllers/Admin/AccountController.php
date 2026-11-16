<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AccountRequest;
use App\Services\Admin\AccountService;
use App\Services\IdentityAccess\MutationRunner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AccountController extends Controller
{
    public function __construct(private AccountService $accounts, private MutationRunner $mutations) {}

    public function index(Request $r): JsonResponse
    {
        $filters = $r->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:160'],
            'role' => ['sometimes', 'nullable', Rule::in(AccountService::ROLES)],
            'status' => ['sometimes', 'nullable', Rule::in(['active', 'inactive'])],
            'per_page' => ['sometimes', 'integer', 'between:10,100'],
        ]);

        return response()->json($this->accounts->paginate(array_filter($filters, fn ($v) => $v !== null && $v !== '')));
    }

    public function store(AccountRequest $r): JsonResponse
    {
        return $this->mutate($r, 'account:new', fn ($ctx, $data) => $this->accounts->save($ctx, null, $data));
    }

    public function update(AccountRequest $r, int $user): JsonResponse
    {
        return $this->mutate($r, 'account:'.$user, fn ($ctx, $data) => $this->accounts->save($ctx, $user, $data));
    }

    public function destroy(AccountRequest $r, int $user): JsonResponse
    {
        return $this->mutate($r, 'account:delete:'.$user, fn ($ctx) => $this->accounts->destroy($ctx, $user));
    }

    private function mutate(AccountRequest $r, string $action, callable $operation): JsonResponse
    {
        $data = $r->validated();

        return response()->json($this->mutations->run($r, $data, $action,
            fn ($ctx) => abort_unless($ctx->role === 'admin', 403),
            fn ($ctx) => $operation($ctx, $data)));
    }
}
