<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Copy of the application data as seed files (database/seeders/data), so another installation can start with
 * the same organisation, accounts, KPI and assessments: `php artisan kpi:export-seed` writes the files,
 * `php artisan db:seed` (DataSnapshotSeeder) loads them into a freshly migrated database.
 *
 * Loading keeps every database guard active: sealed KPI templates and Final assessments cannot be inserted
 * directly (triggers), so they are inserted open and then sealed / finalized, exactly like the application does.
 */
class DataSnapshot
{
    /** Tables in load order. */
    public const TABLES = [
        'roles', 'divisions', 'units', 'positions', 'employees', 'employee_placements',
        'users', 'user_roles', 'auth_accounts', 'scope_assignments',
        'kpi_scopes', 'kpi_templates', 'kpi_items', 'kpi_workspace_documents', 'kpi_workspace_publications',
        'assessment_cycles', 'cycle_categories', 'assessments', 'assessment_items', 'assessment_events',
        'notification_reads', 'reminder_settings', 'reminder_emails', 'audit_events', 'login_events',
    ];

    /** Not copied: framework bookkeeping, sessions/tokens, queues and the idempotency cache. */
    public const SKIPPED = [
        'migrations', 'domain_schema_versions', 'auth_sessions', 'auth_verifications',
        'jobs', 'job_batches', 'failed_jobs', 'cache', 'cache_locks', 'sessions', 'password_reset_tokens', 'operation_requests',
    ];

    /** Rows the migrations already create: kept and overwritten with the snapshot values. */
    private const MIGRATION_ROWS = ['roles' => ['role_key'], 'reminder_settings' => ['id']];

    private const CHUNK = 200;

    public function __construct(private string $directory) {}

    public static function default(): self
    {
        return new self(database_path('seeders/data'));
    }

    public function exists(): bool
    {
        return File::exists($this->directory.'/manifest.json');
    }

