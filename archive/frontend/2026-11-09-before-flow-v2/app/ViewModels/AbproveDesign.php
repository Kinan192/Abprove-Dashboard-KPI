<?php

namespace App\ViewModels;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

/** Presentation fixtures supplied with ABprove. No business data queries. */
class AbproveDesign
{
    public array $data;

    public array $actor;

    public int $month;

    public string $state;

    public const ROLE_NAMES = ['ku' => 'Kepala Unit', 'kd' => 'Kepala Divisi', 'hc' => 'Super HC'];

    public const VIEWS = [
        'ku' => ['beranda', 'nilai', 'pengajuan', 'riwayat', 'kpi', 'tim', 'panduan', 'profil', 'notifikasi'],
        'kd' => ['beranda', 'persetujuan', 'dashboard', 'kpi', 'nilai-kepala', 'tim', 'panduan', 'profil', 'notifikasi'],
        'hc' => ['beranda', 'rekap', 'dashboard', 'karyawan', 'struktur', 'akun', 'jabatan', 'kpi', 'penempatan', 'pengaturan', 'aktivitas', 'impor', 'panduan', 'profil', 'notifikasi'],
    ];

    public function __construct(public string $role, public string $page, public bool $review = false, ?Request $request = null)
    {
        $this->data = json_decode(File::get(resource_path('data/abprove-demo.json')), true, 512, JSON_THROW_ON_ERROR);
        $this->actor = $this->data['actors'][$role] ?? ['nama' => 'ABprove', 'short' => 'Login'];
        if ($review && $request?->query('account')) {
            $account = collect($this->data['accounts'])->first(fn ($a) => $a['key'] === $request->query('account') && $a['role'] === $role);
            if ($account) {
                $this->actor = array_replace($this->actor, $account);
            }
        }
        if (! $review && $request?->user()) {
            $this->actor['nama'] = $request->user()->name;
        }
        $this->month = max(0, min(11, (int) ($request?->query('month', 10) ?? 10)));
        $this->state = (string) ($request?->query('state', '') ?? '');
    }

    public function title(): string
    {
        return match ($this->page) {
            'beranda' => 'Beranda', 'nilai' => 'Isi nilai', 'pengajuan' => 'Pengajuan', 'riwayat' => 'Riwayat penilaian',
            'kpi' => ['ku' => 'KPI unit', 'kd' => 'KPI divisi', 'hc' => 'Master KPI'][$this->role],
            'persetujuan' => 'Persetujuan', 'nilai-kepala' => 'Nilai Kepala Unit', 'dashboard' => $this->role === 'kd' ? 'Dashboard divisi' : 'Dashboard',
            'rekap' => 'Rekap penilaian', 'karyawan' => 'Data karyawan', 'struktur' => 'Divisi & tim', 'akun' => 'Pengguna & akses', 'jabatan' => 'Jabatan',
            'penempatan' => 'Penempatan KPI', 'pengaturan' => 'Pengaturan', 'aktivitas' => 'Riwayat aktivitas', 'impor' => 'Upload master KPI',
            'panduan' => 'Panduan', 'profil' => 'Profil', 'notifikasi' => 'Notifikasi', default => 'ABprove',
        };
    }

    public function scope(): string
    {
        return match ($this->role) {
            'ku' => $this->unit($this->actor['unit'])['nama'],
            'kd' => $this->division($this->actor['div'])['nama'],
            default => 'Seluruh rumah sakit',
        };
    }

    public function link(string $view): string
    {
        if ($this->review) {
            return url('/design-review/'.$this->role.'/'.$view).'?'.http_build_query(array_filter(['month' => $this->month, 'account' => $this->actor['key'] ?? null], fn ($v) => $v !== null));
        }
        $prefix = ['ku' => '/unit', 'kd' => '/division', 'hc' => '/hc'][$this->role];
        $path = match ($view) {
            'beranda' => 'dashboard','nilai' => 'score','pengajuan' => 'submissions','riwayat' => 'history','persetujuan' => 'approvals','nilai-kepala' => 'heads',
            'dashboard' => 'analytics','kpi' => $this->role === 'hc' ? 'kpi-templates' : 'kpis','rekap' => 'recap','karyawan' => 'organization/employees',
            'struktur' => 'organization','akun' => 'organization/users','jabatan' => 'organization/positions','pengaturan' => 'settings','penempatan' => 'placement',
            'aktivitas' => 'audit','impor' => 'import','panduan' => 'help','profil' => 'profile','tim' => $this->role === 'ku' ? 'members' : 'team',default => $view,
        };

        return url($prefix.'/'.$path).'?month='.$this->month;
    }

    public function navigation(): array
    {
        $menu = match ($this->role) {
            'ku' => [['beranda', 'Beranda', 'grid'], ['nilai', 'Isi nilai', 'clipboard'], ['pengajuan', 'Pengajuan', 'upload'], ['riwayat', 'Riwayat', 'clock'], ['kpi', 'KPI unit', 'table']],
            'kd' => [['beranda', 'Beranda', 'grid'], ['persetujuan', 'Persetujuan', 'check'], ['nilai-kepala', 'Nilai Kepala Unit', 'clipboard'], ['dashboard', 'Dashboard divisi', 'chart'], ['kpi', 'KPI divisi', 'table']],
            'hc' => [['beranda', 'Beranda', 'grid'], ['rekap', 'Rekap penilaian', 'check'], ['dashboard', 'Dashboard', 'chart'], ['karyawan', 'Karyawan', 'users'], ['kpi', 'Master KPI', 'table'], ['penempatan', 'Penempatan KPI', 'refresh'], ['pengaturan', 'Pengaturan', 'settings']],
        };

        return collect($menu)->map(fn ($item) => ['id' => $item[0], 'label' => $item[1], 'icon' => $item[2], 'href' => $this->link($item[0])])->all();
    }

