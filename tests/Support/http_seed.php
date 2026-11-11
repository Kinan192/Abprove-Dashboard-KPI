<?php

use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (getenv('KPI_ISOLATED_TEST') !== '1' || config('database.connections.mysql.database') !== 'kpi_backend_v2_test') {
    throw new RuntimeException('Isolated test database required.');
}
$user = User::create(['role_key' => 'super_hc', 'name' => 'HTTP test', 'email' => 'http@example.test', 'password' => getenv('KPI_HTTP_PASSWORD')]);
DB::table('user_roles')->insert(['user_id' => $user->id, 'role_key' => 'super_hc']);
DB::table('scope_assignments')->insert(['user_id' => $user->id, 'role_key' => 'super_hc', 'assigned_at' => now()->subMinute()]);
