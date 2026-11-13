<?php

namespace App\Http\Controllers;

use App\ViewModels\AbproveDesign;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class DesignReviewController extends Controller
{
    private function localOnly(): void
    {
        abort_unless(app()->environment(['local', 'testing']), 404);
    }

    public function index()
    {
        $this->localOnly();
        $screens = json_decode(File::get(resource_path('data/abprove-screens.json')), true, 512, JSON_THROW_ON_ERROR);
        $screens = collect($screens)->reject(fn ($screen) => $screen['view'] === 'beranda' && $screen['role'] !== 'ku')
            ->map(function ($screen) {
                if ($screen['view'] === 'beranda') {
                    $screen['id'] = 'ku-dashboard';
                    $screen['title'] = 'Dashboard';
                    $screen['view'] = 'dashboard';
                }

                return $screen;
            })->values()->all();

        return view('design-review.index', compact('screens'));
    }

    public function page(Request $request, string $role, string $page = 'dashboard')
    {
        $this->localOnly();
        if ($role === 'login') {
            return view('auth.login', ['review' => true, 'forgot' => $page === 'lupa']);
        }
        if ($page === 'beranda') {
            return redirect('/design-review/'.$role.'/dashboard'.($request->getQueryString() ? '?'.$request->getQueryString() : ''));
        }
        if ($role === 'hc' && $page === 'penempatan') {
            return redirect('/design-review/hc/kpi');
        }
        abort_unless(isset(AbproveDesign::VIEWS[$role]) && in_array($page, AbproveDesign::VIEWS[$role]), 404);
        $vm = new AbproveDesign($role, $page, true, $request);

        $goalPrototype = ($role === 'hc' && in_array($page, ['kpi', 'pengaturan'], true))
            || (in_array($request->query('redesign'), ['goals', 'kpi-sederhana'], true) && in_array($page, ['nilai', 'nilai-kepala', 'pengajuan', 'persetujuan', 'rekap'], true));
        if ($goalPrototype) {
            return view('design-review.kpi-periode', compact('vm'));
        }

        return view($vm->view(), compact('vm'));
    }

    public function forgot()
    {
        return view('auth.login', ['review' => false, 'forgot' => true]);
    }
}
