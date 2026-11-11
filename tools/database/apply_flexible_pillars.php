<?php

// Apply only the additive pillar migration to the explicitly selected local DB.
require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$connection = Illuminate\Support\Facades\DB::connection();
$database = $connection->getDatabaseName();
if ($database !== 'kpi_kinerja_v3_dev') {
    throw new RuntimeException('Expected the existing local v3 development database. Nothing was changed.');
}
$tables = ['kpi_templates', 'kpi_items', 'assessments', 'assessment_items'];
$read = function () use ($connection, $tables): array {
    $rows = [];
    foreach ($tables as $table) {
        $rows[$table] = $connection->table($table)->orderBy('id')->get()->toArray();
    }

    return $rows;
};
$before = $read();
$hash = fn ($rows) => hash('sha256', json_encode($rows, JSON_THROW_ON_ERROR));
$directory = storage_path('app/private/role-refinement/'.gmdate('Ymd-His'));
if (! is_dir($directory) && ! mkdir($directory, 0700, true)) {
    throw new RuntimeException('Could not create a private backup directory.');
}
$backup = $directory.'/before-pillars.json';
if (file_put_contents($backup, json_encode(['database' => $database, 'capturedAt' => gmdate('c'), 'createTable' => $connection->select('SHOW CREATE TABLE kpi_items'), 'rows' => $before], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)) === false || ! is_readable($backup)) {
    throw new RuntimeException('Private backup could not be verified. Nothing was changed.');
}
$exit = $kernel->call('migrate', ['--path' => 'database/migrations/2026_11_10_000008_allow_custom_kpi_pillars.php', '--force' => true, '--no-interaction' => true]);
if ($exit !== 0) {
    throw new RuntimeException('Pillar migration failed; private backup retained. '.$kernel->output());
}
$after = $read();
$unchanged = [];
foreach ($tables as $table) {
    $unchanged[$table] = $hash($before[$table]) === $hash($after[$table]);
}
$result = ['database' => $database, 'migration' => '2026_11_10_000008_allow_custom_kpi_pillars', 'backup' => str_replace(base_path().DIRECTORY_SEPARATOR, '', $directory.'/before-pillars.json'), 'rowCounts' => array_map('count', $after), 'rowsUnchanged' => $unchanged, 'noReseed' => true, 'appliedAt' => gmdate('c')];
file_put_contents(base_path('docs/frontend/role-refinement/local-migration.json'), json_encode($result, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
if (in_array(false, $unchanged, true)) {
    throw new RuntimeException('Data changed during migration; inspect the private backup and report before continuing.');
}
echo json_encode(['result' => 'PASS', 'migration' => $result['migration'], 'rowsUnchanged' => $unchanged, 'noReseed' => true], JSON_THROW_ON_ERROR).PHP_EOL;
