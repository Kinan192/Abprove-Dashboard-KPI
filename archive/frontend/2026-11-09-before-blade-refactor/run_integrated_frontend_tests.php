<?php

declare(strict_types=1);

$root = dirname(__DIR__, 2);
chdir($root);
$bin = $argv[1] ?? 'C:\\laragon\\bin\\mysql\\mysql-8.4.3-winx64\\bin';
$exe = PHP_OS_FAMILY === 'Windows' ? '.exe' : '';
$run = sys_get_temp_dir().DIRECTORY_SEPARATOR.'kpi-frontend-'.bin2hex(random_bytes(6));
mkdir($run);
mkdir($run.'/data');
mkdir($run.'/sessions');
$env = getenv();
function freePort(): int
{
    $socket = stream_socket_server('tcp://127.0.0.1:0', $errno, $error);
    if (! $socket) {
        throw new RuntimeException($error);
    }$name = stream_socket_get_name($socket, false);
    fclose($socket);

    return (int) substr(strrchr($name, ':'), 1);
}
function command(array $args, array $env, ?string $cwd = null): array
{
    $p = proc_open($args, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, $cwd, $env, ['bypass_shell' => true]);
    if (! is_resource($p)) {
        throw new RuntimeException('Cannot start process.');
    }fclose($pipes[0]);
    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);
    $out = '';
    $err = '';
    do {
        $out .= stream_get_contents($pipes[1]);
        $err .= stream_get_contents($pipes[2]);
        $s = proc_get_status($p);
        if ($s['running']) {
            usleep(20000);
        }
    } while ($s['running']);
    $out .= stream_get_contents($pipes[1]);
    $err .= stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $code = proc_close($p);

    return [$code === -1 ? $s['exitcode'] : $code, $out, $err];
}
function must(array $args, array $env): string
{
    [$code,$out,$err] = command($args, $env);
    if ($code !== 0) {
        throw new RuntimeException($out.$err);
    }

return $out;
}
function background(array $args, array $env, string $log)
{
    $p = proc_open($args, [0 => ['file', PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null', 'r'], 1 => ['file', $log, 'a'], 2 => ['file', $log, 'a']], $pipes, null, $env, ['bypass_shell' => true]);
    if (! is_resource($p)) {
        throw new RuntimeException('Cannot start background process.');
    }

return $p;
}
$db = null;
$http = null;
$code = 1;
$port = freePort();
$httpPort = freePort();
$started = microtime(true);
$report = ['isolated' => true, 'existingDatabaseTouched' => false, 'temporaryDirectory' => $run];
try {
    $report['engine'] = trim(must([$bin.'/mysqld'.$exe, '--no-defaults', '--version'], $env));
    if (! str_contains($report['engine'], 'Ver 8.4')) {
        throw new RuntimeException('MySQL 8.4 required.');
    }
    echo "Menyiapkan MySQL terisolasi…\n";
    must([$bin.'/mysqld'.$exe, '--no-defaults', '--initialize-insecure', '--basedir='.dirname($bin), '--datadir='.$run.'/data'], $env);
    $db = background([$bin.'/mysqld'.$exe, '--no-defaults', '--basedir='.dirname($bin), '--datadir='.$run.'/data', '--port='.$port, '--bind-address=127.0.0.1', '--mysqlx=OFF', '--default-time-zone=+00:00', '--log-error='.$run.'/mysql.log'], $env, $run.'/mysql-process.log');
    $cli = [$bin.'/mysql'.$exe, '--no-defaults', '--protocol=TCP', '--host=127.0.0.1', '--port='.$port, '--user=root'];
    $ready = false;
    for ($i = 0; $i < 150; $i++) {
        [$status] = command([...$cli, '--execute=SELECT 1'], $env);
        if ($status === 0) {
            $ready = true;
            break;
        }usleep(200000);
    }if (! $ready) {
        throw new RuntimeException('MySQL startup timeout.');
    }
    must([...$cli, '--execute=CREATE DATABASE kpi_frontend_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci'], $env);
    $env = array_merge($env, ['APP_ENV' => 'local', 'APP_DEBUG' => 'false', 'DB_CONNECTION' => 'mysql', 'DB_HOST' => '127.0.0.1', 'DB_PORT' => (string) $port, 'DB_DATABASE' => 'kpi_frontend_test', 'DB_USERNAME' => 'root', 'DB_PASSWORD' => '', 'DB_URL' => '', 'APP_CONFIG_CACHE' => $run.'/config.php', 'KPI_ISOLATED_TEST' => '1', 'KPI_E2E_PASSWORD' => 'T3st'.bin2hex(random_bytes(12)), 'BCRYPT_ROUNDS' => '4', 'SESSION_DRIVER' => 'file', 'SESSION_FILES' => $run.'/sessions', 'CACHE_STORE' => 'file', 'KPI_E2E_BASE_URL' => 'http://127.0.0.1:'.$httpPort, 'KPI_E2E_STATE' => $run.'/state.json']);
    must([PHP_BINARY, 'artisan', 'migrate', '--force', '--no-interaction'], $env);
    file_put_contents($env['KPI_E2E_STATE'], must([PHP_BINARY, 'tests/Browser/seed.php'], $env));
    $http = background([PHP_BINARY, '-S', '127.0.0.1:'.$httpPort, '-t', 'public', 'tools/testing/server.php'], $env, $run.'/http.log');
    $ready = false;
    for ($i = 0; $i < 100; $i++) {
        if (@file_get_contents($env['KPI_E2E_BASE_URL'].'/up') !== false) {
            $ready = true;
            break;
        }usleep(100000);
    }if (! $ready) {
        throw new RuntimeException('HTTP startup timeout.');
    }
    echo "Menjalankan pengujian browser…\n";
    [$code,$out,$err] = command(['node', 'node_modules/@playwright/test/cli.js', 'test'], $env);
    echo $out.$err;
    if (is_file('docs/frontend/browser-report.json')) {
        $browser = json_decode(file_get_contents('docs/frontend/browser-report.json'), true);
        $report['browserStats'] = $browser['stats'] ?? null;
    }
} catch (Throwable $e) {
    echo $e->getMessage()."\n";
    $report['error'] = $e->getMessage();
    $code = 1;
} finally {
    if (is_resource($http)) {
        proc_terminate($http);
        proc_close($http);
    }
    if (is_resource($db)) {
        command([$bin.'/mysqladmin'.$exe, '--no-defaults', '--protocol=TCP', '--host=127.0.0.1', '--port='.$port, '--user=root', 'shutdown'], $env);
        for ($i = 0; $i < 100; $i++) {
            $state = proc_get_status($db);
            if (! $state['running']) {
                break;
            }usleep(100000);
        }
        if ($state['running']) {
            proc_terminate($db);
            usleep(200000);
            $state = proc_get_status($db);
        }
        $report['isolatedInstanceStopped'] = ! $state['running'];
        proc_close($db);
    }
    $report['exitCode'] = $code;
    $report['durationSeconds'] = round(microtime(true) - $started,2);
    file_put_contents('docs/frontend/test-environment.json',json_encode($report,JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}
exit($code);
