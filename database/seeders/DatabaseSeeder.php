<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->info('Tidak ada data contoh yang ditanam. Buat Super HC pertama dengan php artisan kpi:create-admin.');
    }
}
