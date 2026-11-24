<?php

namespace Database\Seeders;

use App\Support\DataSnapshot;
use Illuminate\Database\Seeder;

/** Loads database/seeders/data (made with `php artisan kpi:export-seed`) into a freshly migrated, empty database. */
class DataSnapshotSeeder extends Seeder
{
    public function run(): void
    {
        $counts = DataSnapshot::default()->import();
        $this->command?->table(['Tabel', 'Baris'], array_map(fn ($table, $count) => [$table, $count], array_keys($counts), $counts));
        $this->command?->info('Data berhasil ditanam. Masuk dengan akun dan kata sandi yang sama seperti di komputer sumber.');
    }
}
