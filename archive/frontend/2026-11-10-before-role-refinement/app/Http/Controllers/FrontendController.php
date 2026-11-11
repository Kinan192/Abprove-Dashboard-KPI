<?php

namespace App\Http\Controllers;

use App\Queries\ScopedRecords;
use App\Services\IdentityAccess\ScopeResolver;
use App\Support\FrontendPages;
use App\ViewModels\AbproveDesign;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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
        $views = ['dashboard', 'score', 'heads', 'approvals', 'submissions', 'history', 'analytics', 'kpis', 'members', 'team', 'detail', 'recap', 'templates', 'template-editor', 'settings', 'organization', 'users', 'employees', 'positions', 'audit', 'help', 'notifications', 'import', 'profile', 'placement', 'divisions', 'units'];
        abort_unless(in_array($page, $views), 404);
        if ($page === 'detail') {
            app(ScopedRecords::class)->assessments($ctx)->whereKey((int) $r->route('assessment'))->firstOrFail();
        }
        $view = match ($page) {
            'dashboard' => 'beranda','score' => 'nilai','heads' => 'nilai-kepala','approvals' => 'persetujuan','submissions','detail' => 'pengajuan',
            'history' => 'riwayat','analytics' => 'dashboard','kpis','templates','template-editor' => 'kpi','members','team' => 'tim','recap' => 'rekap',
            'settings' => 'pengaturan','organization','divisions','units' => 'struktur','users' => 'akun','employees' => 'karyawan','positions' => 'jabatan',
            'audit' => 'aktivitas','help' => 'panduan','notifications' => 'notifikasi','import' => 'impor','profile' => 'profil','placement' => 'penempatan',
        };
        if ($ctx->role === 'super_hc' && $view === 'pengajuan') {
            $view = 'rekap';
        }
        $role = ['kepala_unit' => 'ku', 'kepala_divisi' => 'kd', 'super_hc' => 'hc'][$ctx->role];
        $vm = new AbproveDesign($role, $view, false, $r);

        return response()->view($vm->view(), compact('vm'));
    }
}
