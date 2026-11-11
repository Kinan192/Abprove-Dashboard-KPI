<?php

namespace App\Services\IdentityAccess;

use App\Exceptions\BusinessRule;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Cookie;

class BetterAuth
{
    private array $cookies = [];

    public function call(Request $r, string $path, ?array $body = null): Response
    {
        try {
            $headers = ['Origin' => config('better_auth.origin'), 'Cookie' => $this->cookieHeader($r), 'User-Agent' => $r->userAgent() ?? '', 'X-Kpi-Client-Ip' => $r->ip()];
            $client = Http::baseUrl(config('better_auth.url').'/api/auth')->acceptJson()->withHeaders($headers)->connectTimeout(2)->timeout(8);
            $response = $body === null ? $client->get($path) : $client->post($path, $body);
            foreach ($response->toPsrResponse()->getHeader('Set-Cookie') as $cookie) {
                $parsed = Cookie::fromString($cookie);
                $this->cookies[$parsed->getName()] = $parsed;
            }
            if ($response->serverError()) {
                throw new BusinessRule('AUTH_UNAVAILABLE', 'Layanan autentikasi belum siap. Coba kembali.', 503);
            }
            if ($response->status() === 429) {
                throw new BusinessRule('AUTH_RATE_LIMITED', 'Terlalu banyak percobaan. Tunggu sebelum mencoba kembali.', 429);
            }

            return $response;
        } catch (ConnectionException $e) {
            throw new BusinessRule('AUTH_UNAVAILABLE', 'Layanan autentikasi belum berjalan. Jalankan npm run start.', 503);
        }
    }

    public function user(Request $r): ?User
    {
        if (! $r->cookies->has(config('better_auth.cookie'))) {
            return null;
        }
        $response = $this->call($r, '/get-session');
        $data = $response->json();
        if (! $response->successful() || ! isset($data['user']['id'], $data['session']['id'])) {
            $this->expire($r);

            return null;
        }
        $r->attributes->set('better_auth_session', $data['session']);
        $session = DB::table('auth_sessions')->where('id', $data['session']['id'])->where('userId', $data['user']['id'])->first();
        if (! $session || now()->diffInSeconds(CarbonImmutable::parse($session->last_activity_at, 'UTC'), true) >= 1800) {
            $this->expire($r);

            return null;
        }
        $user = User::find($data['user']['id']);
        if (! $user?->is_active) {
            $this->expire($r);

            return null;
        }
        try {
            $ctx = app(ScopeResolver::class)->resolve($user);
        } catch (BusinessRule $e) {
            $this->expire($r);

            return null;
        }
        if (($data['session']['context_key'] ?? null) !== $ctx->role.':'.$ctx->assignmentId) {
            $this->expire($r);

            return null;
        }
        $r->attributes->set('better_auth_session', $data['session']);

        DB::table('auth_sessions')->where('id', $session->id)->update(['last_activity_at' => now()]);

        return $user;
    }

    public function expire(Request $r): void
    {
        $id = $r->attributes->get('better_auth_session')['id'] ?? null;
        if ($id) {
            DB::table('auth_sessions')->where('id', $id)->delete();
        }
        $name = config('better_auth.cookie');
        $this->cookies[$name] = Cookie::create($name)->withValue('')->withExpires(1)->withPath('/')->withHttpOnly(true)->withSecure(str_starts_with($name, '__Secure-'))->withSameSite('lax');
    }

    public function appendCookies($response): void
    {
        foreach ($this->cookies as $cookie) {
            $response->headers->setCookie($cookie);
        }
    }

    private function cookieHeader(Request $r): string
    {
        $value = $r->cookies->get(config('better_auth.cookie'));

        $remember = str_starts_with(config('better_auth.cookie'), '__Secure-') ? '__Secure-kpi_dont_remember' : 'kpi_dont_remember';

        return $value ? config('better_auth.cookie').'='.rawurlencode($value).($r->cookies->has($remember) ? '; '.$remember.'='.rawurlencode($r->cookies->get($remember)) : '') : '';
    }
}
