<?php

namespace App\ViewModels;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Presentation metadata for the authenticated workspace. */
class AbproveDesign
{
    public array $data;

    public array $actor;

    public int $month;

    public const ROLE_NAMES = ['ku' => 'Kepala Unit', 'kd' => 'Kepala Divisi', 'hc' => 'Super HC', 'adm' => 'Admin'];

    /** Backend role key to presentation role key. */
    public const ROLE_KEYS = ['kepala_unit' => 'ku', 'kepala_divisi' => 'kd', 'super_hc' => 'hc', 'admin' => 'adm'];

    public const VIEWS = [
        'ku' => ['dashboard', 'nilai', 'pengajuan', 'riwayat', 'kpi', 'tim', 'panduan', 'profil', 'notifikasi'],
        'kd' => ['dashboard', 'persetujuan', 'kpi', 'nilai-kepala', 'tim', 'panduan', 'profil', 'notifikasi'],
        'hc' => ['dashboard', 'rekap', 'perpanjangan', 'karyawan', 'struktur', 'jabatan', 'kpi', 'pengaturan', 'aktivitas', 'impor', 'panduan', 'profil', 'notifikasi'],
        'adm' => ['akun', 'log', 'pengingat', 'panduan', 'profil'],
    ];

    private const SHELL_SECTIONS = ['accounts', 'divisions', 'units', 'cycles', 'profiles', 'notifications', 'navCounts'];

    private const ROSTER_SECTIONS = ['positions', 'staff', 'heads'];

    /**
     * Workspace data per page profile. `window` bounds the assessment months:
     * none, current (selected month), previous (selected and prior month) or year (calendar year of the
     * selected month; months other than the selected one carry Final results only).
     * Roster, publications and templates follow the same months unless the section is listed in `history`.
     * Notification lists are previews; the notification page pages through `GET {prefix}/notifications`.
     */
    public const WORKSPACE_PROFILES = [
        'kerja' => ['window' => 'previous', 'sections' => [...self::SHELL_SECTIONS, ...self::ROSTER_SECTIONS, 'kpis', 'assessments', 'assessmentTemplates']],
        'laporan' => ['window' => 'year', 'sections' => [...self::SHELL_SECTIONS, ...self::ROSTER_SECTIONS, 'kpis', 'assessments', 'assessmentTemplates']],
        'dashboard' => ['window' => 'none', 'sections' => [...self::SHELL_SECTIONS, ...self::ROSTER_SECTIONS]],
        'notifikasi' => ['window' => 'none', 'sections' => [...self::SHELL_SECTIONS, ...self::ROSTER_SECTIONS]],
        'aktivitas' => ['window' => 'none', 'sections' => [...self::SHELL_SECTIONS, ...self::ROSTER_SECTIONS]],
        'organisasi' => ['window' => 'none', 'history' => ['staff', 'heads'], 'sections' => [...self::SHELL_SECTIONS, ...self::ROSTER_SECTIONS, 'kpis']],
        'kpi' => ['window' => 'none', 'history' => ['kpis'], 'sections' => [...self::SHELL_SECTIONS, ...self::ROSTER_SECTIONS, 'kpiUnits', 'kpis']],
        'kpi-workspace' => ['window' => 'none', 'sections' => [...self::SHELL_SECTIONS, ...self::ROSTER_SECTIONS]],
        'personal' => ['window' => 'none', 'sections' => self::SHELL_SECTIONS],
    ];

    public function __construct(public string $role, public string $page, public bool $review = false, ?Request $request = null)
    {
        $request ??= request();
        $user = $request->user();
        $ctx = $request->attributes->get('access_context');
        $now = now('Asia/Jakarta');
        $this->page = $page === 'beranda' ? 'dashboard' : $page;
        $this->review = false;
        $this->data = [
            'months' => ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
            'shortMonths' => ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
            'year' => $now->year,
        ];
        $this->actor = [
            'nama' => $user->name,
            'short' => self::ROLE_NAMES[$role],
            'key' => (string) $user->id,
            'email' => $user->email,
            'nip' => $user->login_nip,
            'phone' => $user->phone,
            'notification' => (bool) $user->email_notifications,
            'hasPhoto' => (bool) $user->photo_path,
            'scopeName' => $ctx->unitId ? DB::table('units')->where('id', $ctx->unitId)->value('name') : ($ctx->divisionId ? DB::table('divisions')->where('id', $ctx->divisionId)->value('name') : 'Seluruh organisasi'),
        ];
        $this->month = max(0, min(11, (int) $request->query('month', $now->month - 1)));
    }

