<?php

namespace Database\Seeders;

class RealisticSimulationSeeder extends MonthlySimulationSeeder
{
    protected const PREFIX = 'RS26';

    protected const LOGIN = 'rs';

    protected const CREDENTIAL_FILE = 'realistic-simulation-accounts.json';

    protected function catalog(): array
    {
        return require __DIR__.'/data/hospital-kpi.php';
    }

    protected function staffName(string $number, int $index): string
    {
        $first = ['Aditya', 'Aisyah', 'Angga', 'Annisa', 'Arif', 'Ayu', 'Bagas', 'Citra', 'Dewi', 'Dimas', 'Farah', 'Fikri', 'Hana', 'Ilham', 'Intan', 'Maya'];
        $last = ['Adinata', 'Ananda', 'Anggraini', 'Ardiansyah', 'Azzahra', 'Firmansyah', 'Handayani', 'Haryanto', 'Kurniawan', 'Larasati', 'Mahendra', 'Maharani', 'Nugraha', 'Oktaviani', 'Permana', 'Prameswari', 'Prasetyo', 'Rahmawati', 'Ramadhan', 'Saputra', 'Setiawan', 'Utami', 'Wicaksono', 'Wulandari'];

        return $first[intdiv($index, count($last))].' '.$last[$index % count($last)];
    }

    protected function monthlyStaff(array $staff, int $month, bool $november): array
    {
        if ($november) {
            return array_slice($staff, 0, 10);
        }

        $rotating = $month === 9 ? 1 : 3 + $month;

        return [0 => $staff[0], 2 => $staff[2], $rotating => $staff[$rotating]];
    }

    protected function findings(array $items, int $base): array
    {
        return [
            'Bukti untuk indikator '.$items[0]['name'].' sudah tercatat di rekap bulanan.',
            $base < 80 ? 'Tinjau sampel yang belum memenuhi indikator '.$items[1]['name'].' bersama penanggung jawab.' : null,
        ];
    }
}
