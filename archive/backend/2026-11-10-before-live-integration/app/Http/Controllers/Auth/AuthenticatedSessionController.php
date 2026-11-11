<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\ScopeResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthenticatedSessionController extends Controller
{
    public function create(Request $r)
    {
        if (! $r->expectsJson()) {
            if ($r->user()) {
                return redirect(app(ScopeResolver::class)->resolve($r->user())->home());
            }

            return view('auth.login');
        }

        return response()->json(['csrf_token' => $r->session()->token(), 'login_url' => '/login']);
    }

    public function store(LoginRequest $r, ScopeResolver $scopes, AuditWriter $audit)
    {
        $id = trim($r->validated('identifier'));
        $matches = User::where('email', $id)->orWhere('login_nip', $id)->limit(2)->get();
        $user = $matches->count() === 1 ? $matches->first() : null;
        $hash = $user?->password ?? '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
        if (! Hash::check($r->validated('password'), $hash) || ! $user || ! $user->is_active) {
            throw ValidationException::withMessages(['identifier' => 'Identitas atau kata sandi tidak sesuai.']);
        }
        $ctx = DB::transaction(function () use ($user, $scopes, $audit) {
            $fresh = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            if (! hash_equals($fresh->password, $user->password)) {
                throw ValidationException::withMessages(['identifier' => 'Identitas atau kata sandi berubah. Silakan login ulang.']);
            }
            $ctx = $scopes->resolve($fresh, true);
            $fresh->last_login_at = now();
            $fresh->save();
            $audit->record($ctx, 'user', $fresh->id, 'login', null, ['id' => $fresh->id]);

            return $ctx;
        });
        Auth::login($user, false);
        $r->session()->regenerate();
        $r->session()->put('last_activity_at', now()->timestamp);
        if (! $r->expectsJson()) {
            return redirect($ctx->home());
        }

        return response()->json(['data' => ['user' => $user->fresh(), 'role' => $ctx->role, 'home' => $ctx->home(), 'csrf_token' => $r->session()->token()]]);
    }

    public function show(Request $r)
    {
        $ctx = $r->attributes->get('access_context');

        return response()->json(['data' => ['user' => $r->user(), 'role' => $ctx->role, 'division_id' => $ctx->divisionId, 'unit_id' => $ctx->unitId, 'home' => $ctx->home()]]);
    }

    public function destroy(Request $r)
    {
        Auth::logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();
        if (! $r->expectsJson()) {
            return redirect('/login');
        }

        return response()->json(['message' => 'Berhasil logout.']);
    }
}