    public function isAdmin(): bool
    {
        return $this->role === 'adm';
    }

    public function title(): string
    {
        return match ($this->page) {
            'nilai' => 'Isi nilai', 'pengajuan' => 'Pengajuan', 'riwayat' => 'Riwayat penilaian',
            'kpi' => ['ku' => 'KPI unit', 'kd' => 'KPI divisi', 'hc' => 'Master KPI'][$this->role],
            'persetujuan' => 'Persetujuan', 'nilai-kepala' => 'Nilai Kepala Unit', 'dashboard' => $this->role === 'kd' ? 'Dashboard divisi' : 'Dashboard',
            'tim' => $this->role === 'ku' ? 'Anggota Unit' : 'Tim Divisi',
            'rekap' => 'Rekap penilaian', 'karyawan','struktur','jabatan' => 'Struktur & Staf', 'akun' => 'Akun pengguna',
            'log' => 'Log sistem', 'pengingat' => 'Pengingat email',
            'pengaturan' => 'Pengaturan Periode', 'aktivitas' => 'Riwayat aktivitas', 'impor' => 'Upload master KPI',
            'perpanjangan' => 'Perpanjangan tenggat', 'panduan' => 'Panduan', 'profil' => 'Profil', 'notifikasi' => 'Notifikasi', default => 'ABprove',
        };
    }

    public function scope(): string
    {
        return $this->actor['scopeName'];
    }

    public function link(string $view): string
    {
        $view = $view === 'beranda' ? 'dashboard' : $view;
        if ($this->isAdmin()) {
            $path = match ($view) {
                'log' => 'logs', 'pengingat' => 'reminders', 'panduan' => 'help', 'profil' => 'profile', default => 'accounts',
            };

            return url('/admin/'.$path);
        }
        $prefix = ['ku' => '/unit', 'kd' => '/division', 'hc' => '/hc'][$this->role];
        $path = match ($view) {
            'notifikasi' => 'notifications','nilai' => 'score','pengajuan' => 'submissions','riwayat' => 'history','persetujuan' => 'approvals','nilai-kepala' => 'heads',
            'dashboard' => 'dashboard','kpi' => $this->role === 'hc' ? 'kpi-templates' : 'kpis','rekap' => 'recap','karyawan' => 'organization/employees',
            'struktur' => 'organization','jabatan' => 'organization/positions','pengaturan' => 'settings',
            'aktivitas' => 'audit','perpanjangan' => 'extensions','impor' => 'import','panduan' => 'help','profil' => 'profile','tim' => $this->role === 'ku' ? 'members' : 'team',default => $view,
        };

        return url($prefix.'/'.$path).'?month='.$this->month;
    }

    /** Flat menu in sidebar order; the mobile bar takes the first four. */
    public function navigation(): array
    {
        $menu = match ($this->role) {
            'ku' => [['dashboard', 'Dashboard', 'chart', 'Ringkasan'], ['nilai', 'Isi nilai', 'edit', 'Penilaian'], ['pengajuan', 'Pengajuan', 'inbox', 'Penilaian'], ['riwayat', 'Riwayat', 'clock', 'Penilaian'], ['kpi', 'KPI Unit', 'table', 'Unit'], ['tim', 'Anggota Unit', 'users', 'Unit']],
            'kd' => [['dashboard', 'Dashboard divisi', 'chart', 'Ringkasan'], ['persetujuan', 'Persetujuan', 'check', 'Penilaian'], ['nilai-kepala', 'Nilai Kepala Unit', 'clipboard', 'Penilaian'], ['kpi', 'KPI Divisi', 'table', 'Divisi'], ['tim', 'Tim Divisi', 'users', 'Divisi']],
            'hc' => [['dashboard', 'Dashboard', 'chart', 'Ringkasan'], ['rekap', 'Rekap Penilaian', 'check', 'Penilaian'], ['perpanjangan', 'Perpanjangan', 'calendar', 'Penilaian'], ['struktur', 'Struktur & Staf', 'users', 'Master data'], ['kpi', 'KPI & Periode', 'table', 'Master data'], ['aktivitas', 'Riwayat Aktivitas', 'clock', 'Sistem']],
            'adm' => [['akun', 'Akun Pengguna', 'users', 'Administrasi'], ['log', 'Log Sistem', 'clock', 'Sistem'], ['pengingat', 'Pengingat Email', 'bell', 'Sistem']],
        };

        return collect($menu)->map(fn ($item) => ['id' => $item[0], 'label' => $item[1], 'icon' => $item[2], 'group' => $item[3], 'href' => $this->link($item[0])])->all();
    }

