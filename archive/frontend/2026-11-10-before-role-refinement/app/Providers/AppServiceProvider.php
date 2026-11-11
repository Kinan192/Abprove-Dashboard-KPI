<?php

namespace App\Providers;

use App\Services\IdentityAccess\BetterAuth;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(BetterAuth::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Auth::viaRequest('better-auth', fn (Request $r) => app(BetterAuth::class)->user($r));
        RateLimiter::for('login', fn (Request $r) => [
            Limit::perMinute(5)->by(hash('sha256', mb_strtolower((string) $r->input('identifier')).'|'.$r->ip())),
            Limit::perMinute(30)->by($r->ip()),
        ]);
    }
}
