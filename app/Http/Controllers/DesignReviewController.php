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

        return view('design-review.index', compact('screens'));
    }

    public function page(Request $request, string $role, string $page = 'beranda')
    {
        $this->localOnly();
        if ($role === 'login') {
            return view('auth.login', ['review' => true, 'forgot' => $page === 'lupa']);
        }
        if ($role === 'hc' && $page === 'penempatan') {
            return redirect('/design-review/hc/kpi');
        }
        abort_unless(isset(AbproveDesign::VIEWS[$role]) && in_array($page, AbproveDesign::VIEWS[$role]), 404);
        $vm = new AbproveDesign($role, $page, true, $request);

        return view($vm->view(), compact('vm'));
    }

    public function forgot()
    {
        return view('auth.login', ['review' => false, 'forgot' => true]);
    }
}
