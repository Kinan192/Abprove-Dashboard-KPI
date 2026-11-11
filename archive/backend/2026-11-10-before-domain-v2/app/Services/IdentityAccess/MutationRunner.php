<?php

namespace App\Services\IdentityAccess;

use App\Exceptions\BusinessRule;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MutationRunner
{
    public function __construct(private ScopeResolver $scopes) {}

    public function run(Request $request, array $data, string $action, callable $authorize, callable $operation): array
    {
        $hash = hash('sha256', json_encode($this->canonical($data), JSON_THROW_ON_ERROR));

        try {
            return DB::transaction(function () use ($request, $data, $action, $hash, $authorize, $operation) {
                // Serializes retries from the same actor, including first use of a request UUID.
                $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
                $ctx = $this->scopes->resolve($user, true);
                $authorize($ctx);
                $old = DB::table('operation_requests')->where('request_id', $data['request_id'])->lockForUpdate()->first();
                if ($old) {
                    if ((int) $old->actor_user_id !== $ctx->userId || $old->action !== $action ||
                        $old->payload_hash !== $hash || $old->context_key !== $ctx->identity()) {
                        throw new BusinessRule('IDEMPOTENCY_CONFLICT', 'request_id sudah dipakai untuk operasi atau isi berbeda.');
                    }

                    return ['data' => json_decode($old->response_data, true, 512, JSON_THROW_ON_ERROR), 'replayed' => true];
                }
                $result = $operation($ctx);
                DB::table('operation_requests')->insert([
                    'request_id' => $data['request_id'], 'actor_user_id' => $ctx->userId, 'action' => $action,
                    'payload_hash' => $hash, 'context_key' => $ctx->identity(),
                    'response_data' => json_encode($result, JSON_THROW_ON_ERROR), 'created_at' => now()->format('Y-m-d H:i:s.u'),
                ]);

                return ['data' => $result, 'replayed' => false];
            }, 3);
        } catch (QueryException $e) {
            if (in_array((int) ($e->errorInfo[1] ?? 0), [1062, 1451, 1452, 3819, 1644])) {
                throw new BusinessRule('DATA_CONFLICT', 'Operasi bertentangan dengan data terbaru atau aturan integritas. Muat ulang dan periksa isian.');
            }
            throw $e;
        }
    }

    private function canonical(array $value): array
    {
        if (! array_is_list($value)) {
            ksort($value);
        }
        foreach ($value as &$v) {
            if (is_array($v)) {
                $v = $this->canonical($v);
            }
        }

        return $value;
    }
}