    /** Sidebar sections: group label => items, in menu order. */
    public function navigationGroups(): array
    {
        return collect($this->navigation())->groupBy('group')->map->all()->all();
    }

    /** "Selamat siang, Putri" by the WIB hour; academic titles and suffixes are dropped. */
    public function greeting(): string
    {
        $hour = (int) now('Asia/Jakarta')->format('G');
        $part = match (true) {
            $hour < 11 => 'pagi', $hour < 15 => 'siang', $hour < 18 => 'sore', default => 'malam',
        };
        $name = preg_replace('/^((dr|drg|apt|ns|prof|drs|dra|ir|h|hj)\.\s*)+/i', '', explode(',', $this->actor['nama'])[0]);
        $first = strtok(trim($name), ' ') ?: '';

        return 'Selamat '.$part.($first !== '' ? ', '.$first : '');
    }

    public function navActive(string $id): bool
    {
        if ($this->role === 'hc' && $id === 'struktur') {
            return in_array($this->page, ['struktur', 'jabatan', 'karyawan']);
        }
        if ($this->role === 'hc' && $id === 'kpi') {
            return in_array($this->page, ['kpi', 'pengaturan', 'impor']);
        }

        return $this->page === $id;
    }

    public function monthLabel(): string
    {
        return $this->data['months'][$this->month].' '.$this->data['year'];
    }

    public static function number($value, int $decimals = 2): string
    {
        return $value === null ? '-' : number_format((float) $value, $decimals, ',', '.');
    }

    public static function initials(string $name): string
    {
        $clean = preg_replace('/^(drg?\.|apt\.|ns\.|prof\.|drs\.|dra\.)\s*/i', '', $name);

        return collect(explode(' ', explode(',', $clean)[0]))->filter()->take(2)->map(fn ($s) => mb_strtoupper(mb_substr($s, 0, 1)))->implode('');
    }

    public function view(): string
    {
        if ($this->role === 'hc' && in_array($this->page, ['kpi', 'pengaturan'], true)) {
            return 'kpi.workspace';
        }

        return match ($this->page) {
            'akun' => 'admin.accounts',
            'log' => 'admin.logs',
            'pengingat' => 'admin.reminders',
            'nilai', 'nilai-kepala' => 'assessments.editor',
            'pengajuan', 'persetujuan', 'rekap' => 'assessments.list',
            'jabatan', 'struktur', 'karyawan' => 'organization.index',
            'kpi', 'impor' => 'kpi.templates',
            'dashboard' => request()->query('detail') === 'laporan' || request()->is('*/analytics') ? 'reports.index' : 'dashboard.index',
            'riwayat' => 'reports.index',
            'tim' => 'team.index',
            'aktivitas' => 'organization.activity',
            'perpanjangan' => 'extensions.index',
            'panduan' => 'guide.index',
            'notifikasi' => 'notifications.index',
            'profil' => 'profile.index',
        };
    }

    /** Workspace data profile of the rendered view, see WORKSPACE_PROFILES. */
    public function dataProfile(): string
    {
        return match ($this->view()) {
            'assessments.editor', 'assessments.list', 'team.index' => 'kerja',
            'reports.index' => 'laporan',
            'dashboard.index' => 'dashboard',
            'notifications.index' => 'notifikasi',
            'organization.activity' => 'aktivitas',
            'organization.index' => 'organisasi',
            'kpi.templates' => 'kpi',
            'kpi.workspace' => 'kpi-workspace',
            default => 'personal',
        };
    }

    public function clientConfig(): array
    {
        $profile = $this->dataProfile();

        return ['mode' => 'live-v3', 'role' => $this->role, 'page' => $this->page, 'month' => $this->month, 'state' => '', 'review' => false,
            'workspaceProfile' => $profile, 'sections' => self::WORKSPACE_PROFILES[$profile]['sections'],
            'links' => collect(self::VIEWS[$this->role])->mapWithKeys(fn ($v) => [$v => $this->link($v)])->all(), 'actor' => $this->actor];
    }
}
