<?php

namespace App\Support;

class FrontendPages
{
    public static function navigation(string $role): array
    {
        $common = [['help', 'Bantuan', 'help'], ['notifications', 'Notifikasi', 'bell']];
        $items = match ($role) {
            'kepala_unit' => [['dashboard', 'Beranda', 'grid'], ['score', 'Isi Nilai', 'clipboard'], ['submissions', 'Pengajuan', 'upload'], ['history', 'Riwayat', 'clock'], ['kpis', 'KPI Unit', 'table'], ['members', 'Anggota Unit', 'users']],
            'kepala_divisi' => [['dashboard', 'Beranda', 'grid'], ['approvals', 'Persetujuan', 'check'], ['heads', 'Nilai Kepala Unit', 'clipboard'], ['analytics', 'Dashboard Divisi', 'chart'], ['team', 'Tim Divisi', 'users']],
            'super_hc' => [['dashboard', 'Beranda', 'grid'], ['recap', 'Rekap Penilaian', 'check'], ['kpi-templates', 'Master KPI', 'table'], ['settings', 'Pengaturan', 'settings'], ['organization', 'Pengguna & Struktur', 'users'], ['analytics', 'Analitik', 'chart'], ['audit', 'Riwayat Aktivitas', 'clock']],
        };

        return array_merge($items, $common);
    }

    public static function roleLabel(string $role): string
    {
        return match ($role) {
            'kepala_unit' => 'Kepala Unit', 'kepala_divisi' => 'Kepala Divisi', 'super_hc' => 'Super HC'
        };
    }

    public static function prefix(string $role): string
    {
        return match ($role) {
            'kepala_unit' => '/unit', 'kepala_divisi' => '/division', 'super_hc' => '/hc'
        };
    }

    public static function page(string $path): ?string
    {
        $parts = explode('/', trim($path, '/'));
        $last = $parts[1] ?? 'dashboard';
        if ($last === 'assessments') {
            return isset($parts[2]) ? 'detail' : 'submissions';
        }
        if ($last === 'organization') {
            return $parts[2] ?? 'organization';
        }

        return match ($last) {
            'cycles' => 'settings', 'kpi-templates' => isset($parts[2]) ? 'template-editor' : 'templates',
            default => $last,
        };
    }
}
