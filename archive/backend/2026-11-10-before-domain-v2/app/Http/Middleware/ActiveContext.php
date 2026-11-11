<?php

namespace App\Http\Middleware;

use App\Exceptions\BusinessRule;
use App\Models\User;
use App\Services\IdentityAccess\ScopeResolver;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActiveContext
{
    public function __construct(private ScopeResolver $scopes) {}

    public function handle(Request $request, Closure $next, ?string $role = null)
    {
        if (! $request->user()) {
            if (! $request->expectsJson()) {
                return redirect('/login');
            }
            abort(401, 'Silakan login.');
        }
        $user = User::find($request->user()->id);
        $last = $request->session()->get('last_activity_at');
        if (! $user?->is_active || ($last && now()->timestamp - $last >= 1800)) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            if (! $request->expectsJson()) {
                return redirect('/login')->with('session_expired', 'Sesi berakhir. Silakan masuk kembali.');
            }
            throw new BusinessRule('SESSION_EXPIRED', 'Sesi berakhir atau akun dinonaktifkan.', 401);
        }
        Auth::setUser($user);
        $ctx = $this->scopes->resolve($user);
        if ($role && $ctx->role !== $role) {
            abort(403, 'Role tidak berwenang.');
        }
        $request->attributes->set('access_context', $ctx);
        $request->session()->put('last_activity_at', now()->timestamp);

        return $next($request);
    }
}