    /** @return array<string, int> rows written per table */
    public function export(): array
    {
        $unknown = array_diff($this->tables(), self::TABLES, self::SKIPPED);
        if ($unknown) {
            throw new RuntimeException('Tabel belum dipetakan di DataSnapshot: '.implode(', ', $unknown).'. Tambahkan ke TABLES atau SKIPPED.');
        }
        File::deleteDirectory($this->directory);
        File::ensureDirectoryExists($this->directory);
        $counts = [];
        foreach (self::TABLES as $table) {
            $columns = $this->storedColumns($table);
            $rows = DB::table($table)->select($columns)->orderBy($this->primaryKey($table)[0])->get();
            $lines = $rows->map(fn ($row) => json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
            File::put("{$this->directory}/{$table}.json", "[\n".$lines->implode(",\n")."\n]\n");
            $counts[$table] = $rows->count();
        }
        $files = $this->exportFiles();
        File::put($this->directory.'/manifest.json', json_encode([
            'exported_at' => now('Asia/Jakarta')->format('Y-m-d H:i:s').' WIB',
            'migration' => DB::table('migrations')->max('migration'),
            'tables' => $counts,
            'files' => $files,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n");

        return $counts;
    }

    /**
     * Loads the snapshot into an empty, freshly migrated database (all or nothing).
     *
     * @return array<string, int> rows loaded per table
     */
    public function import(): array
    {
        if (! $this->exists()) {
            throw new RuntimeException('Data seed belum ada. Jalankan php artisan kpi:export-seed di komputer sumber.');
        }
        $manifest = json_decode(File::get($this->directory.'/manifest.json'), true, 512, JSON_THROW_ON_ERROR);
        $latest = DB::table('migrations')->max('migration');
        if ($latest !== $manifest['migration']) {
            throw new RuntimeException("Migrasi database ({$latest}) berbeda dengan data seed ({$manifest['migration']}). Samakan kode lalu jalankan php artisan migrate.");
        }
        if (DB::table('users')->exists()) {
            throw new RuntimeException('Database sudah berisi akun. Seed hanya untuk database baru: php artisan migrate:fresh --seed (menghapus semua data).');
        }

        $counts = [];
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        try {
            DB::transaction(function () use (&$counts) {
                $data = [];
                foreach (self::TABLES as $table) {
                    $data[$table] = $this->rows($table);
                }
                foreach (self::TABLES as $table) {
                    $counts[$table] = count($data[$table]);
                    match ($table) {
                        // Items of a sealed template can only be added while it is open: insert open, seal after the items.
                        'kpi_templates' => $this->insert($table, array_map(fn ($r) => ['sealed_at' => null] + $r, $data[$table])),
                        'kpi_items' => $this->insertThenRestore($table, $data[$table], 'kpi_templates', $data['kpi_templates'], 'sealed_at', null),
                        // Assessments start as "submitted"; Final/returned status is applied once their items exist.
                        'assessments' => $this->insert($table, array_map(fn ($r) => ['status' => 'submitted'] + $r, $data[$table])),
                        'assessment_items' => $this->insertThenRestore($table, $data[$table], 'assessments', $data['assessments'], 'status', 'submitted'),
                        default => isset(self::MIGRATION_ROWS[$table])
                            ? DB::table($table)->upsert($data[$table], self::MIGRATION_ROWS[$table])
                            : $this->insert($table, $data[$table]),
                    };
                }
            });
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }
        $this->importFiles($manifest['files'] ?? []);

        return $counts;
    }

    /** Inserts `$rows`, then sets `$column` of the parent rows back to their snapshot value (with their original updated_at). */
    private function insertThenRestore(string $table, array $rows, string $parent, array $parents, string $column, ?string $inserted): void
    {
        $this->insert($table, $rows);
        foreach ($parents as $row) {
            if ($row[$column] !== $inserted) {
                DB::table($parent)->where('id', $row['id'])->update([$column => $row[$column], 'updated_at' => $row['updated_at']]);
            }
        }
    }

    private function insert(string $table, array $rows): void
    {
        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            DB::table($table)->insert($chunk);
        }
    }

    private function rows(string $table): array
    {
        $path = "{$this->directory}/{$table}.json";

        return File::exists($path) ? json_decode(File::get($path), true, 512, JSON_THROW_ON_ERROR) : [];
    }

    /** Uploaded profile photos referenced by users.photo_path (storage is not part of the repository). */
    private function exportFiles(): array
    {
        $disk = Storage::disk('local');
        $files = DB::table('users')->whereNotNull('photo_path')->pluck('photo_path')->filter(fn ($path) => $disk->exists($path))->values()->all();
        foreach ($files as $path) {
            File::ensureDirectoryExists(dirname("{$this->directory}/files/{$path}"));
            File::put("{$this->directory}/files/{$path}", $disk->get($path));
        }

        return $files;
    }

    private function importFiles(array $files): void
    {
        foreach ($files as $path) {
            Storage::disk('local')->put($path, File::get("{$this->directory}/files/{$path}"));
        }
    }

    /** @return list<string> */
    private function tables(): array
    {
        return array_map(fn ($row) => $row->t, DB::select('SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = ?', ['BASE TABLE']));
    }

    /** Columns that can be inserted (generated columns are computed by MySQL). */
    private function storedColumns(string $table): array
    {
        $columns = DB::select('SELECT column_name AS c, extra AS x FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ordinal_position', [$table]);

        // "DEFAULT_GENERATED" is only a default value; VIRTUAL/STORED GENERATED columns cannot be written.
        return array_values(array_map(fn ($row) => $row->c, array_filter($columns, fn ($row) => ! preg_match('/\b(VIRTUAL|STORED) GENERATED\b/i', $row->x))));
    }

    private function primaryKey(string $table): array
    {
        return array_map(fn ($row) => $row->c, DB::select(
            "SELECT column_name AS c FROM information_schema.key_column_usage WHERE table_schema = DATABASE() AND table_name = ? AND constraint_name = 'PRIMARY' ORDER BY ordinal_position",
            [$table],
        ));
    }
}
