<?php

declare(strict_types=1);

use App\Models\User;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\ScopeResolver;
use App\Support\DomainSchema;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

Artisan::command('kpi:auth-key', function () {
    $path = base_path('.env');
    if (! is_file($path)) {
        $this->error('Salin .env.example menjadi .env terlebih dahulu.');

        return 1;
    }
    $env = file_get_contents($path);
    if (preg_match('/^BETTER_AUTH_SECRET=.{32,}$/m', $env)) {
        $this->info('Better Auth secret sudah tersedia.');

        return 0;
    }
    $line = 'BETTER_AUTH_SECRET='.bin2hex(random_bytes(32));
    $env = preg_match('/^BETTER_AUTH_SECRET=/m', $env) ? preg_replace('/^BETTER_AUTH_SECRET=.*$/m', $line, $env) : rtrim($env)."\n".$line."\n";
    file_put_contents($path, $env);
    $this->info('Better Auth secret disimpan pada .env.');
});

Artisan::command('kpi:create-admin {--name=} {--email=}', function () {
    if (DB::table('scope_assignments')->where('role_key', 'super_hc')->whereNull('revoked_at')->exists()) {
        $this->error('Super HC sudah tersedia. Gunakan pengelolaan akun oleh HC untuk menambah akun.');

        return 1;
    }
    $name = $this->option('name') ?: $this->ask('Nama Super HC');
    $email = $this->option('email') ?: $this->ask('Email login');
    $password = $this->secret('Kata sandi (minimal 12 karakter, huruf dan angka)');
    $confirmation = $this->secret('Ulangi kata sandi');
    $validator = Validator::make(compact('name', 'email', 'password') + ['password_confirmation' => $confirmation], [
        'name' => ['required', 'string', 'max:160'], 'email' => ['required', 'email', 'max:190', 'unique:users,email', 'unique:users,login_nip'],
        'password' => ['required', 'confirmed', Password::min(12)->letters()->numbers()],
    ]);
    if ($validator->fails()) {
        foreach ($validator->errors()->all() as $error) {
            $this->error($error);
        }

        return 1;
    }
    $user = DB::transaction(function () use ($name, $email, $password) {
        $user = User::create(compact('name', 'email', 'password') + (DomainSchema::ready() ? ['role_key' => 'super_hc'] : []));
        DB::table('user_roles')->insert(['user_id' => $user->id, 'role_key' => 'super_hc']);
        DB::table('scope_assignments')->insert(['user_id' => $user->id, 'role_key' => 'super_hc', 'assigned_by' => $user->id, 'assigned_at' => now()->format('Y-m-d H:i:s.u')]);
        $ctx = app(ScopeResolver::class)->resolve($user->fresh());
        app(AuditWriter::class)->record($ctx, 'user', $user->id, 'bootstrap.admin', null, ['id' => $user->id, 'email' => $email]);

        return $user;
    });
    $this->info('Super HC dibuat: '.$user->email);

    return 0;
})->purpose('Membuat akun Super HC pertama secara interaktif, tanpa password default.');
