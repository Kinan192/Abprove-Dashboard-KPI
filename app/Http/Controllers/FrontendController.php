<?php

namespace App\Http\Controllers;

use App\Queries\ScopedRecords;
use App\Services\IdentityAccess\ScopeResolver;
use App\Support\DomainSchema;
use App\Support\FrontendPages;
use App\ViewModels\AbproveDesign;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class FrontendController extends Controller
{
    public function landing(Request $r, ScopeResolver $scopes)
    {
        if ($r->expectsJson()) {
            return response()->json(['application' => 'KPI Kinerja', 'phase' => 'frontend', 'login' => '/login']);
        }

        return redirect(Auth::check() ? $scopes->resolve($r->user())->home() : '/login');
    }

    public function show(Request $r)
    {
        $ctx = $r->attributes->get('access_context');
        $page = FrontendPages::page($r->path());
        if ($page === 'placement' && $ctx->role === 'super_hc') {
            return redirect('/hc/kpi-templates');
        }
        $views = ['dashboard', 'score', 'heads', 'approvals', 'submissions', 'history', 'analytics', 'kpis', 'members', 'team', 'detail', 'recap', 'templates', 'template-editor', 'settings', 'organization', 'users', 'employees', 'positions', 'audit', 'help', 'notifications', 'import', 'profile', 'placement', 'divisions', 'units'];
        abort_unless(in_array($page, $views), 404);
        if ($page === 'detail') {
            app(ScopedRecords::class)->assessments($ctx)->whereKey((int) $r->route('assessment'))->firstOrFail();
        }
        $view = match ($page) {
            'dashboard' => 'dashboard','score' => 'nilai','heads' => 'nilai-kepala','approvals' => 'persetujuan','submissions','detail' => 'pengajuan',
            'history' => 'riwayat','analytics' => 'dashboard','kpis','templates','template-editor' => 'kpi','members','team' => 'tim','recap' => 'rekap',
            'settings' => 'pengaturan','organization','divisions','units' => 'struktur','users' => 'akun','employees' => 'karyawan','positions' => 'jabatan',
            'audit' => 'aktivitas','help' => 'panduan','notifications' => 'notifikasi','import' => 'impor','profile' => 'profil','placement' => 'penempatan',
        };
        if ($ctx->role === 'super_hc' && $view === 'pengajuan') {
            $view = 'rekap';
        }
        $role = ['kepala_unit' => 'ku', 'kepala_divisi' => 'kd', 'super_hc' => 'hc'][$ctx->role];
        $vm = new AbproveDesign($role, $view, false, $r);
        $homeHeadline = null;
        if ($view === 'dashboard' && in_array($ctx->role, ['super_hc', 'kepala_divisi'], true) && DomainSchema::ready()) {
            $cycles = DB::table('assessment_cycles')->select('id', 'assessment_month')->orderBy('assessment_month')->get();
            $month = $r->query('cycle', now('Asia/Jakarta')->format('Y-m'));
            $cycle = $cycles->firstWhere('assessment_month', $month.'-01') ?? $cycles->last();
            $count = $cycle ? app(ScopedRecords::class)->assessments($ctx)->where('cycle_id', $cycle->id)
                ->where('status', $ctx->role === 'super_hc' ? 'final' : 'submitted')->count() : 0;
            $homeHeadline = $ctx->role === 'super_hc'
                ? $count.' penilaian sudah Final oleh Kepala Divisi.'
                : $count.' penilaian menunggu persetujuan Anda.';
        }

        return response()->view($vm->view(), compact('vm', 'homeHeadline'))
            ->header('Content-Type', 'text/html; charset=utf-8');
    }
}
