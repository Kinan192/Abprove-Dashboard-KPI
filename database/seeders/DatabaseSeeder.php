<?php

namespace Database\Seeders;

use App\Support\DataSnapshot;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (DataSnapshot::default()->exists()) {
            $this->call(DataSnapshotSeeder::class);

            return;
        }
        $this->command?->info('Tidak ada data seed (database/seeders/data). Buat Admin pertama dengan php artisan kpi:create-admin.');
    }
}
