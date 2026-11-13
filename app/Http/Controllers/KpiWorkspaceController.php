<?php

namespace App\Http\Controllers;

use App\Support\KpiWorkspaceDocument;
use App\Services\KpiMaster\IntegratedKpiWorkspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class KpiWorkspaceController extends Controller
{
    private const SCOPE = 'hc';

    public function show(Request $request, KpiWorkspaceDocument $initial, IntegratedKpiWorkspace $workspace)
    {
        $context = $request->attributes->get('access_context');
        abort_unless($context->role === 'super_hc', 403);
        $document = $this->document($initial);

        return response()->json([
            'revision' => (int) $document->revision,
            'data' => $workspace->read(json_decode($document->data, true, 512, JSON_THROW_ON_ERROR), $context, $request->query('cycle'), $request->boolean('include_assessments', true)),
        ]);
    }

    public function update(Request $request, KpiWorkspaceDocument $initial, IntegratedKpiWorkspace $workspace)
    {
        $context = $request->attributes->get('access_context');
        abort_unless($context->role === 'super_hc', 403);
        $payload = $request->validate([
            'revision' => ['required', 'integer', 'min:0'],
            'data' => ['required', 'array'],
        ]);
        foreach (['version', 'kpis', 'periods'] as $key) {
            if (! array_key_exists($key, $payload['data'])) {
                throw ValidationException::withMessages(['data' => "Bagian {$key} wajib ada."]);
            }
        }
        $payload['data'] = array_intersect_key($payload['data'], array_flip(['version', 'kpis', 'periods']));
        $json = json_encode($payload['data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        if (strlen($json) > 8 * 1024 * 1024) {
            throw ValidationException::withMessages(['data' => 'Data KPI melebihi 8 MB.']);
        }

        return DB::transaction(function () use ($payload, $context, $workspace, $initial, $request) {
            $document = DB::table('kpi_workspace_documents')->where('scope_key', self::SCOPE)->lockForUpdate()->first();
            if (! $document) {
                DB::table('kpi_workspace_documents')->insert([
                    'scope_key' => self::SCOPE,
                    'revision' => 0,
                    'data' => json_encode($initial->initial(), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'updated_by' => $context->userId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $document = DB::table('kpi_workspace_documents')->where('scope_key', self::SCOPE)->first();
            }
            if ((int) $document->revision !== (int) $payload['revision']) {
                throw ValidationException::withMessages([
                    'revision' => 'Data KPI sudah berubah. Muat ulang halaman sebelum menyimpan.',
                ]);
            }
            $before = $workspace->read(json_decode($document->data, true, 512, JSON_THROW_ON_ERROR), $context, $request->query('cycle'), $request->boolean('include_assessments', true));
            $data = $workspace->save($payload['data'], $before, $context);
            $stored = $data['_stored'];
            unset($data['_stored']);
            $next = (int) $document->revision + 1;
            DB::table('kpi_workspace_documents')->where('id', $document->id)->update([
                'revision' => $next,
                'data' => json_encode($stored, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'updated_by' => $context->userId,
                'updated_at' => now(),
            ]);

            return response()->json(['revision' => $next, 'data' => $data]);
        });
    }

    private function document(KpiWorkspaceDocument $initial)
    {
        $document = DB::table('kpi_workspace_documents')->where('scope_key', self::SCOPE)->first();
        if ($document) {
            return $document;
        }
        try {
            DB::table('kpi_workspace_documents')->insert([
                'scope_key' => self::SCOPE,
                'revision' => 0,
                'data' => json_encode($initial->initial(), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable) {
            // Another request created the document first.
        }

        return DB::table('kpi_workspace_documents')->where('scope_key', self::SCOPE)->firstOrFail();
    }
}