    public function unit(string $id): array
    {
        return collect($this->data['units'])->firstWhere('id', $id);
    }

    public function division(string $id): array
    {
        return collect($this->data['divisions'])->firstWhere('id', $id);
    }

    public function units(): array
    {
        return array_values(array_filter($this->data['units'], fn ($u) => $this->role === 'hc' || ($this->role === 'ku' ? $u['id'] === $this->actor['unit'] : $u['div'] === $this->actor['div'])));
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
        $clean = preg_replace('/^(dr\.|apt\.|ns\.)\s*/i', '', $name);

        return collect(explode(' ', explode(',', $clean)[0]))->filter()->take(2)->map(fn ($s) => mb_substr($s, 0, 1))->implode('');
    }

    public function assessment(string $id): array
    {
        return $this->data['state']['ev'][$id.'|'.$this->month] ?? ['vals' => [], 'status' => 'Belum', 'pos' => '', 'neg' => '', 'note' => '', 'log' => []];
    }

    public function decorate(array $e): array
    {
        $unit = $this->unit($e['unit']);
        $assessment = $this->assessment($e['id']);
        $template = $this->data['templates'][$e['tpl']];
        $total = 0;
        $complete = true;
        $items = [];
        foreach ($template['kpi'] as $index => $k) {
            $score = $assessment['vals'][$index] ?? null;
            if ($score === null) {
                $complete = false;
            }$result = $score === null ? null : $score * $k[6] / 100;
            $total += $result ?? 0;
            $previous = $this->data['state']['ev'][$e['id'].'|'.($this->month - 1)]['vals'][$index] ?? null;
            $items[] = ['pillar' => $k[0], 'name' => $k[1], 'numerator' => $k[2], 'denominator' => $k[3], 'formula' => $k[4], 'target' => $k[5], 'weight' => $k[6], 'score' => $score, 'result' => $result, 'previous' => $previous, 'delta' => $score === null || $previous === null ? null : $score - $previous];
        }
        $total = $complete ? $total : null;

        return $e + ['name' => $e['nama'], 'job' => $e['jab'], 'unitName' => $unit['nama'], 'divisionId' => $unit['div'], 'divisionName' => $this->division($unit['div'])['nama'], 'templateName' => $template['nama'], 'assessment' => $assessment, 'status' => $assessment['status'], 'items' => $items, 'total' => $total, 'category' => $this->category($total)];
    }

    public function people(bool $heads = false): array
    {
        $people = $heads ? array_map(fn ($u) => ['id' => 'H-'.$u['id'], 'nama' => $u['kepala'], 'nip' => '1975'.str_pad((string) (array_search($u, $this->data['units']) + 1), 3, '0', STR_PAD_LEFT), 'jab' => 'Kepala '.$u['nama'], 'unit' => $u['id'], 'tpl' => 'YJM'], $this->data['units']) : $this->data['employees'];
        $ids = array_column($this->units(), 'id');

        return array_values(array_map(fn ($e) => $this->decorate($e), array_filter($people, fn ($e) => in_array($e['unit'], $ids))));
    }

    public function category(?float $total): array
    {
        if ($total === null) {
            return ['label' => 'Belum lengkap', 'key' => 'empty'];
        }

        return $total >= 90 ? ['label' => 'Sangat Baik', 'key' => 'excellent'] : ($total >= 80 ? ['label' => 'Baik', 'key' => 'good'] : ($total >= 70 ? ['label' => 'Cukup', 'key' => 'fair'] : ['label' => 'Kurang', 'key' => 'poor']));
    }

    public function counts(): array
    {
        $rows = $this->people();
        $result = ['total' => count($rows), 'Belum' => 0, 'Draft' => 0, 'Diajukan' => 0, 'Dikembalikan' => 0, 'Disetujui' => 0, 'Final' => 0];
        foreach ($rows as $row) {
            $result[$row['status']]++;
        }

        return $result;
    }

    public function template(): array
    {
        return $this->data['templates'][request()->query('template', 'GP')] ?? $this->data['templates']['GP'];
    }

    public function view(): string
    {
        $shared = ['profil', 'panduan', 'notifikasi', 'tim', 'dashboard', 'kpi', 'aktivitas', 'akun', 'jabatan', 'struktur', 'impor'];
        if (in_array($this->page, $shared)) {
            return 'shared.'.$this->page;
        }

        return ['ku' => 'kepala-unit', 'kd' => 'kepala-divisi', 'hc' => 'super-hc'][$this->role].'.'.$this->page;
    }

    public function clientConfig(): array
    {
        return ['mode' => 'design-review', 'role' => $this->role, 'page' => $this->page, 'month' => $this->month, 'state' => $this->state, 'review' => $this->review, 'links' => collect(self::VIEWS[$this->role])->mapWithKeys(fn ($v) => [$v => $this->link($v)])->all(), 'fixture' => $this->data, 'people' => $this->people($this->page === 'nilai-kepala'), 'actor' => $this->actor];
    }
}
