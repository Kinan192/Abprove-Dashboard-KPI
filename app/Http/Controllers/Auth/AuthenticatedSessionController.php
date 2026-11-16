<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\LoginEvent;
use App\Models\User;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\BetterAuth;
use App\Services\IdentityAccess\ScopeResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

    public function forgot()
    {
        return view('auth.login', ['review' => false, 'forgot' => true]);
    }

    public function store(LoginRequest $r, ScopeResolver $scopes, AuditWriter $audit, BetterAuth $auth)
    {
        $id = trim($r->validated('identifier'));
        $matches = User::where('email', $id)->orWhere('login_nip', $id)->limit(2)->get();
        $user = $matches->count() === 1 ? $matches->first() : null;
        $result = $auth->call($r, '/sign-in/email', ['email' => $user?->email ?? 'unknown@invalid.test', 'password' => $r->validated('password'), 'rememberMe' => $r->boolean('remember')]);
        if (! $result->successful() || ! $user || ! $user->is_active || (string) $result->json('user.id') !== (string) $user->id) {
            LoginEvent::record($r, 'failed', $id, $user?->id);
            throw ValidationException::withMessages(['identifier' => 'Identitas atau kata sandi tidak sesuai.']);
        }
        $ctx = DB::transaction(function () use ($r, $id, $user, $scopes, $audit) {
            $fresh = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $ctx = $scopes->resolve($fresh, true);
            $fresh->last_login_at = now();
            $fresh->save();
            $audit->record($ctx, 'user', $fresh->id, 'login', null, ['id' => $fresh->id]);
            LoginEvent::record($r, 'login', $id, $fresh->id);

            return $ctx;
        });
        Auth::setUser($user);
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
        $auth = app(BetterAuth::class);
        if ($user = $r->user()) {
            LoginEvent::record($r, 'logout', $user->email ?? $user->login_nip ?? (string) $user->id, $user->id);
        }
        $auth->call($r, '/sign-out', []);
        $auth->expire($r);
        Auth::forgetGuards();
        $r->session()->invalidate();
        $r->session()->regenerateToken();
        if (! $r->expectsJson()) {
            return redirect('/login');
        }

        return response()->json(['message' => 'Berhasil logout.']);
    }
}
