<?php

declare(strict_types=1);

use App\Models\User;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\ScopeResolver;
use App\Services\Notification\AutoReminderService;
use App\Support\DataSnapshot;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;
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

Artisan::command('kpi:export-seed', function () {
    $counts = DataSnapshot::default()->export();
    $this->table(['Tabel', 'Baris'], array_map(fn ($table, $count) => [$table, $count], array_keys($counts), $counts));
    $this->info('Data disimpan di database/seeders/data. Di komputer lain: php artisan migrate --seed pada database kosong.');
})->purpose('Menyimpan data database saat ini sebagai seeder (database/seeders/data).');

Artisan::command('kpi:create-admin {--name=} {--email=}', function () {
    if (DB::table('scope_assignments')->where('role_key', 'admin')->whereNull('revoked_at')->exists()) {
        $this->error('Admin sudah tersedia. Tambah akun lain melalui menu Akun Pengguna milik Admin.');

        return 1;
    }
    $name = $this->option('name') ?: $this->ask('Nama Admin');
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
        $user = User::create(compact('name', 'email', 'password') + ['role_key' => 'admin']);
        DB::table('user_roles')->insert(['user_id' => $user->id, 'role_key' => 'admin']);
        DB::table('scope_assignments')->insert(['user_id' => $user->id, 'role_key' => 'admin', 'assigned_by' => $user->id, 'assigned_at' => now()->format('Y-m-d H:i:s.u')]);
        $ctx = app(ScopeResolver::class)->resolve($user->fresh());
        app(AuditWriter::class)->record($ctx, 'user', $user->id, 'bootstrap.admin', null, ['id' => $user->id, 'email' => $email]);

        return $user;
    });
    $this->info('Admin dibuat: '.$user->email.'. Buat akun Super HC dan kepala melalui menu Akun Pengguna.');

    return 0;
})->purpose('Membuat akun Admin pertama secara interaktif, tanpa password default.');

Artisan::command('kpi:auto-reminders {--dry-run : Tampilkan rencana tanpa mencatat atau mengirim} {--at= : Waktu WIB simulasi "Y-m-d H:i", hanya dengan --dry-run}',
    function (AutoReminderService $auto) {
        $at = $this->option('at');
        if ($at !== null && ! $this->option('dry-run')) {
            $this->error('--at hanya boleh dipakai bersama --dry-run.');

            return 1;
        }
        $now = $at === null ? CarbonImmutable::now()
            : rescue(fn () => CarbonImmutable::createFromFormat('!Y-m-d H:i', $at, AutoReminderService::ZONE), null, false);
        if (! $now || ($at !== null && $now->format('Y-m-d H:i') !== $at)) {
            $this->error('Format --at harus "Y-m-d H:i" (WIB).');

            return 1;
        }
        if ($this->option('dry-run')) {
            $sent = $auto->sentToday($now);
            $rows = array_map(fn ($p) => [$p['cycle']->assessment_month->format('Y-m'), $p['role'], 'H-'.$p['offset'],
                $p['recipient']['name'], $p['recipient']['email'], $p['key'], in_array($p['key'], $sent, true) ? 'sudah' : 'belum'], $auto->plan($now));
            $this->table(['Periode', 'Role', 'Jadwal', 'Nama', 'Email', 'Delivery key', 'Tercatat hari ini'], $rows);
            $this->info(count($rows).' pengingat jatuh tempo pada '.$now->setTimezone(AutoReminderService::ZONE)->format('Y-m-d H:i').' WIB.');

            return 0;
        }
        $result = $auto->run($now);
        $this->info("Pengingat otomatis: {$result['planned']} jatuh tempo, {$result['queued']} diantrekan, {$result['skipped']} sudah tercatat.");

        return 0;
    })->purpose('Mengirim email pengingat KPI otomatis sesuai jadwal H- Admin (dijalankan scheduler tiap menit).');

Schedule::command('kpi:auto-reminders')->everyMinute()->withoutOverlapping(30);
