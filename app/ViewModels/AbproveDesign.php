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
        'hc' => ['dashboard', 'rekap', 'karyawan', 'struktur', 'jabatan', 'kpi', 'pengaturan', 'aktivitas', 'impor', 'panduan', 'profil', 'notifikasi'],
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
            'panduan' => 'Panduan', 'profil' => 'Profil', 'notifikasi' => 'Notifikasi', default => 'ABprove',
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
            'aktivitas' => 'audit','impor' => 'import','panduan' => 'help','profil' => 'profile','tim' => $this->role === 'ku' ? 'members' : 'team',default => $view,
        };

        return url($prefix.'/'.$path).'?month='.$this->month;
    }

    public function navigation(): array
    {
        $menu = match ($this->role) {
            'ku' => [['dashboard', 'Dashboard', 'chart'], ['nilai', 'Isi nilai', 'edit'], ['pengajuan', 'Pengajuan', 'inbox'], ['riwayat', 'Riwayat', 'clock'], ['kpi', 'KPI Unit', 'table'], ['tim', 'Anggota Unit', 'users']],
            'kd' => [['dashboard', 'Dashboard divisi', 'chart'], ['persetujuan', 'Persetujuan', 'check'], ['kpi', 'KPI Divisi', 'table'], ['nilai-kepala', 'Nilai Kepala Unit', 'clipboard'], ['tim', 'Tim Divisi', 'users']],
            'hc' => [['dashboard', 'Dashboard', 'chart'], ['rekap', 'Rekap Penilaian', 'check'], ['struktur', 'Struktur & Staf', 'users'], ['kpi', 'KPI & Periode', 'table'], ['aktivitas', 'Riwayat Aktivitas', 'clock']],
            'adm' => [['akun', 'Akun Pengguna', 'users'], ['log', 'Log Sistem', 'clock'], ['pengingat', 'Pengingat Email', 'bell']],
        };

        return collect($menu)->map(fn ($item) => ['id' => $item[0], 'label' => $item[1], 'icon' => $item[2], 'href' => $this->link($item[0])])->all();
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
