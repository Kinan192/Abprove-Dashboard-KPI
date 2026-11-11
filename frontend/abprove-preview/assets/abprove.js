/* =========================================================
   KPI Kinerja — prototype satu halaman (data contoh)
   ========================================================= */
const BULAN = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
];
const BLN = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
];
const TAHUN = 2026,
    AKTIF = 10;
const RS = 'RS Awal Bros Botania';
const LOGO =
    'data:image/png;base64,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';

const DIVS = [
    {
        id: 'YM',
        nama: 'Divisi Pelayanan Medis',
        kepala: 'dr. Hendra Kusuma, Sp.PD',
    },
    {
        id: 'JM',
        nama: 'Divisi Penunjang Medis',
        kepala: 'dr. Ratna Dewi, Sp.Rad',
    },
];
const UNITS = [
    {
        id: 'UGD',
        div: 'YM',
        nama: 'Unit Gawat Darurat',
        kepala: 'dr. Agus Prasetyo',
    },
    {
        id: 'RI',
        div: 'YM',
        nama: 'Unit Rawat Inap',
        kepala: 'dr. Dewi Lestari',
    },
    {
        id: 'RAD',
        div: 'JM',
        nama: 'Unit Radiologi',
        kepala: 'dr. Rizky Hidayat, Sp.Rad',
    },
    {
        id: 'LAB',
        div: 'JM',
        nama: 'Unit Laboratorium PK',
        kepala: 'dr. Sari Puspita, Sp.PK',
    },
];
const ACC = {
    ku: {
        nama: 'dr. Agus Prasetyo',
        peran: 'Kepala Unit Gawat Darurat',
        unit: 'UGD',
        short: 'Kepala Unit',
    },
    kd: {
        nama: 'dr. Hendra Kusuma, Sp.PD',
        peran: 'Kepala Divisi Pelayanan Medis',
        div: 'YM',
        short: 'Kepala Divisi',
    },
    hc: { nama: 'Rina Marlina', peran: 'Super HC, SDM', short: 'Super HC' },
};
const ND = 'Numerator / Denominator x 100%';
const PILAR = [
    'Technical Care',
    'Access',
    'Coordination and Continuity',
    'Interpersonal Care',
    'Efficient',
];
let TPL = {
    GP: {
        nama: 'Pelayanan Medis - GP',
        kpi: [
            [
                'Efficient',
                'Kunjungan Pasien UGD',
                'Jumlah kunjungan pasien UGD',
                'Target kunjungan pasien UGD',
                ND,
                '95%',
                15,
            ],
            [
                'Technical Care',
                'Audit Rekam Medis',
                'Rekam medis lengkap',
                'Jumlah rekam medis diaudit',
                ND,
                '95%',
                15,
            ],
            [
                'Technical Care',
                'Sentinel, KTD, KTC yang terkait medik',
                'Jumlah kasus dalam 1 bulan',
                '',
                'Kasus',
                'Tidak ada',
                15,
            ],
            [
                'Technical Care',
                'Visite pasien baru rawat inap',
                'Pasien baru divisite sesuai waktu',
                'Jumlah pasien baru rawat inap',
                ND,
                '90%',
                10,
            ],
            [
                'Access',
                'Pencapaian Pelatihan',
                'Jumlah pelatihan yang diikuti',
                'Jumlah pelatihan yang direncanakan',
                ND,
                '100%',
                10,
            ],
            [
                'Coordination and Continuity',
                'Edukasi pasien terdokumentasi',
                'Pasien dengan edukasi terdokumentasi',
                'Jumlah pasien',
                ND,
                '100%',
                15,
            ],
            [
                'Coordination and Continuity',
                'Produktivitas Kerja',
                'Jumlah absensi karyawan',
                'Jumlah hari kerja x jumlah karyawan',
                ND,
                '1%',
                10,
            ],
            [
                'Interpersonal Care',
                'Implementasi Budaya Prima',
                'Jumlah complaint dalam 1 bulan',
                '',
                'Jumlah complaint',
                '0 complaint',
                10,
            ],
        ],
    },
    YJM: {
        nama: 'MJR Yanjangmed & Koord Yanmed',
        kpi: [
            [
                'Technical Care',
                'Penambahan Dokter Spesialis dan Subspesialis',
                'Penambahan dokter spesialis',
                'Jumlah dokter yang direncanakan',
                ND,
                '95%',
                15,
            ],
            [
                'Technical Care',
                'Implementasi POA COE Services',
                'POA COE Services terlaksana',
                'POA COE yang direncanakan',
                ND,
                '95%',
                15,
            ],
            [
                'Technical Care',
                'Utilisasi Alat vs Capacity',
                'Jumlah pemeriksaan tiap alat',
                'Kapasitas CT Scan 15-20/alat/hari',
                ND,
                '90%',
                10,
            ],
            [
                'Technical Care',
                'Utilisasi Kamar Operasi',
                'Jumlah operasi bulan berjalan',
                'Target utilisasi kamar operasi',
                ND,
                '85%',
                10,
            ],
            [
                'Technical Care',
                'Sentinel, KTD, KTC yang terkait medik',
                'Jumlah kasus dalam 1 bulan',
                '',
                'Kasus',
                'Tidak ada',
                5,
            ],
            [
                'Access',
                'Pencapaian Pelatihan',
                'Jumlah pelatihan yang diikuti',
                'Jumlah pelatihan yang direncanakan',
                ND,
                '100%',
                10,
            ],
            [
                'Coordination and Continuity',
                'Kesesuaian Discharge Planning',
                'Pasien dengan discharge planning sesuai',
                'Jumlah pasien rawat inap',
                ND,
                '90%',
                5,
            ],
            [
                'Coordination and Continuity',
                'Produktivitas Kerja',
                'Jumlah absensi karyawan',
                'Jumlah hari kerja x jumlah karyawan',
                ND,
                '1%',
                10,
            ],
            [
                'Interpersonal Care',
                'Implementasi Budaya Prima',
                'Jumlah complaint dalam 1 bulan',
                '',
                'Jumlah complaint',
                '0 complaint',
                10,
            ],
            [
                'Efficient',
                'Selisih pelayanan JKN setiap bulan',
                'Total klaim BPJS - Total billing RS',
                'Total billing RS',
                ND,
                '<20%',
                5,
            ],
            [
                'Efficient',
                'Menurunkan AR Ageing >90 hari',
                'AR ageing > 90 hari',
                'Total AR',
                ND,
                '<3%',
                5,
            ],
        ],
    },
};
const EMPS = [
    ['E01', 'dr. Budi Santoso', 'Dokter Umum', 'UGD', 'GP', 'Dikembalikan'],
    ['E02', 'dr. Ratna Sari', 'Dokter Umum', 'UGD', 'GP', 'Disetujui'],
    ['E03', 'dr. Kevin Sanjaya', 'Dokter Umum', 'UGD', 'GP', 'Belum'],
    ['E04', 'dr. Andi Saputra', 'Dokter Umum', 'UGD', 'GP', 'Draft'],
    ['E05', 'dr. Fajar Nugroho', 'Koord Yanmed', 'UGD', 'YJM', 'Diajukan'],
    ['E06', 'dr. Dimas Ardiansyah', 'Dokter Umum', 'RI', 'GP', 'Diajukan'],
    ['E07', 'dr. Eka Fitriani', 'Dokter Umum', 'RI', 'GP', 'Diajukan'],
    ['E08', 'dr. Citra Maharani', 'Dokter Umum', 'RI', 'GP', 'Disetujui'],
    ['E09', 'dr. Intan Kusuma', 'Koord Yanmed', 'RI', 'YJM', 'Belum'],
    ['E10', 'dr. Gita Permata', 'MJR Yanjangmed', 'RAD', 'YJM', 'Disetujui'],
    ['E11', 'dr. Hendra Wijaya', 'Dokter Umum', 'RAD', 'GP', 'Diajukan'],
    ['E12', 'dr. Joko Susilo', 'Koord Yanmed', 'RAD', 'YJM', 'Disetujui'],
    ['E13', 'dr. Kartika Sari', 'Dokter Umum', 'LAB', 'GP', 'Diajukan'],
    ['E14', 'dr. Lukman Hakim', 'Dokter Umum', 'LAB', 'GP', 'Belum'],
    ['E15', 'dr. Maya Anggraini', 'Koord Yanmed', 'LAB', 'YJM', 'Disetujui'],
].map(([id, nama, jab, unit, tpl, st]) => ({ id, nama, jab, unit, tpl, st }));

/* ---------- State ---------- */
const KEY = 'abprove-design-review-v1';
function seed() {
    let s = 11;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const ev = {};
    EMPS.forEach((e) => {
        const skill = 80 + rnd() * 15;
        for (let m = 0; m <= AKTIF; m++) {
            const vals = {};
            TPL[e.tpl].kpi.forEach(
                (k, i) =>
                    (vals[i] = Math.max(
                        10,
                        Math.min(
                            100,
                            Math.round((skill + (rnd() - 0.45) * 20) / 5) * 5,
                        ),
                    )),
            );
            const status =
                m < AKTIF - 1
                    ? 'Final'
                    : m === AKTIF - 1
                      ? rnd() < 0.7
                          ? 'Final'
                          : 'Disetujui'
                      : e.st;
            ev[e.id + '|' + m] = {
                vals: status === 'Belum' ? {} : vals,
                status,
                pos: '',
                neg: '',
                note: '',
                log: [],
            };
        }
    });
    ev['E01|10'].note =
        'Nilai Audit Rekam Medis belum sesuai hasil audit bulan ini. Ada 3 rekam medis yang belum lengkap.';
    ev['E01|10'].neg = 'Terlambat melengkapi resume medis 3 kali.';
    ev['E02|10'].pos =
        'Sigap menangani lonjakan pasien trauma saat jaga malam 14 November.';
    ev['E06|10'].pos =
        'Mengusulkan alur triase baru yang mempercepat penanganan pasien.';
    ev['E11|10'].neg = 'Terlambat hadir saat jadwal jaga 1 kali.';
    ev['E04|10'].vals = { 0: 85, 1: 90, 2: 100 };
    return {
        ev,
        act: [
            {
                t: '10 menit lalu',
                who: 'dr. Agus Prasetyo',
                txt: 'mengajukan penilaian dr. Fajar Nugroho',
            },
            {
                t: '1 jam lalu',
                who: 'dr. Hendra Kusuma',
                txt: 'mengembalikan penilaian dr. Budi Santoso',
            },
            {
                t: 'Kemarin',
                who: 'dr. Ratna Dewi',
                txt: 'menyetujui 3 penilaian Unit Radiologi',
            },
        ],
        set: {
            sb: 90,
            b: 80,
            c: 70,
            isi: '5 Desember 2026',
            setuju: '10 Desember 2026',
            tutup: '15 Desember 2026',
        },
    };
}
let S;
try {
    S = JSON.parse(localStorage.getItem(KEY));
} catch (e) {}
if (!S || !S.ev) S = seed();
const save = () => {
    try {
        localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {}
};
let UI = {
    navOpen: true,
    role: null,
    view: 'beranda',
    month: AKTIF,
    sel: null,
    tab: {},
    f: {},
};
try {
    const r = sessionStorage.getItem(KEY + '-role');
    if (r) UI.role = r;
} catch (e) {}
try {
    if (localStorage.getItem(KEY + '-nav') === '0') UI.navOpen = false;
} catch (e) {}

/* ---------- Helpers ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) =>
    String(s ?? '').replace(
        /[&<>"]/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
const unitOf = (id) => UNITS.find((u) => u.id === id),
    divOf = (id) => DIVS.find((d) => d.id === id),
    emp = (id) => EMPS.find((e) => e.id === id);
const ev = (id, m) =>
    S.ev[id + '|' + m] ||
    (S.ev[id + '|' + m] = {
        vals: {},
        status: 'Belum',
        pos: '',
        neg: '',
        note: '',
        log: [],
    });
function tplOf(e, m) {
    const a = S && S.asg && S.asg[e.id];
    const k = a && a[m];
    return k && TPL[k] ? k : e.tpl;
}
const kpis = (e, m) => TPL[tplOf(e, m == null ? UI.month : m)].kpi;
const fmt = (x, d = 2) =>
    x == null || isNaN(x)
        ? '–'
        : x.toLocaleString('id-ID', {
              minimumFractionDigits: d,
              maximumFractionDigits: d,
          });
const valid = (v) =>
    v !== '' && v != null && !isNaN(v) && +v >= 10 && +v <= 100;
function total(e, m) {
    const x = ev(e.id, m);
    let t = 0;
    const K = kpis(e, m);
    for (let i = 0; i < K.length; i++) {
        const v = x.vals[i];
        if (!valid(v)) return null;
        t += (v * K[i][6]) / 100;
    }
    return t;
}
function kat(s) {
    if (s == null) return { t: '–', c: '' };
    if (s >= S.set.sb) return { t: 'Sangat Baik', c: 'k-SB' };
    if (s >= S.set.b) return { t: 'Baik', c: 'k-B' };
    if (s >= S.set.c) return { t: 'Cukup', c: 'k-C' };
    return { t: 'Kurang', c: 'k-K' };
}
const avg = (a) => {
    a = a.filter((x) => x != null);
    return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
};
const ini = (n) =>
    n
        .replace(/^(dr\.|Ns\.)\s*/i, '')
        .split(/[\s,]+/)
        .filter((w) => /^[A-Za-z]/.test(w))
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
const st = (s) =>
    `<span class="st st-${s}">${s === 'Belum' ? 'Belum diisi' : s}</span>`;
const scope = () =>
    (UI.role === 'ku'
        ? EMPS.filter((e) => e.unit === ACC.ku.unit)
        : UI.role === 'kd'
          ? EMPS.filter((e) => unitOf(e.unit).div === ACC.kd.div)
          : EMPS
    ).filter((e) => aktifDi(e, UI.month));
const editable = (x) =>
    UI.month === AKTIF && ['Belum', 'Draft', 'Dikembalikan'].includes(x.status);
const now = () =>
    new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    });
function log(x, txt) {
    x.log.push({ t: `${now()}`, who: ACC[UI.role].nama, txt });
    S.act.unshift({ t: 'Baru saja', who: ACC[UI.role].nama, txt });
    S.act = S.act.slice(0, 20);
}

const IC = {
    home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
    edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
    out: 'M4 13h4l1.5 3h5L16 13h4M4 13l2.5-8h11L20 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
    list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
    check: 'M9 11l3 3 8-8M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11',
    chart: 'M4 20V11M10 20V5M16 20v-6M3 20h18',
    table: 'M3 5h18v14H3zM3 10h18M9 5v14',
    sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
    bell: 'M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
    help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.5M12 17h.01',
    logout: 'M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 16l-4-4 4-4M6 12h10',
    x: 'M6 6l12 12M18 6 6 18',
    menu: 'M4 7h16M4 12h16M4 17h16',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    chev: 'M6 9l6 6 6-6',
    book: 'M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 5v16M8 7h8',
    l: 'M15 6l-6 6 6 6',
    r: 'M9 6l6 6-6 6',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
    plus: 'M12 5v14M5 12h14',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
    lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    swap: 'M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4',
    ok: 'M5 12.5l4.5 4.5L19 7',
    warn: 'M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    cross: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M8 12h8',
};
const i = (n, cls = '') =>
    `<svg class="i ${cls}" viewBox="0 0 24 24"><path d="${IC[n]}"/></svg>`;

/* ---------- Navigasi ---------- */
const NAV = {
    ku: [
        ['beranda', 'Beranda', 'home'],
        ['nilai', 'Isi nilai', 'edit'],
        ['pengajuan', 'Pengajuan', 'out'],
        ['riwayat', 'Riwayat', 'clock'],
        ['kpi', 'KPI unit', 'list'],
    ],
    kd: [
        ['beranda', 'Beranda', 'home'],
        ['persetujuan', 'Persetujuan', 'check'],
        ['dashboard', 'Dashboard divisi', 'chart'],
        ['kpi', 'KPI divisi', 'list'],
    ],
    hc: [
        ['beranda', 'Beranda', 'home'],
        ['rekap', 'Rekap & finalisasi', 'check'],
        ['dashboard', 'Dashboard', 'chart'],
        ['karyawan', 'Karyawan', 'users'],
        ['kpi', 'Master KPI', 'table'],
        ['penempatan', 'Penempatan KPI', 'swap'],
        ['pengaturan', 'Pengaturan', 'sliders'],
    ],
};
function counts() {
    const m = AKTIF,
        es = scope(),
        c = (s) => es.filter((e) => ev(e.id, m).status === s).length;
    return (
        {
            ku: {
                pengajuan: [c('Dikembalikan'), 'amber'],
                nilai: [c('Belum') + c('Draft') + c('Dikembalikan')],
            },
            kd: { persetujuan: [c('Diajukan')] },
            hc: { rekap: [c('Disetujui')] },
        }[UI.role] || {}
    );
}
function route() {
    return { r: UI.role, v: UI.view || 'beranda' };
}
function setHash() {
    try {
        history.replaceState(
            null,
            '',
            '#' + (UI.role ? UI.role + '-' + (UI.view || 'beranda') : 'masuk'),
        );
    } catch (e) {}
}
function go(view) {
    UI.view = view;
    closeAll();
    render(true);
    try {
        window.scrollTo(0, 0);
    } catch (e) {}
    setHash();
}

const TITLES = {
    karyawan: 'Data karyawan',
    penempatan: 'Penempatan KPI',
    cari: 'Cari',
    profil: 'Profil',
    panduan: 'Panduan',
    beranda: 'Beranda',
    nilai: 'Isi nilai',
    pengajuan: 'Pengajuan',
    riwayat: 'Riwayat penilaian',
    kpi: { ku: 'KPI unit', kd: 'KPI divisi', hc: 'Master KPI' },
    persetujuan: 'Persetujuan',
    dashboard: { kd: 'Dashboard divisi', hc: 'Dashboard' },
    rekap: 'Rekap & finalisasi',
    pengaturan: 'Pengaturan',
};
const SUBS = {
    ku: () => unitOf(ACC.ku.unit).nama,
    kd: () => divOf(ACC.kd.div).nama,
    hc: () => 'Seluruh rumah sakit',
};

/* ---- Logo ABprove ---- */
const ABI = (w, inv) =>
    `<svg class="abi" viewBox="0 0 48 48" width="${w}" height="${w}" role="img" aria-label="ABprove"><rect width="48" height="48" rx="13" fill="${inv ? '#FFFFFF' : '#064E3B'}"/><path d="M12.5 37 L24 10.5 L35.5 37" fill="none" stroke="${inv ? '#064E3B' : '#FFFFFF'}" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 26.5 L21.5 32 L37.5 17" fill="none" stroke="#DC2626" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ABW = (fs, dark) => {
    const r = dark ? '#D1EADF' : 'var(--ink)';
    return `<span class="abw" aria-label="ABprove" style="font-size:${fs}px;color:${dark ? '#FFFFFF' : 'var(--ab-g)'}">AB<span style="color:${r}">pro</span><svg viewBox="0 0 24 22" aria-hidden="true"><path d="M2.5 11 L9 19 L21.5 2.5" fill="none" stroke="${dark ? '#FF6B6B' : '#DC2626'}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><span style="color:${r}">e</span></span>`;
};
function topBrand() {
    return `${ABI(26)}${ABW(18)}`;
}
/* ---- Menu bawah (HP) ---- */
const BNAV = {
    ku: ['beranda', 'nilai', 'pengajuan', 'riwayat'],
    kd: ['beranda', 'persetujuan', 'dashboard', 'kpi'],
    hc: ['beranda', 'rekap', 'dashboard', 'karyawan'],
};
const BSHORT = {
    'Rekap & finalisasi': 'Rekap',
    'Dashboard divisi': 'Dashboard',
    'KPI divisi': 'KPI',
};
function bnav(view, c) {
    const keys = BNAV[UI.role] || [],
        items = NAV[UI.role].filter((n) => keys.includes(n[0])),
        more = !keys.includes(view);
    return `<nav class="bnav" aria-label="Menu cepat">${items
        .map(([k, t, ic]) => {
            const n = c[k];
            return `<a href="#" data-act="go" data-go="${k}" class="${k === view ? 'on' : ''}"${k === view ? ' aria-current="page"' : ''}>${i(ic)}<span>${BSHORT[t] || t}</span>${n && n[0] ? `<em>${n[0]}</em>` : ''}</a>`;
        })
        .join(
            '',
        )}<a href="#" data-act="burger" class="${more ? 'on' : ''}" aria-label="Menu lainnya">${i('menu')}<span>Lainnya</span></a></nav>`;
}
function shell(view) {
    const c = counts(),
        nav = NAV[UI.role]
            .map(([k, t, ic]) => {
                const n = c[k];
                return `<a href="#" data-act="go" data-go="${k}" title="${t}" class="${k === view ? 'on' : ''}">${i(ic)}<span class="lbl">${t}</span>${n && n[0] ? `<span class="count ${n[1] || ''}">${n[0]}</span>` : ''}</a>`;
            })
            .join('');
    const nav2 = [
        ['panduan', 'Panduan', 'book'],
        ['profil', 'Profil', 'user'],
    ]
        .map(
            ([k, t, ic]) =>
                `<a href="#" data-act="go" data-go="${k}" title="${t}" class="${k === view ? 'on' : ''}">${i(ic)}<span class="lbl">${t}</span></a>`,
        )
        .join('');
    const t = TITLES[view];
    const title = typeof t === 'object' ? t[UI.role] : t;
    const nUnread = unread();
    return `<div class="app ${UI.navOpen ? '' : 'collapsed'}">
   <nav class="side" id="side" aria-label="Menu utama">
     <div class="side-head"><div class="brand-mini" aria-hidden="true">${ABI(40, true)}</div><div class="brand ab-brand">${ABI(34, true)}<div>${ABW(23, true)}<span class="ab-sub">${RS}</span></div></div></div>
     <div class="nav">${nav}</div><div class="nav nav2">${nav2}</div>
   </nav>
   <div class="main"><div class="sheet">
     ${bnav(view, c)}<div class="top"><button class="iconbtn burger" data-act="burger" aria-label="Ringkas atau lebarkan menu" aria-controls="side" aria-expanded="${UI.navOpen}">${i('menu')}</button><div><h1>${title}</h1><div class="sub">${SUBS[UI.role]()}</div></div><div class="sp"></div>
       <button class="qsearch ${view === 'cari' ? 'on' : ''}" data-act="palette" aria-label="Cari halaman atau karyawan">${i('search')}<span>Cari halaman, nama, atau NIP</span><kbd>Ctrl K</kbd></button><button class="iconbtn round msearch" data-act="palette" aria-label="Cari">${i('search')}</button><button class="period" data-act="period" aria-haspopup="true" aria-label="Periode penilaian ${BULAN[UI.month]} ${TAHUN}"><span class="pw">Penilaian </span><span class="pfull">${BULAN[UI.month]} ${TAHUN}</span><span class="pshort">${BULAN[UI.month].slice(0, 3)}</span>${i('chev')}</button>
       <button class="iconbtn round" data-act="go" data-go="panduan" aria-label="Panduan" title="Panduan">${i('help')}</button>
       <button class="iconbtn round" data-act="notifPop" aria-label="Notifikasi${nUnread ? ', ' + nUnread + ' belum dibaca' : ''}">${i('bell')}${nUnread ? `<span class="badge">${nUnread}</span>` : ''}</button>
       <button class="acct" data-act="acct" aria-label="Menu akun">${avatar()}<span><b>${esc(prof().nama.replace(/,.*$/, ''))}</b><small>${ACC[UI.role].short}</small></span>${i('chev')}</button>
     </div>
     <div id="content"></div>
   </div></div></div>`;
}

/* ---------- Render ---------- */
let lastShell = '';
function render(anim) {
    const { r, v } = route();
    if (!UI.role) {
        $('#root').innerHTML = viewLogin();
        bindLogin();
        return;
    }
    const V = VIEWS[UI.role][v] || VIEWS[UI.role].beranda;
    const vname = VIEWS[UI.role][v] ? v : 'beranda';
    $('#root').innerHTML = shell(vname);
    const c = $('#content');
    c.innerHTML = V();
    if (anim !== false) c.classList.add('view-in');
    after.forEach((f) => f());
    after = [];
    {
        const pl = document.querySelector('.split .plist'),
            on = pl && pl.querySelector('.pitem.on');
        if (on && innerWidth <= 760 && pl.scrollWidth > pl.clientWidth)
            pl.scrollLeft =
                on.offsetLeft -
                pl.offsetLeft -
                (pl.clientWidth - on.offsetWidth) / 2;
    }
}
let after = [];
const later = (f) => after.push(f);

function refresh() {
    const y = window.scrollY;
    render(false);
    window.scrollTo(0, y);
}

/* ---------- Overlay ---------- */
function drawer(html, narrow) {
    const d = $('#drawer');
    d.className = 'drawer' + (narrow ? ' narrow' : '');
    d.innerHTML = html;
    requestAnimationFrame(() => {
        d.classList.add('on');
        $('#scrim').classList.add('on');
    });
    d.setAttribute('aria-hidden', 'false');
}
function closeAll() {
    const mo = document.querySelector('.app.mob-open');
    if (mo) mo.classList.remove('mob-open');
    $('#drawer').classList.remove('on');
    $('#modal').classList.remove('on');
    $('#menu').classList.remove('on');
    $('#scrim').classList.remove('on');
    $('#drawer').setAttribute('aria-hidden', 'true');
}
function modal(html) {
    $('#modal').classList.remove('wide');
    $('#modal').innerHTML = html;
    $('#modal').classList.add('on');
    $('#scrim').classList.add('on');
}
function toast(t) {
    const el = document.createElement('div');
    el.className = 'toast';
    const message = /pengingat dikirim/i.test(t)
        ? 'Simulasi pengingat dicatat di browser.'
        : 'Preview lokal: ' + t;
    el.innerHTML = i('ok') + esc(message);
    $('#toasts').appendChild(el);
    setTimeout(() => {
        el.style.transition = '.2s';
        el.style.opacity = 0;
        setTimeout(() => el.remove(), 220);
    }, 2400);
}
$('#scrim').onclick = closeAll;
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
});

/* ---------- Login ---------- */
/* ---------- Halaman masuk ---------- */
const pwDefault = (n) => {
    const w =
        n
            .replace(/^(dr\.|apt\.|ns\.)\s*/i, '')
            .split(',')[0]
            .trim()
            .split(/\s+/)[0] || 'User';
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() + '#2026';
};
let LG = { v: 'masuk', tries: 0, lock: 0, err: '', fe: {}, id: null, sent: '' };
function loginAccounts() {
    const slug = (n) =>
        n
            .replace(/^(dr\.|apt\.|ns\.)\s*/i, '')
            .split(',')[0]
            .trim()
            .toLowerCase()
            .replace(/[^a-z\s]/g, '')
            .trim()
            .split(/\s+/)
            .join('.') + '@rs.co.id';
    const L = [
        {
            key: 'hc',
            role: 'hc',
            nama: ACC.hc.nama,
            peran: 'Super HC, SDM',
            email: 'rina.marlina@rs.co.id',
            nip: '1980001',
            pw: pwDefault(ACC.hc.nama),
        },
    ];
    DIVS.forEach((d, k) =>
        L.push({
            key: 'kd:' + d.id,
            role: 'kd',
            div: d.id,
            nama: d.kepala,
            peran: 'Kepala ' + d.nama,
            email: slug(d.kepala),
            nip: '197800' + (k + 1),
            pw: pwDefault(d.kepala),
        }),
    );
    UNITS.forEach((u, k) =>
        L.push({
            key: 'ku:' + u.id,
            role: 'ku',
            unit: u.id,
            nama: u.kepala,
            peran: 'Kepala ' + u.nama,
            email: (u.email || slug(u.kepala)).toLowerCase(),
            nip: u.nip || '1975' + String(k + 1).padStart(3, '0'),
            pw: u.pw || pwDefault(u.kepala),
        }),
    );
    return L;
}
function applyAcc(a) {
    if (!a) return;
    if (a.role === 'ku' && unitOf(a.unit)) {
        ACC.ku.unit = a.unit;
        ACC.ku.nama = unitOf(a.unit).kepala;
    } else if (a.role === 'kd' && divOf(a.div)) {
        ACC.kd.div = a.div;
        ACC.kd.nama = divOf(a.div).kepala;
    }
}
const maskMail = (m) => {
    const [u, d] = m.split('@');
    return u[0] + '•'.repeat(Math.max(2, u.length - 2)) + u.slice(-1) + '@' + d;
};
function lgRemembered() {
    try {
        return localStorage.getItem(KEY + '-rem') || '';
    } catch (e) {
        return '';
    }
}
function viewLogin() {
    const rem = lgRemembered(),
        A_ = loginAccounts(),
        locked = LG.lock > Date.now();
    const fe = (k) =>
        LG.fe[k] ? `<div class="lg-ferr" id="fe_${k}">${LG.fe[k]}</div>` : '';
    const masuk = `<form id="lf" novalidate onsubmit="return false">
     <div class="ab-login lg-logo">${ABI(40)}${ABW(28)}</div>
     <h2 class="lg-h lg-h1">Masuk</h2>
     ${LG.err ? `<div class="lg-alert" role="alert">${i('warn')}<span>${LG.err}</span></div>` : ''}
     <label class="lg-l" for="em">Email atau NIP</label>
     <div class="lg-in ${LG.fe.em ? 'err' : ''}">${i('mail')}<input id="em" autocomplete="username" placeholder="nama@rs.co.id atau NIP" value="${esc(LG.id != null ? LG.id : rem)}"></div>${fe('em')}
     <label class="lg-l lg-l2" for="pw">Kata sandi</label>
     <div class="lg-in ${LG.fe.pw ? 'err' : ''}">${i('lock')}<input id="pw" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi"><button type="button" class="lg-eye" id="lgEye" aria-label="Tampilkan kata sandi" aria-pressed="false">${i('eye')}</button></div>${fe('pw')}
     <div class="lg-opts"><label class="chk lg-rem"><input type="checkbox" id="lgRem" ${rem ? 'checked' : ''}>Ingat saya</label><button type="button" class="lg-link" id="lgLupa">Lupa kata sandi?</button></div>
     <button class="btn pri lg-btn" type="button" id="lbtn" ${locked ? 'disabled' : ''}>${locked ? `Coba lagi dalam <span id="lgCd">${Math.ceil((LG.lock - Date.now()) / 1000)}</span> detik` : 'Masuk'}</button>
   </form>`;
    const lupa = `<form id="ff" novalidate onsubmit="return false">
     <button type="button" class="link small lg-back" id="lgBack">${i('l')}Kembali ke halaman masuk</button>
     <h2 class="lg-h">Atur ulang kata sandi</h2>
     <p class="muted lg-p">Masukkan email kantor atau NIP. Tautan untuk membuat kata sandi baru dikirim ke email yang terdaftar.</p>
     <label class="lg-l" for="fem">Email atau NIP</label>
     <div class="lg-in ${LG.fe.fem ? 'err' : ''}">${i('user')}<input id="fem" autocomplete="username" placeholder="nama@rs.co.id atau NIP" value="${esc(LG.id || rem)}"></div>${fe('fem')}
     <button class="btn pri lg-btn" type="button" id="fbtn">Kirim tautan</button>
   </form>`;
    const sent = `<div class="lg-sent">
     <span class="lg-ok">${i('ok')}</span>
     <h2 class="lg-h">Periksa email kamu</h2>
     <p class="muted lg-p">Tautan untuk membuat kata sandi baru sudah dikirim ke <b style="color:var(--ink)">${esc(LG.sent)}</b>. Tautan berlaku 15 menit.</p>
     <p class="small muted" style="margin:0 0 22px">Tidak menerima email? Periksa folder spam, atau hubungi tim SDM.</p>
     <button class="btn pri lg-btn" type="button" id="lgBack">Kembali ke halaman masuk</button>
   </div>`;
    return `<div class="login">
   <div class="left lg-left"><svg class="lg-rings" viewBox="0 0 760 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="lgGp" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M56 0H0V56" fill="none" stroke="#fff" stroke-width="1"/></pattern><radialGradient id="lgGf" cx="70%" cy="35%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="lgGm"><rect width="760" height="900" fill="url(#lgGf)"/></mask></defs><g mask="url(#lgGm)"><rect width="760" height="900" fill="url(#lgGp)" opacity=".13"/><rect x="504" y="168" width="56" height="56" fill="#fff" opacity="0.1"/><rect x="560" y="280" width="56" height="56" fill="#fff" opacity="0.07"/><rect x="392" y="224" width="56" height="56" fill="#fff" opacity="0.06"/><rect x="616" y="112" width="56" height="56" fill="#fff" opacity="0.08"/><rect x="448" y="392" width="56" height="56" fill="#fff" opacity="0.05"/><rect x="672" y="336" width="56" height="56" fill="#fff" opacity="0.06"/></g></svg>
     <div class="lg-mark">${ABI(54, true)}<div>${ABW(26, true)}<span>${esc(RS.toUpperCase())}</span></div></div>
     <div class="lg-copy">© ${RS}</div></div>
   <div class="right"><div class="lg-box lg-card view-in">${LG.v === 'lupa' ? lupa : LG.v === 'terkirim' ? sent : masuk}</div>
    <div class="lg-foot">© ${RS}</div></div></div>`;
}
function lgFind(id) {
    id = (id || '').trim().toLowerCase();
    if (!id) return null;
    return (
        loginAccounts().find(
            (a) =>
                a.email === id || a.nip === id || a.email.split('@')[0] === id,
        ) || null
    );
}
function lgRender(focus) {
    $('#root').innerHTML = viewLogin();
    bindLogin();
    if (focus) {
        const f = $(focus);
        if (f) {
            f.focus();
            if (f.select && focus !== '#pw')
                try {
                    f.setSelectionRange(f.value.length, f.value.length);
                } catch (e) {}
        }
    }
}
let lgTimer = null;
function bindLogin() {
    clearInterval(lgTimer);
    if (LG.lock > Date.now())
        lgTimer = setInterval(() => {
            const s = Math.ceil((LG.lock - Date.now()) / 1000);
            if (s <= 0) {
                clearInterval(lgTimer);
                LG.err = '';
                lgRender('#pw');
                return;
            }
            const c = $('#lgCd');
            if (c) c.textContent = s;
        }, 500);
    const back = $('#lgBack');
    if (back)
        back.onclick = () => {
            LG.v = 'masuk';
            LG.fe = {};
            LG.err = '';
            lgRender('#pw');
        };
    if (LG.v === 'lupa') {
        const send = () => {
            const v = $('#fem').value;
            LG.id = v;
            LG.fe = {};
            if (!v.trim()) {
                LG.fe.fem = 'Isi email atau NIP';
                return lgRender('#fem');
            }
            const a = lgFind(v);
            if (!a) {
                LG.fe.fem =
                    'Email atau NIP ini tidak terdaftar. Hubungi tim SDM.';
                return lgRender('#fem');
            }
            const b = $('#fbtn');
            b.disabled = true;
            b.innerHTML = `<span class="spin"></span>Mengirim…`;
            setTimeout(() => {
                LG.v = 'terkirim';
                LG.sent = maskMail(a.email);
                lgRender();
            }, 600);
        };
        $('#fbtn').onclick = send;
        $('#ff').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                send();
            }
        });
        return;
    }
    if (LG.v !== 'masuk') return;
    const em = $('#em'),
        pw = $('#pw');
    [em, pw].forEach((x) =>
        x.addEventListener('input', () => {
            x.parentElement.classList.remove('err');
            const f = $('#fe_' + x.id);
            if (f) f.remove();
        }),
    );
    $('#lgEye').onclick = (ev_) => {
        const b = ev_.currentTarget,
            show = pw.type === 'password';
        pw.type = show ? 'text' : 'password';
        b.setAttribute('aria-pressed', String(show));
        b.setAttribute(
            'aria-label',
            show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi',
        );
        b.classList.toggle('on', show);
        pw.focus();
    };
    $('#lgLupa').onclick = () => {
        LG.id = em.value;
        LG.v = 'lupa';
        LG.fe = {};
        LG.err = '';
        lgRender('#fem');
    };
    const doLogin = () => {
        if (LG.lock > Date.now()) return;
        const id = em.value,
            p = pw.value;
        LG.id = id;
        LG.fe = {};
        LG.err = '';
        if (!id.trim()) LG.fe.em = 'Isi email atau NIP';
        if (!p) LG.fe.pw = 'Isi kata sandi';
        if (LG.fe.em || LG.fe.pw) return lgRender(LG.fe.em ? '#em' : '#pw');
        const b = $('#lbtn');
        b.disabled = true;
        b.innerHTML = `<span class="spin"></span>Memeriksa…`;
        setTimeout(() => {
            const a = lgFind(id);
            if (!a || p !== a.pw) {
                LG.tries++;
                if (LG.tries >= 5) {
                    LG.lock = Date.now() + 30000;
                    LG.tries = 0;
                    LG.err =
                        'Terlalu banyak percobaan yang gagal. Demi keamanan, coba lagi dalam 30 detik.';
                } else
                    LG.err = `Email/NIP atau kata sandi salah. Sisa ${5 - LG.tries} kali percobaan.`;
                return lgRender('#pw');
            }
            try {
                if ($('#lgRem').checked)
                    localStorage.setItem(KEY + '-rem', id.trim());
                else localStorage.removeItem(KEY + '-rem');
            } catch (x) {}
            try {
                sessionStorage.setItem(KEY + '-role', a.role);
                sessionStorage.setItem(KEY + '-acc', JSON.stringify(a));
            } catch (x) {}
            applyAcc(a);
            LG = {
                v: 'masuk',
                tries: 0,
                lock: 0,
                err: '',
                fe: {},
                id: null,
                sent: '',
            };
            clearInterval(lgTimer);
            UI.role = a.role;
            UI.month = AKTIF;
            UI.sel = null;
            UI.tab.gd = null;
            go('beranda');
            toast(`Selamat datang, ${a.nama}`);
        }, 450);
    };
    $('#lbtn').onclick = doLogin;
    $('#lf').addEventListener('keydown', (e) => {
        if (
            e.key === 'Enter' &&
            e.target.tagName === 'INPUT' &&
            e.target.type !== 'checkbox'
        ) {
            e.preventDefault();
            doLogin();
        }
    });
    if (!document.activeElement || document.activeElement === document.body) {
        const f = em.value ? pw : em;
        setTimeout(() => f.focus(), 50);
    }
}

/* ---------- Notifikasi & bantuan ---------- */
function notifs() {
    const m = AKTIF,
        es = scope(),
        n = [];
    if (UI.role === 'ku') {
        es.filter((e) => ev(e.id, m).status === 'Dikembalikan').forEach((e) =>
            n.push({
                c: 'amber',
                ic: 'warn',
                t: `Penilaian ${e.nama} dikembalikan`,
                s: ev(e.id, m).note,
                go: 'nilai',
                id: e.id,
            }),
        );
        const b = es.filter((e) =>
            ['Belum', 'Draft'].includes(ev(e.id, m).status),
        ).length;
        if (b)
            n.push({
                c: 'blue',
                ic: 'clock',
                t: `${b} karyawan belum diajukan`,
                s: `Batas pengisian ${S.set.isi}`,
                go: 'nilai',
            });
    }
    if (UI.role === 'kd') {
        const d = es.filter((e) => ev(e.id, m).status === 'Diajukan').length;
        if (d)
            n.push({
                c: 'blue',
                ic: 'check',
                t: `${d} penilaian menunggu persetujuan kamu`,
                s: `Batas persetujuan ${S.set.setuju}`,
                go: 'persetujuan',
            });
    }
    if (UI.role === 'hc') {
        const d = es.filter((e) => ev(e.id, m).status === 'Disetujui').length;
        if (d)
            n.push({
                c: 'green',
                ic: 'lock',
                t: `${d} penilaian siap difinalkan`,
                s: `Siklus ditutup ${S.set.tutup}`,
                go: 'rekap',
            });
        const b = es.filter((e) => ev(e.id, m).status === 'Belum').length;
        if (b)
            n.push({
                c: 'amber',
                ic: 'warn',
                t: `${b} karyawan belum dinilai`,
                s: 'Kirim pengingat dari Beranda',
                go: 'beranda',
            });
    }
    return n;
}
const tone = {
    amber: ['var(--amber-s)', 'var(--amber)'],
    blue: ['var(--blue-s)', 'var(--blue)'],
    green: ['var(--green-s)', 'var(--green-m)'],
};
function openNotif() {
    const n = notifs();
    drawer(
        `<div class="dhead"><h2 class="grow">Notifikasi</h2><button class="iconbtn" data-act="close">${i('x')}</button></div>
   <div class="dbody">${n.length ? `<div class="feed">${n.map((x) => `<div style="cursor:pointer" data-act="notifGo" data-go="${x.go}" data-id="${x.id || ''}"><span class="ic" style="background:${tone[x.c][0]};color:${tone[x.c][1]}">${i(x.ic)}</span><div><b style="font-weight:600">${esc(x.t)}</b><div class="small muted">${esc(x.s)}</div></div></div>`).join('')}</div>` : `<div class="empty">Tidak ada yang perlu ditindaklanjuti.</div>`}</div>`,
        true,
    );
}
function openHelp() {
    drawer(
        `<div class="dhead"><h2 class="grow">Cara pengisian nilai</h2><button class="iconbtn" data-act="close">${i('x')}</button></div>
  <div class="dbody">
   <p style="margin-top:0">Setiap KPI diberi nilai 10 sampai 100. Nilai itu langsung dikali bobot KPI, lalu semuanya dijumlahkan menjadi total nilai bulan ini.</p>
   <table style="margin:16px 0"><tr><th>KPI</th><th class="r">Nilai</th><th class="r">Bobot</th><th class="r">Hasil</th></tr>
    <tr><td>Kunjungan Pasien UGD</td><td class="r">90</td><td class="r">15%</td><td class="r">13,50</td></tr>
    <tr><td>Pencapaian Pelatihan</td><td class="r">80</td><td class="r">10%</td><td class="r">8,00</td></tr>
    <tr><td>Implementasi Budaya Prima</td><td class="r">100</td><td class="r">10%</td><td class="r">10,00</td></tr></table>
   <h2 style="margin-top:24px">Alur penilaian</h2>
   <div class="steps" style="margin-top:14px"><div class="done"><b>Kepala Unit</b>memberi nilai</div><div class="done"><b>Kepala Divisi</b>menyetujui</div><div class="done"><b>SDM</b>memfinalkan</div></div>
   <h2 style="margin-top:24px">Kategori nilai</h2>
   <p class="ink2">Sangat Baik ${S.set.sb} ke atas, Baik ${S.set.b} ke atas, Cukup ${S.set.c} ke atas, di bawahnya Kurang.</p>
   <p class="ink2">Temuan positif dan temuan negatif diisi jika ada, sebagai catatan pendukung nilai.</p>
  </div>`,
        true,
    );
}
function openMe(btn) {
    openAcct(btn);
}

/* =========================================================
   VIEWS
   ========================================================= */
const greet = () => {
    const h = new Date().getHours();
    return h < 11
        ? 'Selamat pagi'
        : h < 15
          ? 'Selamat siang'
          : h < 18
            ? 'Selamat sore'
            : 'Selamat malam';
};
const firstName = (n) => n.replace(/,.*$/, '').split(' ').slice(0, 2).join(' ');
function personRow(e, m, extra = '') {
    const x = ev(e.id, m),
        t = total(e, m),
        k = kat(t);
    return `<td><div class="who"><span class="av sm">${ini(e.nama)}</span><div><b>${e.nama}</b><span>${e.jab}, ${UI.role === 'ku' ? 'NIP ' + e.nip : unitOf(e.unit).nama}</span></div></div></td>${extra}<td>${st(x.status)}</td><td class="r num"><b>${fmt(t)}</b></td><td class="${k.c}" style="font-weight:600">${k.t}</td>`;
}

/* ----- Kepala Unit ----- */
function kuNilai() {
    const m = UI.month,
        es = scope();
    const q = (UI.f.q || '').toLowerCase();
    if (!UI.sel || !es.find((e) => e.id === UI.sel))
        UI.sel = (
            es.find((e) =>
                ['Dikembalikan', 'Belum', 'Draft'].includes(ev(e.id, m).status),
            ) || es[0]
        ).id;
    const filt = UI.f.pf || 'semua';
    const list = es.filter(
        (e) =>
            (!q || e.nama.toLowerCase().includes(q) || e.nip.includes(q)) &&
            (filt === 'semua' ||
                (filt === 'perlu' &&
                    ['Belum', 'Draft', 'Dikembalikan'].includes(
                        ev(e.id, m).status,
                    ))),
    );
    later(() => bindSheet());
    return `<div class="split">
   <div class="plist">
     <div class="search">${i('search')}<input class="f" placeholder="Cari nama atau NIP" id="pq" value="${esc(UI.f.q || '')}"></div>
     <div class="seg" style="margin-bottom:10px;width:100%"><button style="flex:1" class="${filt === 'semua' ? 'on' : ''}" data-act="pf" data-v="semua">Semua</button><button style="flex:1" class="${filt === 'perlu' ? 'on' : ''}" data-act="pf" data-v="perlu">Perlu diisi</button></div>
     ${
         list
             .map((e) => {
                 const x = ev(e.id, m);
                 return `<button class="pitem ${e.id === UI.sel ? 'on' : ''}" data-act="sel" data-id="${e.id}"><span class="av sm">${ini(e.nama)}</span><span style="min-width:0"><span class="n" style="display:block">${e.nama}</span><span class="j">${x.status === 'Belum' ? 'Belum diisi' : x.status}</span></span>${st(x.status)}</button>`;
             })
             .join('') || `<div class="empty small">Tidak ada karyawan</div>`
     }
   </div>
   <div class="pane" id="pane">${sheetHTML(emp(UI.sel), m, 'ku')}</div></div>`;
}
function sheetHTML(e, m, mode) {
    const x = ev(e.id, m),
        K = kpis(e, m),
        can = mode === 'ku' && editable(x),
        t = total(e, m);
    const es = scope(),
        idx = es.findIndex((z) => z.id === e.id);
    const prev = m > 0 ? ev(e.id, m - 1) : null;
    const rows = K.map((k, j) => {
        const v = x.vals[j];
        const sk = valid(v) ? (v * k[6]) / 100 : null;
        const pv = prev && valid(prev.vals[j]) ? prev.vals[j] : null;
        const d = pv != null && valid(v) ? v - pv : null;
        return `<tr><td class="muted small c" style="width:32px">${j + 1}</td><td class="kpi"><b>${esc(k[1])}</b><span>${esc(k[0])}. Target ${esc(k[5])}</span></td><td class="r num" style="width:64px">${k[6]}%</td>
    <td class="c" style="width:96px">${can ? `<input class="score-in num" inputmode="numeric" data-j="${j}" value="${valid(v) ? v : ''}" placeholder="–" aria-label="Nilai ${esc(k[1])}">` : `<span class="score-ro num">${valid(v) ? v : '–'}</span>`}</td>
    ${mode !== 'ku' ? `<td class="r small num" style="width:70px;color:${d == null || d === 0 ? 'var(--mute)' : d > 0 ? 'var(--green-m)' : 'var(--amber)'}">${d == null ? '' : d === 0 ? 'sama' : (d > 0 ? '+' : '') + d}</td>` : ''}
    <td class="r num" style="width:80px;font-weight:600" data-s="${j}">${fmt(sk)}</td></tr>`;
    }).join('');
    const kk = kat(t);
    return `<div class="pane-head"><span class="av" style="width:44px;height:44px;font-size:14px">${ini(e.nama)}</span>
    <div class="grow"><h2>${e.nama}</h2><div class="muted">${e.jab}, NIP ${e.nip}, ${unitOf(e.unit).nama}. Template ${TPL[tplOf(e, m)].nama}</div></div>
    <div style="text-align:right">${st(x.status)}<div><button class="btn sm ghost xbtn" data-act="exportOpen" data-preset="e:${e.id}" title="Export lembar nilai ${TAHUN} ke Excel">${i('dl')}Excel</button></div>${mode === 'ku' && es.length > 1 ? `<div class="row" style="gap:2px;margin-top:6px;justify-content:flex-end"><button class="iconbtn" style="width:30px;height:30px" data-act="step" data-d="-1" ${idx <= 0 ? 'disabled' : ''}>${i('l')}</button><span class="small muted">${idx + 1} dari ${es.length}</span><button class="iconbtn" style="width:30px;height:30px" data-act="step" data-d="1" ${idx >= es.length - 1 ? 'disabled' : ''}>${i('r')}</button></div>` : ''}</div></div>
   ${x.status === 'Dikembalikan' && x.note ? `<div class="notice" style="margin-bottom:18px">${i('warn')}<div><b>Catatan dari Kepala Divisi</b><div>${esc(x.note)} <span style="opacity:.75">(${lastChange(x)} WIB)</span></div></div></div>` : ''}
   ${m > 0 && tplOf(e, m) !== tplOf(e, m - 1) ? `<div class="info" style="margin-bottom:16px">${i('swap')}<div><b>KPI berubah mulai ${BULAN[m]}</b><div>Template ${esc(TPL[tplOf(e, m)].nama)}, sebelumnya ${esc(TPL[tplOf(e, m - 1)].nama)}.</div></div></div>` : ''}${can ? `<p class="muted small" style="margin:0 0 6px">Isi nilai 10–100. Tekan Enter untuk pindah ke KPI berikutnya.</p>` : ''}
   <table class="ledger"><tr><th></th><th>KPI</th><th class="r">Bobot</th><th class="c">Nilai</th>${mode !== 'ku' ? `<th class="r">vs ${m > 0 ? BLN[m - 1] : '–'}</th>` : ''}<th class="r">Hasil</th></tr>${rows}</table><p class="small muted" style="margin:8px 4px 0">Total bobot ${K.reduce((a, k) => a + (+k[6] || 0), 0)}%. <span id="filled">${K.filter((k, j) => valid(x.vals[j])).length}</span> dari ${K.length} KPI terisi. Hasil = nilai × bobot.</p>
   <div class="total"><span class="lbl">Total nilai</span><span class="big num" id="tot">${fmt(t)}</span><b id="kat" class="${kk.c}" style="min-width:86px">${kk.t}</b></div>
   <div class="temuan">
     <div><label class="pos">Temuan positif</label>${can ? `<textarea class="f" id="tpos" placeholder="Pujian, pencapaian, ide kreatif, atau inisiatif (jika ada)">${esc(x.pos)}</textarea>` : `<div class="ro">${esc(x.pos) || 'Tidak ada'}</div>`}</div>
     <div><label class="neg">Temuan negatif</label>${can ? `<textarea class="f" id="tneg" placeholder="Kesalahan, kelalaian, atau masalah kedisiplinan (jika ada)">${esc(x.neg)}</textarea>` : `<div class="ro">${esc(x.neg) || 'Tidak ada'}</div>`}</div>
   </div>
   ${
       mode === 'ku'
           ? `<div class="actionbar">${
                 can
                     ? `<span class="small muted grow" id="saved">${x.status === 'Draft' ? 'Draft tersimpan' + (x.savedAt ? ' pukul ' + x.savedAt + ' WIB' : '') : 'Belum disimpan'}</span>${m > 0 ? `<button class="btn ghost" data-act="copyPrev">${i('copy')}Salin nilai ${BULAN[m - 1]}</button>` : ''}<button class="btn" data-act="draft">Simpan draft</button><button class="btn pri" data-act="submit">Ajukan ke Kepala Divisi</button>`
                     : `<span class="small muted grow">${x.status === 'Diajukan' ? 'Sudah diajukan, menunggu Kepala Divisi.' : x.status === 'Final' ? 'Nilai sudah final dan dikunci.' : x.status === 'Disetujui' ? 'Sudah disetujui Kepala Divisi.' : 'Bulan ini hanya bisa dilihat.'}</span>${x.status === 'Diajukan' ? `<button class="btn" data-act="withdraw" data-id="${e.id}">Tarik kembali</button>` : ''}`
             }</div>`
           : ''
   }`;
}
function readVals() {
    const v = {};
    document
        .querySelectorAll('.score-in')
        .forEach(
            (inp) => (v[inp.dataset.j] = inp.value === '' ? null : +inp.value),
        );
    return v;
}
function tween(el, to) {
    if (!el) return;
    const from =
        parseFloat(
            (el.textContent || '0').replace(/\./g, '').replace(',', '.'),
        ) || 0;
    if (to == null) {
        el.textContent = '–';
        return;
    }
    const t0 = performance.now();
    const step = (t) => {
        const p = Math.min(1, (t - t0) / 260),
            v = from + (to - from) * (1 - Math.pow(1 - p, 3));
        el.textContent = fmt(v);
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.textContent = fmt(to)), 320);
}
function bindSheet() {
    const q = $('#pq');
    if (q)
        q.oninput = () => {
            UI.f.q = q.value;
            const pos = q.selectionStart;
            refresh();
            const n = $('#pq');
            n.focus();
            n.setSelectionRange(pos, pos);
        };
    const ins = [...document.querySelectorAll('.score-in')];
    if (!ins.length) return;
    const e = emp(UI.sel),
        K = kpis(e);
    const calc = () => {
        let t = 0,
            full = true;
        ins.forEach((inp) => {
            const j = +inp.dataset.j,
                v = inp.value;
            const ok = valid(v);
            inp.classList.toggle('bad', v !== '' && !ok);
            const c = document.querySelector(`[data-s="${j}"]`);
            if (ok) {
                const s = (v * K[j][6]) / 100;
                t += s;
                c.textContent = fmt(s);
            } else {
                full = false;
                c.textContent = '–';
            }
        });
        tween($('#tot'), full ? t : null);
        const k = kat(full ? t : null);
        const kk = $('#kat');
        kk.textContent = full ? k.t : 'Belum lengkap';
        kk.className = full ? k.c : 'muted';
        const sv = $('#saved');
        if (sv) sv.textContent = 'Perubahan belum disimpan';
        UI.dirty = true;
        const fl = $('#filled');
        if (fl) fl.textContent = ins.filter((x) => valid(x.value)).length;
    };
    UI.dirty = false;
    ins.forEach((inp, n) => {
        inp.addEventListener('input', () => {
            inp.value = inp.value.replace(/[^\d]/g, '').slice(0, 3);
            calc();
        });
        inp.addEventListener('keydown', (ev_) => {
            if (ev_.key === 'Enter') {
                ev_.preventDefault();
                (ins[n + 1] || $('#tpos')).focus();
            }
        });
        inp.addEventListener('focus', () => inp.select());
    });
    ['#tpos', '#tneg'].forEach((s) => {
        const el = $(s);
        if (el)
            el.addEventListener('input', () => {
                const sv = $('#saved');
                if (sv) sv.textContent = 'Perubahan belum disimpan';
            });
    });
}
function riwayatTable(es) {
    return `<div style="overflow-x:auto"><table class="heat"><tr><th class="l">Nama</th>${BLN.map((b, m) => `<th>${b}</th>`).join('')}<th>Rata-rata</th></tr>
  ${es
      .map((e) => {
          const vals = BLN.map((b, m) => (m > AKTIF ? null : total(e, m)));
          const a = avg(vals);
          return `<tr><td class="l"><div class="who"><span class="av sm">${ini(e.nama)}</span><div><b>${e.nama}</b><span>${e.jab}</span></div></div></td>${vals.map((v, m) => `<td style="background:${heat(v)};cursor:${v != null ? 'pointer' : 'default'}" ${v != null ? `data-act="view" data-id="${e.id}" data-m="${m}"` : ''} title="${v != null ? BULAN[m] + ': ' + ev(e.id, m).status : ''}">${v == null ? (m <= AKTIF ? '·' : '') : fmt(v, 1)}</td>`).join('')}<td class="${kat(a).c}" style="font-weight:700">${fmt(a, 1)}</td></tr>`;
      })
      .join('')}</table></div>`;
}
const heat = (v) =>
    v == null
        ? 'transparent'
        : v >= S.set.sb
          ? 'var(--h1)'
          : v >= S.set.b
            ? 'var(--h2)'
            : v >= S.set.c
              ? 'var(--h3)'
              : 'var(--h4)';
function kuRiwayat() {
    const es = scope();
    const trend = BLN.slice(0, AKTIF + 1).map((b, m) =>
        avg(es.map((e) => total(e, m))),
    );
    const pos = [],
        neg = [];
    es.forEach((e) => {
        for (let m = 0; m <= AKTIF; m++) {
            const x = ev(e.id, m);
            if (x.pos) pos.push([e, m, x.pos]);
            if (x.neg) neg.push([e, m, x.neg]);
        }
    });
    return `<div class="content stack">
   <div><div class="row between" style="margin-bottom:12px"><h2>Tren rata-rata nilai unit</h2><button class="btn" data-act="exportOpen">${i('dl')}Export Excel</button></div>${lineChart(trend)}</div>
   <div><h2 style="margin-bottom:6px">Nilai per karyawan</h2><p class="muted small" style="margin:0 0 10px">Klik angka untuk melihat lembar nilai bulan itu.</p>${riwayatTable(es)}</div>
   <div><h2 style="margin-bottom:8px">Temuan</h2>${temuanFeed(pos, neg)}</div></div>`;
}
function temuanFeed(pos, neg) {
    const all = [
        ...pos.map((x) => [...x, 'pos']),
        ...neg.map((x) => [...x, 'neg']),
    ].sort((a, b) => b[1] - a[1]);
    return all.length
        ? `<div class="feed">${all
              .slice(0, 8)
              .map(
                  ([e, m, t, k]) =>
                      `<div><span class="ic" style="background:${k === 'pos' ? 'var(--blue-s)' : 'var(--amber-s)'};color:${k === 'pos' ? 'var(--blue)' : 'var(--amber)'}">${i(k === 'pos' ? 'plus' : 'warn')}</span><div><b style="font-weight:600">${e.nama}</b> <span class="small muted">${BULAN[m]}, ${unitOf(e.unit).nama}</span><div class="ink2">${esc(t)}</div></div></div>`,
              )
              .join('')}</div>`
        : `<div class="empty">Belum ada temuan yang dicatat.</div>`;
}
function kpiReadOnly() {
    const tpls = [...new Set(scope().map((e) => tplOf(e, UI.month)))];
    const cur = UI.tab.kt && tpls.includes(UI.tab.kt) ? UI.tab.kt : tpls[0];
    const K = TPL[cur].kpi;
    return `<div class="content stack">
   <div class="row between wrap"><div class="seg">${tpls.map((t) => `<button class="${t === cur ? 'on' : ''}" data-act="tab" data-k="kt" data-v="${t}">${TPL[t].nama}<span class="c">${scope().filter((e) => tplOf(e, UI.month) === t).length}</span></button>`).join('')}</div><span class="muted small">KPI diatur oleh SDM. Hubungi SDM untuk usulan perubahan.</span></div>
   <table><tr><th></th><th>Pilar</th><th>KPI</th><th>Numerator</th><th>Denominator</th><th>Formula pengukuran</th><th class="c">Target</th><th class="r">Bobot</th></tr>
   ${K.map((k, j) => `<tr><td class="muted small">${j + 1}</td><td class="pil">${k[0]}</td><td><b style="font-weight:600">${esc(k[1])}</b></td><td class="ink2 small">${esc(k[2])}</td><td class="ink2 small">${esc(k[3]) || '–'}</td><td class="ink2 small">${esc(k[4])}</td><td class="c">${esc(k[5])}</td><td class="r num">${k[6]}%</td></tr>`).join('')}
   <tr class="yellow"><td></td><td colspan="6">Total bobot</td><td class="r num">${K.reduce((a, k) => a + k[6], 0)}%</td></tr></table></div>`;
}

/* ----- Kepala Divisi ----- */
function unitProgress(units, m) {
    return `<table>${units
        .map((u) => {
            const es = EMPS.filter((e) => e.unit === u.id),
                c = (s) => es.filter((e) => ev(e.id, m).status === s).length,
                n = es.length;
            const seg = [
                ['Final', 'var(--green)'],
                ['Disetujui', 'var(--green-m)'],
                ['Diajukan', 'var(--blue)'],
                ['Dikembalikan', 'var(--amber)'],
                ['Draft', '#B8BDC6'],
            ]
                .map(([s, col]) =>
                    c(s)
                        ? `<i style="width:${(c(s) / n) * 100}%;background:${col}"></i>`
                        : '',
                )
                .join('');
            const belum = c('Belum') + c('Draft');
            return `<tr><td style="width:34%"><b style="font-weight:600">${u.nama}</b><div class="small muted">${u.kepala}</div></td><td><div class="bar">${seg}</div><div class="small muted" style="margin-top:6px">${c('Diajukan')} menunggu, ${c('Disetujui') + c('Final')} disetujui, ${belum} belum diajukan</div></td><td class="r" style="width:140px">${belum && m === AKTIF ? `<button class="btn sm ghost" data-act="remind" data-u="${u.nama}">Kirim pengingat</button>` : ''}</td></tr>`;
        })
        .join('')}</table>`;
}
function kdBeranda() {
    const m = UI.month,
        es = scope(),
        c = (s) => es.filter((e) => ev(e.id, m).status === s).length;
    const avgT = avg(es.map((e) => total(e, m))),
        units = UNITS.filter((u) => u.div === ACC.kd.div);
    const waiting = es.filter((e) => ev(e.id, m).status === 'Diajukan');
    return `<div class="content stack">
   <div><p class="muted" style="margin:0 0 4px">${greet()}, ${firstName(ACC.kd.nama)}.</p><h2 class="lead">${c('Diajukan') ? `${c('Diajukan')} penilaian menunggu persetujuan kamu.` : 'Tidak ada penilaian yang menunggu.'}</h2></div>
   ${c('Diajukan') && m === AKTIF ? `<div class="task" style="border-top:1px solid var(--line2);border-bottom:1px solid var(--line2)"><div class="ring" style="--p:${Math.round(((c('Disetujui') + c('Final')) / es.length) * 100)}"><span>${c('Disetujui') + c('Final')}/${es.length}</span></div><div class="grow"><b style="font-size:16px">Persetujuan ${BULAN[m]} ${TAHUN}</b><div class="muted">Batas persetujuan ${S.set.setuju}</div></div><button class="btn pri" data-act="go" data-go="persetujuan">Tinjau penilaian</button></div>` : ''}
   <div class="figs"><div><div class="l">Rata-rata nilai divisi</div><div class="v num ${kat(avgT).c}">${fmt(avgT, 1)}</div><div class="s">${kat(avgT).t}</div></div><div><div class="l">Menunggu kamu</div><div class="v num">${c('Diajukan')}</div><div class="s">penilaian</div></div><div><div class="l">Dikembalikan</div><div class="v num">${c('Dikembalikan')}</div><div class="s">sedang diperbaiki unit</div></div><div><div class="l">Belum diajukan unit</div><div class="v num">${c('Belum') + c('Draft')}</div><div class="s">karyawan</div></div></div>
   <div><h2 style="margin-bottom:6px">Progres per unit</h2>${unitProgress(units, m)}</div>
   ${
       waiting.length
           ? `<div><div class="row between" style="margin-bottom:8px"><h2>Menunggu persetujuan</h2><a class="link" href="#" data-act="go" data-go="persetujuan">Lihat semua</a></div><table><tr><th>Nama</th><th>Status</th><th class="r">Total nilai</th><th>Kategori</th></tr>${waiting
                 .slice(0, 5)
                 .map(
                     (e) =>
                         `<tr class="click" data-act="review" data-id="${e.id}">${personRow(e, m)}</tr>`,
                 )
                 .join('')}</table></div>`
           : ''
   }
  </div>`;
}
function kdPersetujuan() {
    const m = UI.month,
        es = scope(),
        tab = UI.tab.ps || 'Diajukan';
    const tabs = [
        ['Diajukan', 'Menunggu'],
        ['Dikembalikan', 'Dikembalikan'],
        ['Disetujui', 'Disetujui'],
        ['semua', 'Semua'],
    ];
    const inT = (e) =>
        tab === 'semua' ||
        ev(e.id, m).status === tab ||
        (tab === 'Disetujui' && ev(e.id, m).status === 'Final');
    const units = UNITS.filter((u) => u.div === ACC.kd.div);
    const sel = UI.f.chk || {};
    const pend = es.filter((e) => ev(e.id, m).status === 'Diajukan');
    const nsel = pend.filter((e) => sel[e.id]).length;
    return `<div class="content stack">
   <div class="row between wrap"><div class="seg">${tabs.map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-k="ps" data-v="${k}">${t}<span class="c">${es.filter((e) => k === 'semua' || ev(e.id, m).status === k || (k === 'Disetujui' && ev(e.id, m).status === 'Final')).length}</span></button>`).join('')}</div>
   ${tab === 'Diajukan' && pend.length && m === AKTIF ? `<div class="row"><span class="small muted">${nsel ? nsel + ' dipilih' : ''}</span><button class="btn pri" data-act="bulkApprove">${nsel ? `Setujui ${nsel} penilaian` : `Setujui semua (${pend.length})`}</button></div>` : ''}</div>
   ${
       units
           .map((u) => {
               const rows = es.filter((e) => e.unit === u.id && inT(e));
               if (!rows.length) return '';
               return `<div><div class="row" style="margin-bottom:4px"><h2>${u.nama}</h2><span class="small muted">Penilai ${u.kepala}</span></div>
     <table><tr>${tab === 'Diajukan' && m === AKTIF ? `<th style="width:36px"></th>` : ''}<th>Nama</th><th>Temuan</th><th>Status</th><th class="r">Total nilai</th><th>Kategori</th><th></th></tr>
     ${rows
         .map((e) => {
             const x = ev(e.id, m);
             return `<tr class="click" data-act="review" data-id="${e.id}">${tab === 'Diajukan' && m === AKTIF ? `<td><input type="checkbox" data-act="chk" data-id="${e.id}" ${sel[e.id] ? 'checked' : ''} aria-label="Pilih ${e.nama}"></td>` : ''}${personRow(e, m, `<td class="small">${x.pos ? '<span style="color:var(--blue)">Positif</span> ' : ''}${x.neg ? '<span style="color:var(--amber)">Negatif</span>' : ''}${!x.pos && !x.neg ? '<span class="muted">–</span>' : ''}</td>`)}<td class="r"><span class="link small">${x.status === 'Diajukan' ? 'Tinjau' : 'Lihat'}</span></td></tr>`;
         })
         .join('')}</table></div>`;
           })
           .join('') || `<div class="empty">Tidak ada penilaian di sini.</div>`
   }
  </div>`;
}
function openReview(id, m, mode) {
    m = m ?? UI.month;
    const e = emp(id),
        x = ev(id, m);
    const steps = [
        [
            'Kepala Unit',
            'memberi nilai',
            !['Belum', 'Draft', 'Dikembalikan'].includes(x.status),
        ],
        [
            'Kepala Divisi',
            'menyetujui',
            ['Disetujui', 'Final'].includes(x.status),
        ],
        ['SDM', 'memfinalkan', x.status === 'Final'],
    ];
    const nowIdx = steps.findIndex((s) => !s[2]);
    const canA = mode === 'kd' && x.status === 'Diajukan' && m === AKTIF,
        canF = mode === 'hc' && x.status === 'Disetujui' && m === AKTIF;
    drawer(`<div class="dhead"><div class="grow"><div class="small muted">${BULAN[m]} ${TAHUN}</div><h2>Lembar nilai</h2></div><button class="iconbtn" data-act="close">${i('x')}</button></div>
   <div class="dbody"><div class="steps" style="margin-bottom:22px">${steps.map((s, n) => `<div class="${s[2] ? 'done' : n === nowIdx ? 'now' : ''}"><b>${s[0]}</b>${s[1]}</div>`).join('')}</div>
   ${x.status === 'Final' ? `<div class="info lock">${i('lock')}<div><b>Final, nilai terkunci</b><div>KPI dan bobot disimpan sesuai saat penilaian. Pembukaan kunci hanya oleh Super HC.</div></div></div>` : !canA && !canF ? `<div class="info">${i('eye')}<div><b>Nilai hanya baca</b><div>Perubahan status mengikuti kewenangan peran. Angka tidak bisa diubah di sini.</div></div></div>` : ''}${sheetHTML(e, m, mode || 'view')}
   ${
       x.log.length
           ? `<h2 style="margin-top:24px;font-size:14px">Riwayat</h2><div class="feed">${x.log
                 .slice()
                 .reverse()
                 .map(
                     (l) =>
                         `<div class="small"><span class="muted" style="width:44px">${l.t}</span><div><b>${esc(l.who)}</b> ${esc(l.txt)}</div></div>`,
                 )
                 .join('')}</div>`
           : ''
   }
   ${canA ? `<label class="small muted" style="display:block;margin-top:22px">Catatan untuk Kepala Unit (wajib bila dikembalikan)</label><textarea class="f" id="note" style="margin-top:6px" placeholder="Contoh: nilai Audit Rekam Medis belum sesuai hasil audit"></textarea>` : ''}
   </div>
   ${
       canA
           ? `<div class="dfoot"><span class="grow"></span><button class="btn warn" data-act="returnKD" data-id="${id}">Kembalikan</button><button class="btn pri" data-act="approve" data-id="${id}">Setujui</button></div>`
           : canF
             ? `<div class="dfoot"><span class="grow small muted">Setelah difinalkan, nilai dikunci.</span><button class="btn warn" data-act="returnHC" data-id="${id}">Kembalikan</button><button class="btn pri" data-act="finalOne" data-id="${id}">${i('lock')}Finalkan</button></div>`
             : ''
   }`);
}
function lineChart(vals, h = 180) {
    const W = 760,
        H = h,
        pl = 34,
        pr = 12,
        pt = 12,
        pb = 26,
        lo = 60,
        hi = 100;
    const X = (n) => pl + (n * (W - pl - pr)) / 11,
        Y = (v) =>
            pt +
            ((hi - Math.max(lo, Math.min(hi, v))) / (hi - lo)) * (H - pt - pb);
    const pts = vals
        .map((v, n) => (v == null ? null : [X(n), Y(v)]))
        .filter(Boolean);
    const d = pts
        .map(
            (p, n) => (n ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1),
        )
        .join('');
    const area = pts.length
        ? d + `L${pts[pts.length - 1][0]} ${H - pb}L${pts[0][0]} ${H - pb}Z`
        : '';
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;max-width:1100px" role="img" aria-label="Grafik tren nilai">
   ${[60, 70, 80, 90, 100].map((g) => `<line x1="${pl}" x2="${W - pr}" y1="${Y(g)}" y2="${Y(g)}" stroke="var(--line2)"/><text x="${pl - 8}" y="${Y(g) + 4}" font-size="11" text-anchor="end" fill="#7A8292">${g}</text>`).join('')}
   ${BLN.map((b, n) => `<text x="${X(n)}" y="${H - 6}" font-size="11" text-anchor="middle" fill="#7A8292">${b}</text>`).join('')}
   <path d="${area}" fill="#D92D20" opacity=".06"/><path d="${d}" fill="none" stroke="#D92D20" stroke-width="2"/>
   ${vals.map((v, n) => (v == null ? '' : `<circle cx="${X(n)}" cy="${Y(v)}" r="${n === UI.month ? 4.5 : 3}" fill="${n === UI.month ? '#D92D20' : '#fff'}" stroke="#D92D20" stroke-width="2"><title>${BULAN[n]}: ${fmt(v, 1)}</title></circle>`)).join('')}</svg>`;
}
function dashboard() {
    const m = UI.month,
        F = UI.f;
    let es = scope().filter(
        (e) =>
            (!F.div || unitOf(e.unit).div === F.div) &&
            (!F.unit || e.unit === F.unit) &&
            (!F.tpl || tplOf(e, m) === F.tpl),
    );
    if (F.kat) es = es.filter((e) => kat(total(e, m)).t === F.kat);
    const sc = es.map((e) => total(e, m)),
        a = avg(sc),
        done = es.filter((e) =>
            ['Disetujui', 'Final'].includes(ev(e.id, m).status),
        ).length;
    const cnt = { 'Sangat Baik': 0, Baik: 0, Cukup: 0, Kurang: 0 };
    sc.filter((x) => x != null).forEach((s) => cnt[kat(s).t]++);
    const units = UNITS.filter((u) => es.some((e) => e.unit === u.id)).map(
        (u) => [
            u,
            avg(es.filter((e) => e.unit === u.id).map((e) => total(e, m))),
        ],
    );
    const trend = BLN.map((b, n) =>
        n > AKTIF ? null : avg(es.map((e) => total(e, n))),
    );
    const rank = es
        .map((e) => [e, total(e, m)])
        .filter((x) => x[1] != null)
        .sort((x, y) => y[1] - x[1]);
    const tpls = [
        ...new Set(es.flatMap((e) => BLN.map((b, n) => tplOf(e, n)))),
    ].filter((t) => TPL[t]);
    const pos = [],
        neg = [];
    es.forEach((e) => {
        const x = ev(e.id, m);
        if (x.pos) pos.push([e, m, x.pos]);
        if (x.neg) neg.push([e, m, x.neg]);
    });
    const opt = (k, list, lbl) =>
        `<select class="f" data-act="filter" data-k="${k}"><option value="">${lbl}</option>${list.map(([v, t]) => `<option value="${v}" ${F[k] === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    const unitList = UNITS.filter(
        (u) =>
            scope().some((e) => e.unit === u.id) && (!F.div || u.div === F.div),
    );
    const any = F.div || F.unit || F.tpl || F.kat;
    return `<div class="content stack">
   <div class="filters">${
       UI.role === 'hc'
           ? opt(
                 'div',
                 DIVS.map((d) => [d.id, d.nama]),
                 'Semua divisi',
             )
           : ''
   }${opt(
       'unit',
       unitList.map((u) => [u.id, u.nama]),
       'Semua unit',
   )}${opt(
       'tpl',
       Object.entries(TPL).map(([k, t]) => [k, t.nama]),
       'Semua jabatan',
   )}${opt(
       'kat',
       ['Sangat Baik', 'Baik', 'Cukup', 'Kurang'].map((k) => [k, k]),
       'Semua kategori',
   )}${any ? `<button class="btn ghost sm" data-act="clearF">Hapus filter</button>` : ''}<button class="btn" style="margin-left:auto" data-act="exportOpen" data-preset="${F.unit ? 'u:' + F.unit : F.div ? 'd:' + F.div : 'all'}">${i('dl')}Export Excel</button></div>
   <div class="figs"><div><div class="l">Rata-rata nilai</div><div class="v num ${kat(a).c}">${fmt(a, 1)}</div><div class="s">${kat(a).t}</div></div><div><div class="l">Sudah dinilai</div><div class="v num">${sc.filter((x) => x != null).length}<span class="muted" style="font-size:16px"> / ${es.length}</span></div><div class="s">karyawan</div></div><div><div class="l">Disetujui atau final</div><div class="v num">${es.length ? Math.round((done / es.length) * 100) : 0}%</div><div class="s">${done} penilaian</div></div><div><div class="l">Sebaran kategori</div><div class="bar" style="height:8px;margin:12px 0 8px">${[
       ['Sangat Baik', 'var(--green-m)'],
       ['Baik', 'var(--blue)'],
       ['Cukup', 'var(--amber)'],
       ['Kurang', 'var(--red)'],
   ]
       .map(([k, c]) =>
           cnt[k]
               ? `<i style="width:${(cnt[k] / Math.max(1, sc.filter((x) => x != null).length)) * 100}%;background:${c}"></i>`
               : '',
       )
       .join('')}</div><div class="s">${Object.entries(cnt)
       .map(([k, v]) => `${v} ${k.toLowerCase()}`)
       .join(', ')}</div></div></div>
   <div class="row" style="align-items:flex-start;gap:40px;flex-wrap:wrap"><div style="flex:1.5;min-width:340px"><h2 style="margin-bottom:12px">Tren rata-rata nilai ${TAHUN}</h2>${lineChart(trend)}</div>
     <div style="flex:1;min-width:260px"><h2 style="margin-bottom:12px">Rata-rata per unit, ${BULAN[m]}</h2>${units.map(([u, v]) => `<div style="margin-bottom:14px"><div class="row between small"><span>${u.nama}</span><b class="num">${fmt(v, 1)}</b></div><div class="bar" style="margin-top:6px"><i style="width:${v || 0}%;background:${v >= S.set.sb ? 'var(--green-m)' : v >= S.set.b ? 'var(--blue)' : 'var(--amber)'}"></i></div></div>`).join('') || `<div class="muted">Belum ada data</div>`}</div></div>
   ${
       UI.role === 'hc'
           ? `<div><h2 style="margin-bottom:6px">Status penilaian per unit</h2>${unitProgress(
                 UNITS.filter((u) => es.some((e) => e.unit === u.id)),
                 m,
             )}</div>`
           : ''
   }
   <div><h2 style="margin-bottom:6px">Rata-rata nilai per KPI</h2><p class="muted small" style="margin:0 0 10px">Skala 10–100, dari semua karyawan pada filter ini.</p>
    <div style="overflow-x:auto"><table class="heat"><tr><th class="l">KPI</th>${BLN.map((b) => `<th>${b}</th>`).join('')}</tr>
    ${tpls
        .map(
            (t) =>
                `<tr><td class="l" colspan="13" style="padding-top:14px;font-weight:650;color:var(--ink2)">${TPL[t].nama}</td></tr>` +
                TPL[t].kpi
                    .map(
                        (k, j) =>
                            `<tr><td class="l">${esc(k[1])}</td>${BLN.map(
                                (b, n) => {
                                    const v =
                                        n > AKTIF
                                            ? null
                                            : avg(
                                                  es
                                                      .filter(
                                                          (e) =>
                                                              tplOf(e, n) === t,
                                                      )
                                                      .map((e) => {
                                                          const z = ev(e.id, n)
                                                              .vals[j];
                                                          return valid(z)
                                                              ? +z
                                                              : null;
                                                      }),
                                              );
                                    return `<td style="background:${heat(v)}">${v == null ? '' : fmt(v, 0)}</td>`;
                                },
                            ).join('')}</tr>`,
                    )
                    .join(''),
        )
        .join('')}</table></div></div>
   <div class="row" style="align-items:flex-start;gap:40px;flex-wrap:wrap"><div style="flex:1;min-width:320px"><h2 style="margin-bottom:6px">Peringkat ${BULAN[m]}</h2><table>${
       rank
           .slice(0, 8)
           .map(
               ([e, v], n) =>
                   `<tr class="click" data-act="review" data-id="${e.id}"><td class="muted num" style="width:28px">${n + 1}</td><td><div class="who"><span class="av sm">${ini(e.nama)}</span><div><b>${e.nama}</b><span>${unitOf(e.unit).nama}</span></div></div></td><td class="r num"><b>${fmt(v)}</b></td><td class="${kat(v).c}" style="font-weight:600;width:90px">${kat(v).t}</td></tr>`,
           )
           .join('') ||
       `<tr><td class="empty">Belum ada nilai lengkap</td></tr>`
   }</table></div>
     <div style="flex:1;min-width:280px"><h2 style="margin-bottom:6px">Temuan ${BULAN[m]}</h2>${temuanFeed(pos, neg)}</div></div>
  </div>`;
}

/* ----- Super HC ----- */
function hcBeranda() {
    const m = UI.month,
        es = scope(),
        c = (s) => es.filter((e) => ev(e.id, m).status === s).length;
    const dinilai = es.length - c('Belum') - c('Draft') - c('Dikembalikan'),
        dis = c('Disetujui') + c('Final');
    return `<div class="content stack">
   <div><p class="muted" style="margin:0 0 4px">${greet()}, ${firstName(ACC.hc.nama)}.</p><h2 class="lead">${c('Disetujui') ? `${c('Disetujui')} penilaian siap difinalkan.` : m === AKTIF ? 'Belum ada penilaian yang siap difinalkan.' : `Siklus ${BULAN[m]} sudah ditutup.`}</h2></div>
   <div class="task" style="border-top:1px solid var(--line2);border-bottom:1px solid var(--line2);gap:40px">
     <div class="grow"><b style="font-size:16px">Siklus ${BULAN[m]} ${TAHUN}</b><div class="muted">Ditutup ${S.set.tutup}</div>
       <div class="steps" style="margin-top:16px;max-width:560px"><div class="${dinilai === es.length ? 'done' : 'now'}"><b>${dinilai}/${es.length} dinilai</b>oleh Kepala Unit</div><div class="${dis === es.length ? 'done' : dinilai ? 'now' : ''}"><b>${dis}/${es.length} disetujui</b>oleh Kepala Divisi</div><div class="${c('Final') === es.length ? 'done' : c('Disetujui') ? 'now' : ''}"><b>${c('Final')}/${es.length} final</b>dikunci SDM</div></div></div>
     ${c('Disetujui') && m === AKTIF ? `<button class="btn pri" data-act="go" data-go="rekap">Finalkan penilaian</button>` : ''}</div>
   <div><h2 style="margin-bottom:6px">Progres per divisi</h2>
    ${DIVS.map(
        (d) =>
            `<div style="margin-top:14px"><b style="font-weight:600">${d.nama}</b> <span class="small muted">${d.kepala}</span>${unitProgress(
                UNITS.filter((u) => u.div === d.id),
                m,
            )}</div>`,
    ).join('')}</div>
   <div class="row" style="align-items:flex-start;gap:40px;flex-wrap:wrap">
     <div style="flex:1;min-width:300px"><h2 style="margin-bottom:6px">Aktivitas terbaru</h2><div class="feed">${S.act
         .slice(0, 6)
         .map(
             (a) =>
                 `<div><span class="av sm">${ini(a.who)}</span><div><b style="font-weight:600">${esc(a.who)}</b> ${esc(a.txt)}<div class="small muted">${a.t}</div></div></div>`,
         )
         .join('')}</div></div>
     <div style="flex:1;min-width:300px"><h2 style="margin-bottom:6px">Temuan ${BULAN[m]}</h2>${(() => {
         const p = [],
             n = [];
         es.forEach((e) => {
             const x = ev(e.id, m);
             if (x.pos) p.push([e, m, x.pos]);
             if (x.neg) n.push([e, m, x.neg]);
         });
         return temuanFeed(p, n);
     })()}</div></div>
  </div>`;
}
function hcRekap() {
    const m = UI.month,
        F = UI.f;
    let es = scope().filter(
        (e) =>
            (!F.div || unitOf(e.unit).div === F.div) &&
            (!F.unit || e.unit === F.unit),
    );
    const tab = UI.tab.rk || 'Disetujui';
    const tabs = [
        ['Disetujui', 'Siap difinalkan'],
        ['Diajukan', 'Di Kepala Divisi'],
        ['Dikembalikan', 'Dikembalikan'],
        ['Belum', 'Belum diajukan'],
        ['Final', 'Final'],
        ['semua', 'Semua'],
    ];
    const match = (e, k) => {
        const s = ev(e.id, m).status;
        return k === 'semua' || s === k || (k === 'Belum' && s === 'Draft');
    };
    const rows = es.filter((e) => match(e, tab));
    const opt = (k, list, lbl) =>
        `<select class="f" data-act="filter" data-k="${k}"><option value="">${lbl}</option>${list.map(([v, t]) => `<option value="${v}" ${F[k] === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    return `<div class="content stack">
   <div class="row between wrap"><div class="seg">${tabs.map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-k="rk" data-v="${k}">${t}<span class="c">${es.filter((e) => match(e, k)).length}</span></button>`).join('')}</div>
    <div class="row"><button class="btn ghost" data-act="copyRekap">${i('copy')}Salin</button><button class="btn" data-act="exportOpen" data-preset="${F.unit ? 'u:' + F.unit : F.div ? 'd:' + F.div : 'all'}">${i('dl')}Export Excel</button>${tab === 'Disetujui' && rows.length && m === AKTIF ? `<button class="btn pri" data-act="bulkFinal">${i('lock')}Finalkan ${rows.length} penilaian</button>` : ''}</div></div>
   <div class="filters">${opt(
       'div',
       DIVS.map((d) => [d.id, d.nama]),
       'Semua divisi',
   )}${opt(
       'unit',
       UNITS.filter((u) => !F.div || u.div === F.div).map((u) => [
           u.id,
           u.nama,
       ]),
       'Semua unit',
   )}</div>
   ${
       rows.length
           ? `<table><tr><th>Nama</th><th>Penilai</th><th>Status</th><th class="r">Total nilai</th><th>Kategori</th><th></th></tr>
    ${rows
        .map((e) => {
            const s = ev(e.id, m).status;
            return `<tr class="click" data-act="${s === 'Belum' || s === 'Draft' ? 'noop' : 'reviewHC'}" data-id="${e.id}">${personRow(e, m, `<td class="ink2 small">${unitOf(e.unit).kepala}</td>`)}<td class="r">${s === 'Belum' || s === 'Draft' ? `<button class="btn sm ghost" data-act="remind" data-u="${unitOf(e.unit).nama}">Ingatkan</button>` : `<span class="link small">${s === 'Disetujui' ? 'Periksa' : 'Lihat'}</span>`}</td></tr>`;
        })
        .join('')}</table>`
           : `<div class="empty">Tidak ada penilaian di sini.</div>`
   }
  </div>`;
}
function hcKpi() {
    const keys = Object.keys(TPL);
    const cur = UI.tab.mk && TPL[UI.tab.mk] ? UI.tab.mk : keys[0];
    const T = TPL[cur],
        sum = T.kpi.reduce((a, k) => a + (+k[6] || 0), 0);
    const users = EMPS.filter((e) => tplOf(e, UI.month) === cur).length;
    later(() => {
        document.querySelectorAll('[data-kf]').forEach((el) =>
            el.addEventListener(
                el.tagName === 'SELECT' ? 'change' : 'input',
                () => {
                    const [j, f] = el.dataset.kf.split(',').map(Number);
                    T.kpi[j][f] = f === 6 ? +el.value || 0 : el.value;
                    if (f === 6) {
                        const s = T.kpi.reduce((a, k) => a + (+k[6] || 0), 0);
                        $('#sumB').textContent = s + '%';
                        $('#sumB').style.color =
                            s === 100 ? 'var(--green-m)' : 'var(--red)';
                        $('#sumMsg').innerHTML = bobotMsg(s);
                    }
                },
            ),
        );
    });
    return `<div class="content stack" style="max-width:none">
   <div class="row between wrap"><div class="seg">${keys.map((k) => `<button class="${k === cur ? 'on' : ''}" data-act="tab" data-k="mk" data-v="${k}">${esc(TPL[k].nama)}</button>`).join('')}<button data-act="newTpl">${i('plus')}</button></div>
    <div class="row"><button class="btn ghost" data-act="exportTpl">${i('dl')}Unduh template</button><button class="btn ghost" data-act="upload">${i('upload')}Upload Excel</button><button class="btn pri" data-act="saveKpi">Simpan perubahan</button></div></div>
   <div class="row between"><div><input class="f" style="font-size:18px;font-weight:650;border-color:transparent;padding:4px 6px;margin-left:-6px;width:420px" value="${esc(T.nama)}" data-act="tplName" aria-label="Nama template"><div class="muted small">${T.kpi.length} KPI, dipakai ${users} karyawan</div></div><div id="sumMsg">${bobotMsg(sum)}</div></div>
   <div style="overflow-x:auto"><table class="kpi-edit" style="min-width:1040px;table-layout:fixed"><colgroup><col style="width:34px"><col style="width:180px"><col style="width:230px"><col><col><col style="width:170px"><col style="width:100px"><col style="width:76px"><col style="width:40px"></colgroup>
    <tr><th></th><th>Pilar</th><th>KPI</th><th>Numerator</th><th>Denominator</th><th>Formula pengukuran</th><th>Target</th><th class="r">Bobot</th><th></th></tr>
    ${T.kpi.map((k, j) => `<tr><td class="muted small">${j + 1}</td><td><select class="f" data-kf="${j},0">${PILAR.map((p) => `<option ${p === k[0] ? 'selected' : ''}>${p}</option>`).join('')}</select></td><td><input class="f" style="font-weight:600" data-kf="${j},1" value="${esc(k[1])}" placeholder="Nama KPI"></td><td><input class="f" data-kf="${j},2" value="${esc(k[2])}"></td><td><input class="f" data-kf="${j},3" value="${esc(k[3])}" placeholder="–"></td><td><input class="f" data-kf="${j},4" value="${esc(k[4])}"></td><td><input class="f" data-kf="${j},5" value="${esc(k[5])}"></td><td><input class="f num" style="text-align:right" data-kf="${j},6" value="${k[6]}" inputmode="numeric"></td><td><button class="iconbtn" style="width:30px;height:30px" data-act="delKpi" data-j="${j}" aria-label="Hapus KPI">${i('trash')}</button></td></tr>`).join('')}
    <tr><td></td><td colspan="8"><button class="link" data-act="addKpi" style="padding:6px 0">Tambah KPI</button></td></tr>
    <tr class="yellow"><td></td><td colspan="6">Total bobot</td><td class="r num" id="sumB" style="color:${sum === 100 ? 'var(--green-m)' : 'var(--red)'}">${sum}%</td><td></td></tr></table></div>
  </div>`;
}
const bobotMsg = (s) =>
    s === 100
        ? `<span class="st st-Disetujui">Total bobot 100%</span>`
        : `<span class="st" style="color:var(--red)">Total bobot ${s}%, ${s < 100 ? 'kurang ' + (100 - s) : 'lebih ' + (s - 100)}%</span>`;
function hcPengaturan() {
    const s = S.set;
    return `<div class="content stack" style="max-width:960px">
   <div><h2>Jadwal siklus bulanan</h2><p class="muted" style="margin:4px 0 14px">Berlaku untuk penilaian ${BULAN[AKTIF]} ${TAHUN}.</p>
    <table>${[
        ['isi', 'Batas pengisian Kepala Unit'],
        ['setuju', 'Batas persetujuan Kepala Divisi'],
        ['tutup', 'Siklus ditutup'],
    ]
        .map(
            ([k, t]) =>
                `<tr><td>${t}</td><td class="r"><input class="f" data-set="${k}" value="${esc(s[k])}" style="width:200px"></td></tr>`,
        )
        .join('')}</table></div>
   <div><h2>Kategori nilai</h2><p class="muted" style="margin:4px 0 14px">Total nilai = jumlah (nilai 10–100 × bobot KPI). Batas di bawah langsung dipakai di semua halaman.</p>
    <table>${[
        ['sb', 'Sangat Baik', 'k-SB'],
        ['b', 'Baik', 'k-B'],
        ['c', 'Cukup', 'k-C'],
    ]
        .map(
            ([k, t, c]) =>
                `<tr><td class="${c}" style="font-weight:600">${t}</td><td class="r">mulai dari <input class="f num" data-set="${k}" value="${s[k]}" style="width:70px;text-align:right;margin-left:8px"></td></tr>`,
        )
        .join(
            '',
        )}<tr><td class="k-K" style="font-weight:600">Kurang</td><td class="r muted">di bawah ${s.c}</td></tr></table>
    <div class="bar" style="height:10px;margin-top:16px"><i style="width:${s.c}%;background:#F3C9C4"></i><i style="width:${s.b - s.c}%;background:#F6DDB0"></i><i style="width:${s.sb - s.b}%;background:#BFD0F5"></i><i style="width:${100 - s.sb}%;background:#A9D7BE"></i></div></div>
   <div><h2>Pengguna</h2><table style="margin-top:10px">${[[ACC.hc.nama, 'Super HC'], ...DIVS.map((d) => [d.kepala, 'Kepala Divisi, ' + d.nama.replace('Divisi ', '')]), ...UNITS.map((u) => [u.kepala, 'Kepala Unit, ' + u.nama.replace('Unit ', '')])].map(([n, r]) => `<tr><td><div class="who"><span class="av sm">${ini(n)}</span><b>${n}</b></div></td><td class="ink2">${r}</td></tr>`).join('')}</table></div>
   <div class="row"><button class="btn pri" data-act="saveSet">Simpan pengaturan</button><button class="btn ghost" data-act="reset">Kembalikan data contoh</button></div>
  </div>`;
}

/* =========================================================
   AKUN, NOTIFIKASI, TEMA, PROFIL, PANDUAN
   ========================================================= */
const RD = () => S.read || (S.read = {});
const PR = () => S.prof || (S.prof = {});
Object.keys(PR()).forEach((r) => {
    if (ACC[r] && PR()[r].nama) ACC[r].nama = PR()[r].nama;
});
function prof() {
    const P = PR();
    return (
        P[UI.role] ||
        (P[UI.role] = {
            nama: ACC[UI.role].nama,
            email:
                {
                    ku: 'agus.prasetyo',
                    kd: 'hendra.kusuma',
                    hc: 'rina.marlina',
                }[UI.role] + '@rs.co.id',
            hp: '',
            foto: '',
            notifEmail: true,
            notifWa: false,
        })
    );
}
function avatar(cls) {
    const p = prof();
    return p.foto
        ? `<img class="av ${cls || ''}" src="${p.foto}" alt="" style="object-fit:cover">`
        : `<span class="av ${cls || ''}">${ini(p.nama)}</span>`;
}

const AGO = [
    '10 menit lalu',
    '1 jam lalu',
    '3 jam lalu',
    'Kemarin',
    '2 hari lalu',
    '3 hari lalu',
    '5 hari lalu',
    '1 minggu lalu',
];
function notifList() {
    const m = AKTIF,
        es = scope(),
        n = [];
    const add = (id, t, s, go, sel) =>
        n.push({ id: UI.role + ':' + id, t, s, go, sel });
    const belum = (u) =>
        EMPS.filter(
            (e) =>
                e.unit === u.id &&
                ['Belum', 'Draft'].includes(ev(e.id, m).status),
        ).length;
    if (UI.role === 'ku') {
        es.filter((e) => ev(e.id, m).status === 'Dikembalikan').forEach((e) =>
            add(
                'ret-' + e.id,
                `Penilaian dikembalikan · ${e.nama}`,
                ev(e.id, m).note,
                'nilai',
                e.id,
            ),
        );
        const b = es.filter((e) =>
            ['Belum', 'Draft'].includes(ev(e.id, m).status),
        ).length;
        if (b)
            add(
                'due-' + b,
                `${b} karyawan belum diajukan`,
                `Batas pengisian ${S.set.isi}`,
                'nilai',
            );
        es.filter((e) => ev(e.id, m).status === 'Disetujui').forEach((e) =>
            add(
                'ok-' + e.id,
                `Penilaian disetujui · ${e.nama}`,
                'Disetujui Kepala Divisi, menunggu finalisasi SDM',
                'pengajuan',
            ),
        );
        es.filter((e) => ev(e.id, m).status === 'Final').forEach((e) =>
            add(
                'fin-' + e.id,
                `Nilai final · ${e.nama}`,
                'Sudah dikunci SDM',
                'riwayat',
            ),
        );
    }
    if (UI.role === 'kd') {
        es.filter((e) => ev(e.id, m).status === 'Diajukan').forEach((e) =>
            add(
                'sub-' + e.id,
                `Penilaian baru · ${e.nama}`,
                `Diajukan ${unitOf(e.unit).kepala}, ${unitOf(e.unit).nama}`,
                'persetujuan',
                e.id,
            ),
        );
        UNITS.filter((u) => u.div === ACC.kd.div).forEach((u) => {
            const k = belum(u);
            if (k)
                add(
                    'late-' + u.id + k,
                    `${u.nama} belum selesai menilai`,
                    `${k} karyawan belum diajukan`,
                    'beranda',
                );
        });
    }
    if (UI.role === 'hc') {
        const d = es.filter((e) => ev(e.id, m).status === 'Disetujui').length;
        if (d)
            add(
                'ready-' + d,
                `${d} penilaian siap difinalkan`,
                `Siklus ditutup ${S.set.tutup}`,
                'rekap',
            );
        UNITS.forEach((u) => {
            const k = belum(u);
            if (k)
                add(
                    'late-' + u.id + k,
                    `${u.nama} belum selesai menilai`,
                    `${k} karyawan belum diajukan, ${u.kepala}`,
                    'beranda',
                );
        });
        const tb = Object.entries(TPL).find(
            ([k, t]) => t.kpi.reduce((a, x) => a + (+x[6] || 0), 0) !== 100,
        );
        if (tb)
            add(
                'bobot-' + tb[0],
                'Total bobot KPI belum 100%',
                tb[1].nama,
                'kpi',
            );
    }
    n.forEach((x, k) => (x.ago = AGO[Math.min(k, AGO.length - 1)]));
    return n;
}
const unread = () => notifList().filter((x) => !RD()[x.id]).length;
function placeUnder(btn, m, w) {
    const r = btn.getBoundingClientRect();
    m.style.width = w + 'px';
    m.style.left =
        Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w)) + 'px';
    m.style.top = r.bottom + 8 + 'px';
    requestAnimationFrame(() => m.classList.add('on'));
}
function openNotifPop(btn) {
    const n = notifList(),
        u = n.filter((x) => !RD()[x.id]).length,
        m = $('#menu');
    m.className = 'menu pop-notif';
    m.innerHTML = `<div class="np-head"><b>Notifikasi</b>${u ? `<span class="muted">${u} baru</span>` : ''}<span class="grow"></span>${u ? `<button class="np-all" data-act="readAll">Tandai semua dibaca</button>` : ''}</div>
  <div class="np-list">${n.length ? n.map((x) => `<button class="np-item ${RD()[x.id] ? 'read' : ''}" data-act="notifGo" data-nid="${esc(x.id)}" data-go="${x.go}" data-id="${x.sel || ''}"><span class="np-dot"></span><span class="grow"><b>${esc(x.t)}</b><span class="np-s">${esc(x.s)}</span><span class="np-t">${x.ago}</span></span></button>`).join('') : `<div class="empty small">Belum ada notifikasi.</div>`}</div>`;
    placeUnder(btn, m, 420);
}
function openAcct(btn) {
    const m = $('#menu'),
        th = UI.theme || 'terang';
    m.className = 'menu pop-acct';
    m.innerHTML = `<button data-act="go" data-go="profil">${i('user')}Profil</button>
  <button data-act="go" data-go="panduan">${i('book')}Panduan</button>
  <div class="np-theme"><div class="row" style="gap:10px;padding:8px 4px">${i('sun')}Tema</div><div class="seg" style="width:100%">${[
      ['terang', 'Terang'],
      ['gelap', 'Gelap'],
  ]
      .map(
          ([k, t]) =>
              `<button class="${th === k ? 'on' : ''}" data-act="theme" data-v="${k}" style="flex:1">${t}</button>`,
      )
      .join('')}</div></div>
  <hr><button data-act="logout" style="color:var(--red)">${i('logout')}Keluar</button>`;
    placeUnder(btn, m, 270);
}
function applyTheme() {
    const t = UI.theme || 'terang';
    const dark = t === 'gelap';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
try {
    UI.theme =
        localStorage.getItem(KEY + '-theme') === 'gelap' ? 'gelap' : 'terang';
} catch (e) {
    UI.theme = 'terang';
}
applyTheme();

/* ----- Profil ----- */
function profilView() {
    const p = prof(),
        scopeTxt =
            UI.role === 'ku'
                ? unitOf(ACC.ku.unit).nama
                : UI.role === 'kd'
                  ? divOf(ACC.kd.div).nama
                  : 'Semua unit';
    later(bindProfil);
    return `<div class="content"><div class="pf-wrap">
   <section class="card">
    <div class="pf-head">${p.foto ? `<img class="pf-av" src="${p.foto}" alt="Foto profil">` : `<span class="pf-av">${ini(p.nama)}</span>`}
     <div class="grow"><h2 style="font-size:18px">${esc(p.nama)}</h2><div class="muted">${ACC[UI.role].short}, ${scopeTxt}</div></div>
     <label class="btn" style="cursor:pointer">${i('camera')}Ganti foto<input type="file" accept="image/*" id="pfFoto" hidden></label></div>
    <div class="card-body grid2">
     <label class="fld"><span>Nama lengkap <i class="req">*</i></span><input class="f" id="pfNama" value="${esc(p.nama)}"></label>
     <label class="fld"><span>${UI.role === 'hc' ? 'Cakupan' : UI.role === 'kd' ? 'Divisi' : 'Unit'}</span><input class="f" value="${esc(scopeTxt)}" disabled></label>
     <label class="fld"><span>Email <i class="req">*</i></span><input class="f" id="pfEmail" type="email" value="${esc(p.email)}"></label>
     <label class="fld"><span>Nomor HP <i class="req">*</i></span><span class="pre"><span>+62</span><input class="f" id="pfHp" inputmode="tel" placeholder="812 3456 7890" value="${esc(p.hp)}"></span></label>
    </div>
    <div class="card-foot"><span class="small grow" id="pfMsg" style="color:var(--red)"></span><button class="btn ghost" data-act="pfCancel">Batal</button><button class="btn pri" data-act="pfSave" id="pfSave" disabled>Simpan</button></div>
   </section>
   <section class="card">
    <div class="card-h"><h2>Kata sandi</h2><button class="btn ghost sm" data-act="pwShow">${i('eye')}<span id="pwLbl">Tampilkan</span></button></div>
    <div class="card-body grid3">
     <label class="fld"><span>Kata sandi saat ini</span><input class="f pw" type="password" id="pw0" autocomplete="current-password"></label>
     <label class="fld"><span>Kata sandi baru</span><input class="f pw" type="password" id="pw1" placeholder="Minimal 8 karakter" autocomplete="new-password"></label>
     <label class="fld"><span>Ulangi kata sandi baru</span><input class="f pw" type="password" id="pw2" autocomplete="new-password"></label>
    </div>
    <div class="card-foot"><span class="small grow" id="pwMsg" style="color:var(--red)"></span><button class="btn pri" data-act="pwSave" id="pwSave" disabled>Ubah kata sandi</button></div>
   </section>
   <section class="card">
    <div class="card-h"><h2>Pemberitahuan</h2></div>
    <div class="card-body">
     <label class="chk"><input type="checkbox" id="nEmail" ${p.notifEmail ? 'checked' : ''}>Kirim notifikasi ke email</label>
    </div>
   </section>
  </div></div>`;
}
function bindProfil() {
    const p = prof(),
        v = (id) => $('#' + id).value.trim();
    const chk = () => {
        const ch =
            v('pfNama') !== p.nama ||
            v('pfEmail') !== p.email ||
            v('pfHp') !== p.hp;
        const ok =
            v('pfNama') &&
            /^\S+@\S+\.\S+$/.test(v('pfEmail')) &&
            v('pfHp').replace(/\D/g, '').length >= 9;
        $('#pfSave').disabled = !(ch && ok);
        $('#pfMsg').textContent =
            ch && !ok
                ? 'Isi nama, email yang valid, dan nomor HP (minimal 9 angka).'
                : '';
    };
    ['pfNama', 'pfEmail', 'pfHp'].forEach((id) =>
        $('#' + id).addEventListener('input', chk),
    );
    const pw = () => {
        const a = $('#pw0').value,
            b = $('#pw1').value,
            c = $('#pw2').value;
        $('#pwMsg').textContent =
            b && b.length < 8
                ? 'Kata sandi baru minimal 8 karakter.'
                : c && b !== c
                  ? 'Ulangi kata sandi baru belum sama.'
                  : '';
        $('#pwSave').disabled = !(a && b.length >= 8 && b === c);
    };
    document
        .querySelectorAll('.pw')
        .forEach((x) => x.addEventListener('input', pw));
    $('#nEmail').addEventListener('change', () => {
        p.notifEmail = $('#nEmail').checked;
        save();
        toast('Pemberitahuan disimpan');
    });
    $('#pfFoto').addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (!f) return;
        if (f.size > 2e6) {
            toast('Ukuran foto maksimal 2 MB');
            return;
        }
        const r = new FileReader();
        r.onload = () => {
            p.foto = r.result;
            save();
            toast('Foto profil diganti');
            refresh();
        };
        r.readAsDataURL(f);
    });
}

/* ----- Panduan ----- */
const GUIDE_COMMON = () => [
    [
        'mulai',
        'Kenali tampilan',
        'home',
        `<p>Semua peran memakai tampilan yang sama. Berikut bagian-bagian yang paling sering dipakai.</p>
  <div class="gd-feat">
   <div class="gd-f"><span class="gd-ic">${i('menu')}</span><b>Menu samping</b><p>Berisi halaman sesuai peranmu. Tekan ☰ di kiri atas untuk meringkasnya menjadi ikon saja.</p></div>
   <div class="gd-f"><span class="gd-ic">${i('clock')}</span><b>Periode penilaian</b><p>Klik "Penilaian ${BULAN[AKTIF]} ${TAHUN}" di kanan atas untuk pindah bulan. Periode Final hanya bisa dilihat.</p></div>
   <div class="gd-f"><span class="gd-ic">${i('search')}</span><b>Cari</b><p>Klik kolom cari atau tekan <kbd>Ctrl</kbd> <kbd>K</kbd>. Cari karyawan lewat nama, NIP, unit, atau status. Riwayat pencarian bisa dihapus.</p></div>
   <div class="gd-f"><span class="gd-ic">${i('bell')}</span><b>Notifikasi</b><p>Titik hijau berarti belum dibaca. Klik notifikasi untuk langsung membuka halamannya.</p></div>
   <div class="gd-f"><span class="gd-ic">${i('ok')}</span><b>Konfirmasi</b><p>Mengajukan, menarik kembali, menyalin nilai, dan keluar selalu dikonfirmasi. Nilai yang belum disimpan ditawarkan untuk disimpan sebagai draft.</p></div>
   <div class="gd-f"><span class="gd-ic">${i('user')}</span><b>Akun dan tema</b><p>Klik namamu di kanan atas untuk membuka Profil, Panduan, memilih tema terang atau gelap, dan keluar.</p></div>
  </div>`,
    ],
    [
        'rumus',
        'Cara menghitung nilai',
        'chart',
        `<p>Setiap KPI diberi nilai 10 sampai 100, dikali bobotnya, lalu semua hasilnya dijumlahkan.</p>
  <div class="gd-formula"><div class="t"><b>Nilai</b><small>10 sampai 100</small></div><span class="op">×</span><div class="t"><b>Bobot KPI</b><small>dalam persen</small></div><span class="op">=</span><div class="t"><b>Hasil</b><small>per KPI</small></div><span class="op">→</span><div class="t hl"><b>Total nilai</b><small>jumlah semua hasil</small></div></div>
  <table><tr><th>Contoh KPI</th><th class="r">Nilai</th><th class="r">Bobot</th><th class="r">Hasil</th></tr><tr><td>Kunjungan Pasien UGD</td><td class="r">90</td><td class="r">15%</td><td class="r">13,50</td></tr><tr><td>Pencapaian Pelatihan</td><td class="r">80</td><td class="r">10%</td><td class="r">8,00</td></tr><tr><td>Implementasi Budaya Prima</td><td class="r">100</td><td class="r">10%</td><td class="r">10,00</td></tr></table>
  <p>Total bobot semua KPI dalam satu jabatan selalu 100%, jadi total nilai juga berada di rentang 10 sampai 100. Total itu menentukan kategori:</p>
  <div class="gd-scale"><div class="c-K"><b>Kurang</b><span>di bawah ${S.set.c}</span></div><div class="c-C"><b>Cukup</b><span>${S.set.c} – ${S.set.b}</span></div><div class="c-B"><b>Baik</b><span>${S.set.b} – ${S.set.sb}</span></div><div class="c-SB"><b>Sangat Baik</b><span>${S.set.sb} ke atas</span></div></div>
  <div class="gd-tip">${i('help')}<div>Temuan positif dan temuan negatif adalah catatan pendukung. Keduanya tidak mengubah angka total.</div></div>`,
    ],
    [
        'alur',
        'Alur dan status penilaian',
        'swap',
        `<p>Setiap karyawan punya satu penilaian per bulan. Penilaian itu berpindah dari Kepala Unit ke Kepala Divisi, lalu ke SDM.</p>
  <div class="gd-flow"><div><span>1</span><b>Kepala Unit</b><small>memberi nilai dan mengajukan</small></div><div><span>2</span><b>Kepala Divisi</b><small>menyetujui atau mengembalikan</small></div><div><span>3</span><b>SDM</b><small>memfinalkan</small></div></div>
  <table><tr><th>Status</th><th>Artinya</th><th>Giliran</th></tr>
  <tr><td>${st('Belum')}</td><td>Nilai bulan ini belum diisi sama sekali</td><td>Kepala Unit</td></tr>
  <tr><td>${st('Draft')}</td><td>Sebagian nilai sudah diisi dan disimpan</td><td>Kepala Unit</td></tr>
  <tr><td>${st('Diajukan')}</td><td>Menunggu ditinjau Kepala Divisi</td><td>Kepala Divisi</td></tr>
  <tr><td>${st('Dikembalikan')}</td><td>Perlu diperbaiki sesuai catatan</td><td>Kepala Unit</td></tr>
  <tr><td>${st('Disetujui')}</td><td>Sudah disetujui, menunggu finalisasi</td><td>SDM</td></tr>
  <tr><td>${st('Final')}</td><td>Nilai terkunci dan tidak bisa diubah</td><td>Selesai</td></tr></table>
  <div class="gd-dates"><div><small>Batas pengisian</small><b>${S.set.isi}</b></div><div><small>Batas persetujuan</small><b>${S.set.setuju}</b></div><div><small>Siklus ditutup</small><b>${S.set.tutup}</b></div></div>`,
    ],
];
const TIP = (t) => `<div class="gd-tip">${i('help')}<div>${t}</div></div>`;
const GUIDE_ROLE = {
    ku: [
        [
            'isi',
            'Mengisi nilai karyawan',
            'edit',
            'Isi nilai 10–100 untuk tiap KPI, lalu ajukan.',
            'nilai',
            `<ol><li>Buka menu <b>Isi nilai</b>.</li><li>Pilih karyawan di daftar kiri. Gunakan filter <b>Perlu diisi</b> untuk menampilkan yang belum selesai.</li><li>Ketik nilai 10 sampai 100 di kolom <b>Nilai</b> untuk setiap KPI. Tekan <kbd>Enter</kbd> untuk pindah ke KPI berikutnya.</li><li>Kolom <b>Hasil</b> dan <b>Total nilai</b> terhitung otomatis, lengkap dengan kategorinya.</li><li>Tulis temuan positif atau temuan negatif bila ada.</li><li>Klik <b>Simpan draft</b> bila belum selesai, atau <b>Ajukan ke Kepala Divisi</b> bila semua nilai sudah terisi. Setelah itu aplikasi langsung membuka karyawan berikutnya.</li></ol>${TIP('Klik <b>Salin nilai bulan lalu</b> untuk mengisi semua KPI dengan nilai bulan sebelumnya, lalu ubah yang berbeda saja.')}`,
        ],
        [
            'perbaiki',
            'Memperbaiki yang dikembalikan',
            'warn',
            'Baca catatan Kepala Divisi, ubah nilai, ajukan lagi.',
            'pengajuan',
            `<ol><li>Penilaian yang dikembalikan muncul di notifikasi, di Beranda, dan di menu <b>Pengajuan</b> tab <b>Dikembalikan</b>, lengkap dengan catatan Kepala Divisi.</li><li>Klik <b>Perbaiki</b> untuk membuka lembar nilainya.</li><li>Ubah nilai sesuai catatan, lalu klik <b>Ajukan ke Kepala Divisi</b> lagi.</li></ol>`,
        ],
        [
            'tarik',
            'Menarik kembali pengajuan',
            'swap',
            'Ubah nilai yang sudah diajukan selama belum disetujui.',
            'pengajuan',
            `<p>Selama penilaian belum disetujui, kamu bisa menariknya kembali untuk diubah.</p><ol><li>Buka menu <b>Pengajuan</b>, tab <b>Menunggu</b>.</li><li>Klik <b>Tarik kembali</b> di baris karyawan tersebut, lalu konfirmasi.</li><li>Status kembali menjadi Draft dan nilainya bisa diubah di menu Isi nilai.</li></ol>`,
        ],
        [
            'riwayat',
            'Melihat riwayat dan KPI unit',
            'clock',
            'Tren nilai 12 bulan dan daftar KPI tiap jabatan.',
            'riwayat',
            `<ul><li><b>Riwayat</b> menampilkan tren rata-rata nilai unit dan nilai tiap karyawan selama 12 bulan. Klik angka di tabel untuk membuka lembar nilai bulan itu.</li><li>Klik <b>Export Excel</b> di halaman Riwayat untuk mengunduh nilai 12 bulan semua karyawan unit dalam format template KPI. Untuk satu karyawan saja, klik tombol <b>Excel</b> di lembar nilainya.</li><li><b>KPI unit</b> menampilkan daftar KPI, target, dan bobot untuk setiap jabatan di unitmu. KPI hanya bisa diubah oleh SDM.</li></ul>`,
        ],
    ],
    kd: [
        [
            'tinjau',
            'Meninjau penilaian',
            'eye',
            'Buka lembar nilai yang diajukan Kepala Unit.',
            'persetujuan',
            `<ol><li>Buka menu <b>Persetujuan</b>, tab <b>Menunggu</b>. Penilaian dikelompokkan per unit.</li><li>Klik nama karyawan untuk membuka lembar nilainya di panel kanan.</li><li>Periksa nilai tiap KPI. Kolom <b>vs bulan lalu</b> menunjukkan kenaikan atau penurunan dibanding bulan sebelumnya.</li><li>Baca temuan positif dan temuan negatif dari Kepala Unit.</li></ol>`,
        ],
        [
            'setujui',
            'Menyetujui atau mengembalikan',
            'ok',
            'Setujui bila sesuai, kembalikan dengan catatan bila tidak.',
            'persetujuan',
            `<ul><li>Klik <b>Setujui</b> bila nilai sudah sesuai. Panel langsung membuka penilaian berikutnya yang menunggu.</li><li>Klik <b>Kembalikan</b> bila ada yang perlu diperbaiki. Catatan wajib diisi supaya Kepala Unit tahu apa yang harus diubah.</li></ul>${TIP('Kepala Divisi tidak mengubah angka nilai. Bila ada nilai yang kurang tepat, kembalikan dengan catatan.')}`,
        ],
        [
            'sekaligus',
            'Menyetujui beberapa sekaligus',
            'check',
            'Centang beberapa karyawan, setujui dalam satu klik.',
            'persetujuan',
            `<ol><li>Di tab <b>Menunggu</b>, centang kotak di depan nama karyawan yang ingin disetujui.</li><li>Klik <b>Setujui N penilaian</b>. Bila tidak ada yang dicentang, tombolnya menjadi <b>Setujui semua</b>.</li><li>Periksa daftar nama di jendela konfirmasi, lalu klik <b>Setujui</b>.</li></ol>`,
        ],
        [
            'pantau',
            'Memantau unit di divisimu',
            'chart',
            'Progres tiap unit, pengingat, dan dashboard divisi.',
            'dashboard',
            `<ul><li><b>Beranda</b> menampilkan progres tiap unit. Klik <b>Kirim pengingat</b> untuk unit yang belum selesai menilai.</li><li><b>Dashboard divisi</b> menampilkan rata-rata nilai, sebaran kategori, tren 12 bulan, nilai per KPI, peringkat, dan temuan. Gunakan filter unit, jabatan, dan kategori.</li><li>Klik <b>Export Excel</b> di Dashboard untuk mengunduh nilai 12 bulan seluruh divisi atau satu unit dalam format template KPI.</li></ul>`,
        ],
    ],
    hc: [
        [
            'final',
            'Memfinalkan penilaian',
            'lock',
            'Kunci penilaian yang sudah disetujui Kepala Divisi.',
            'rekap',
            `<ol><li>Buka menu <b>Rekap &amp; finalisasi</b>, tab <b>Siap difinalkan</b>.</li><li>Klik nama karyawan untuk memeriksa lembar nilainya, lalu klik <b>Finalkan</b>.</li><li>Untuk memfinalkan semuanya, klik <b>Finalkan N penilaian</b> lalu konfirmasi.</li><li>Nilai Final terkunci. Gunakan <b>Kembalikan</b> bila penilaian perlu diperiksa ulang oleh Kepala Unit.</li></ol>`,
        ],
        [
            'rekap',
            'Export rekap ke Excel',
            'dl',
            'Unduh nilai 12 bulan dalam format template KPI.',
            'rekap',
            `<ol><li>Di menu <b>Rekap &amp; finalisasi</b> atau <b>Dashboard</b>, klik <b>Export Excel</b>.</li><li>Pilih cakupan: seluruh rumah sakit, satu divisi, satu unit, atau satu karyawan, lalu klik <b>Unduh Excel</b>.</li><li>File berisi sheet <b>Ringkasan</b> (total nilai tiap bulan per karyawan) dan satu sheet per karyawan dengan kolom Pilar, KPI, Numerator, Denominator, Formula Pengukuran, Target, Bobot KPI, lalu Januari sampai Desember. Total nilai dan kategori memakai rumus Excel.</li></ol><p>Untuk menempel cepat tanpa file, klik <b>Salin</b>:</p><ol><li>Klik <b>Salin</b> di menu Rekap &amp; finalisasi.</li><li>Buka Excel atau Google Sheets, klik sel A1, lalu tempel dengan <kbd>Ctrl</kbd> <kbd>V</kbd>.</li><li>Kolom yang tersalin: nama, jabatan, unit, divisi, bulan, status, total nilai, kategori, temuan positif, dan temuan negatif.</li></ol>`,
        ],
        [
            'kpi',
            'Mengelola Master KPI',
            'table',
            'Ubah KPI, target, dan bobot tiap jabatan.',
            'kpi',
            `<p>Klik <b>Unduh template</b> untuk mendapatkan file Excel kosong semua jabatan dengan kolom yang sama seperti template awal.</p><ol><li>Buka menu <b>Master KPI</b> dan pilih template jabatan di bagian atas.</li><li>Ubah Pilar, KPI, Numerator, Denominator, Formula Pengukuran, Target, dan Bobot langsung di tabel.</li><li>Klik <b>Tambah KPI</b> untuk baris baru, atau ikon tempat sampah untuk menghapus.</li><li>Pastikan total bobot 100%, lalu klik <b>Simpan perubahan</b>.</li><li>Untuk banyak KPI sekaligus, klik <b>Upload Excel</b>, pilih file dengan kolom yang sama seperti sheet Master KPI, periksa pratinjaunya, lalu klik <b>Impor</b>.</li></ol>${TIP('Klik tombol + di samping nama template untuk membuat template jabatan baru.')}`,
        ],
        [
            'karyawan',
            'Menambah dan mengubah karyawan',
            'users',
            'Tambah karyawan baru, ubah data, atau nonaktifkan.',
            'karyawan',
            `<ol><li>Buka menu <b>Karyawan</b>, lalu klik <b>Tambah karyawan</b>.</li><li>Isi nama lengkap, NIP, jabatan, dan unit. Penilai otomatis mengikuti Kepala Unit yang dipilih.</li><li>Pilih <b>Template KPI</b>. Bila jabatannya sama dengan karyawan lain, template terisi otomatis.</li><li>Pilih <b>Mulai dinilai</b>, lalu klik <b>Tambah karyawan</b>. Karyawan langsung muncul di menu Isi nilai milik Kepala Unit mulai bulan itu.</li></ol><ul><li>Klik nama karyawan untuk mengubah datanya. Template KPI diubah lewat <b>Penempatan KPI</b>.</li><li>Untuk karyawan yang resign atau pindah, klik <b>Nonaktifkan</b> dan pilih bulannya. Nilai yang sudah ada tetap tersimpan.</li><li>Klik <b>Tambah kepala unit</b> untuk menunjuk kepala baru di unit yang sudah ada, atau membuat unit baru beserta kepalanya. Daftar semua kepala unit ada di tab <b>Kepala unit</b>.</li></ul>`,
        ],
        [
            'penempatan',
            'Mengatur KPI per karyawan',
            'swap',
            'Pilih karyawan, template, dan bulan berlakunya.',
            'penempatan',
            `<p>Dipakai saat karyawan pindah jabatan, mutasi, atau butuh KPI khusus. Caranya mirip mengatur jadwal shift: tentukan polanya sekali, lalu sistem mengisi bulan-bulannya.</p><ol><li>Buka menu <b>Penempatan KPI</b>, lalu klik <b>Atur KPI</b>. Bisa juga klik <b>Pindah</b> di samping nama karyawan.</li><li>Pilih satu atau beberapa karyawan lewat kolom <b>Cari karyawan</b>.</li><li>Pilih <b>Template jabatan</b> yang sudah ada, atau <b>Susun manual</b> untuk memilih KPI satu per satu beserta bobotnya. Total bobot harus 100%.</li><li>Isi <b>Mulai bulan</b>, lalu pilih <b>Tanpa akhir</b> atau <b>Sampai bulan</b>.</li><li>Periksa ringkasan jumlah bulan yang akan diubah, lalu klik <b>Simpan</b>.</li></ol>${TIP('Karyawan dikelompokkan per template untuk bulan yang dipilih di periode atas. Label seperti <b>Des → YJM</b> artinya template berganti mulai bulan itu. Bulan yang sudah dinilai terkunci supaya nilai lama tidak tercampur dengan KPI baru.')}`,
        ],
        [
            'atur',
            'Mengatur siklus dan kategori',
            'sliders',
            'Tanggal batas dan ambang kategori nilai.',
            'pengaturan',
            `<ol><li>Buka menu <b>Pengaturan</b>.</li><li>Isi batas pengisian Kepala Unit, batas persetujuan Kepala Divisi, dan tanggal siklus ditutup.</li><li>Ubah batas kategori Sangat Baik, Baik, dan Cukup bila perlu. Perubahan langsung dipakai di semua halaman.</li><li>Klik <b>Simpan pengaturan</b>.</li></ol>`,
        ],
        [
            'pantau',
            'Memantau seluruh rumah sakit',
            'chart',
            'Tahapan siklus, progres divisi, dan dashboard.',
            'dashboard',
            `<ul><li><b>Beranda</b> menampilkan tahapan siklus bulan ini, progres per divisi dan unit, serta aktivitas terbaru.</li><li><b>Dashboard</b> bisa difilter per divisi, unit, jabatan, dan kategori.</li></ul>`,
        ],
    ],
};
const GUIDE_FAQ = [
    [
        'Kenapa tombol Ajukan tidak bisa dipakai?',
        'Semua KPI harus terisi angka 10 sampai 100. Kolom yang salah ditandai merah.',
    ],
    [
        'Bisakah nilai diubah setelah diajukan?',
        'Bisa, dengan Tarik kembali selama belum disetujui. Setelah disetujui, nilai hanya bisa diubah bila dikembalikan oleh Kepala Divisi atau SDM.',
    ],
    [
        'Nilai sudah Final tapi ternyata ada yang salah. Bagaimana?',
        'Hubungi SDM. Hanya SDM yang bisa membuka kunci penilaian yang sudah final.',
    ],
    [
        'Apakah temuan memengaruhi total nilai?',
        'Tidak. Temuan adalah catatan pendukung untuk Kepala Divisi dan SDM.',
    ],
    [
        'Lupa kata sandi?',
        'Di halaman masuk, klik Lupa kata sandi?, lalu masukkan email kantor atau NIP. Tautan untuk membuat kata sandi baru dikirim ke email yang terdaftar dan berlaku 15 menit.',
    ],
    [
        'Kenapa tidak bisa masuk setelah beberapa kali mencoba?',
        'Setelah 5 kali salah kata sandi, halaman masuk dikunci 30 detik demi keamanan. Tunggu sebentar lalu coba lagi, atau pakai Lupa kata sandi?.',
    ],
    [
        'Bagaimana mengganti kata sandi atau nomor HP?',
        'Klik nama kamu di kanan atas, pilih Profil, ubah datanya, lalu klik Simpan.',
    ],
];
const gTitle = (g) => {
    const t = TITLES[g];
    return typeof t === 'object' ? t[UI.role] : t;
};
function panduanView() {
    later(gdSpy);
    const r =
        UI.role === 'hc' && UI.tab.gd && GUIDE_ROLE[UI.tab.gd]
            ? UI.tab.gd
            : UI.role;
    const mine = r === UI.role;
    later(gdShots);
    const sec = (id, t, ic, body, go) => {
        const tr = TOURS[r] && TOURS[r][id];
        return `<section class="gd-sec" id="g-${id}"><div class="gd-sh"><span class="gd-ic">${i(ic)}</span><h2>${t}</h2></div>${tr ? shotFig(r, id) : ''}${body}${(tr || go) && mine ? `<div class="gd-acts">${tr ? `<button class="btn sm pri" data-act="tourStart" data-t="${id}">${i('play')}Tunjukkan di aplikasi</button>` : ''}${go ? `<button class="btn sm gd-go" data-act="go" data-go="${go}">Buka ${gTitle(go)} ${i('r')}</button>` : ''}</div>` : tr ? `<p class="small muted gd-tnote">Tur interaktif tersedia saat masuk sebagai ${ACC[r].short}.</p>` : ''}</section>`;
    };
    const roleSecs = GUIDE_ROLE[r];
    const toc = [
        ['Dasar', GUIDE_COMMON().map((x) => [x[0], x[1]])],
        ['Untuk ' + ACC[r].short, roleSecs.map((x) => [x[0], x[1]])],
        ['Bantuan', [['faq', 'Pertanyaan umum']]],
    ];
    return `<div class="content"><div class="gd">
   <div class="gd-hero"><div class="gd-eye">Panduan penggunaan</div><h1 class="lead">Cara memakai ABprove</h1>
    <p class="ink2">Langkah demi langkah untuk ${ACC[r].short}.${UI.role === 'hc' ? ' Sebagai Super HC, kamu juga bisa membuka panduan peran lain untuk membantu Kepala Unit dan Kepala Divisi.' : ''}</p></div>
   ${
       UI.role === 'hc'
           ? `<div class="gd-tabs" role="tablist">${['hc', 'ku', 'kd']
                 .map((k) => [k, ACC[k]])
                 .map(
                     ([k, a]) =>
                         `<button role="tab" class="${k === r ? 'on' : ''}" data-act="tab" data-k="gd" data-v="${k}">${a.short}${k === UI.role ? `<span class="you">Peranmu</span>` : ''}</button>`,
                 )
                 .join('')}</div>`
           : `<div class="gd-tabs gd-solo"></div>`
   }
   <div class="gd-grid">
    <nav class="gd-toc" aria-label="Isi panduan">${toc.map(([g, items]) => `<div class="grp">${g}</div>${items.map(([id, t]) => `<button data-act="toc" data-id="${id}">${t}</button>`).join('')}`).join('')}</nav>
    <article class="gd-art">
     <div class="gd-quick-h">Yang paling sering dilakukan ${ACC[r].short}</div>
     <div class="gd-quick">${roleSecs.map(([id, t, ic, d]) => `<button class="gd-q" data-act="toc" data-id="${id}"><span class="gd-ic">${i(ic)}</span><span><b>${t}</b><span>${d}</span></span></button>`).join('')}</div>
     ${GUIDE_COMMON()
         .map(([id, t, ic, h]) => sec(id, t, ic, h))
         .join('')}
     ${roleSecs.map(([id, t, ic, d, go, h]) => sec(id, t, ic, h, go)).join('')}
     ${sec('faq', 'Pertanyaan umum', 'help', `<div class="gd-faq">${GUIDE_FAQ.map(([q, a]) => `<details><summary>${q}${i('chev')}</summary><p>${a}</p></details>`).join('')}</div>`)}
    </article>
   </div></div></div>`;
}
function gdSpy() {
    const t = document.querySelector('.gd-toc');
    if (!t) return;
    let cur = null;
    document.querySelectorAll('.gd-sec').forEach((s) => {
        if (s.getBoundingClientRect().top < 160) cur = s.id.slice(2);
    });
    if (!cur) {
        const f = document.querySelector('.gd-sec');
        cur = f && f.id.slice(2);
    }
    t.querySelectorAll('button').forEach((b) =>
        b.classList.toggle('on', b.dataset.id === cur),
    );
}
window.addEventListener('scroll', gdSpy, { passive: true });

/* =========================================================
   TAMBAHAN: NIP, konfirmasi, penjaga perubahan, periode, pencarian cepat
   ========================================================= */
EMPS.forEach((e, k) => {
    e.nip = String(1987040 + k * 113);
});
const LC = {
    Diajukan: '6 Nov, 14.10',
    Dikembalikan: '6 Nov, 16.05',
    Disetujui: '7 Nov, 09.30',
    Draft: '5 Nov, 10.24',
    Final: 'Okt 2026',
};
function lastChange(x) {
    if (x.log && x.log.length)
        return (
            'Hari ini, ' + String(x.log[x.log.length - 1].t).replace(':', '.')
        );
    return x.status === 'Belum' ? '–' : LC[x.status] || '–';
}
const confirmBox = (title, body, btn, act, extra = '') =>
    modal(
        `<h2>${title}</h2><div class="ink2" style="margin:8px 0 0">${body}</div>${extra}<div class="row" style="justify-content:flex-end;margin-top:20px;gap:8px"><button class="btn ghost" data-act="close">Batal</button>${btn.replace('%A', act)}</div>`,
    );
function guard(fn) {
    if (
        UI.dirty &&
        UI.view === 'nilai' &&
        document.querySelector('.score-in')
    ) {
        A._after = fn;
        modal(
            `<h2>Perubahan belum disimpan</h2><p class="ink2" style="margin:8px 0 0">Simpan draft dulu supaya nilai yang sudah diisi tidak hilang.</p><div class="row" style="justify-content:flex-end;margin-top:20px;gap:8px"><button class="btn ghost" data-act="close">Batal</button><button class="btn" data-act="guardDiscard">Buang perubahan</button><button class="btn pri" data-act="guardSave">Simpan draft</button></div>`,
        );
        return;
    }
    fn();
}
function openPeriod(btn) {
    const m = $('#menu');
    m.className = 'menu pop-period';
    const es = scope();
    const rows = [];
    for (let k = AKTIF; k >= 0; k--) {
        const fin = es.every((e) => ev(e.id, k).status === 'Final');
        rows.push(
            `<button data-act="setMonth" data-m="${k}" class="${k === UI.month ? 'cur' : ''}"><span class="grow">Penilaian ${BULAN[k]} ${TAHUN}</span><span class="small" style="color:${k === AKTIF ? 'var(--red)' : 'var(--mute)'};font-weight:600">${k === AKTIF ? 'Aktif' : fin ? 'Final' : 'Finalisasi'}</span></button>`,
        );
    }
    m.innerHTML = `<div class="small muted" style="padding:8px 10px 6px">Pilih periode yang dinilai. Periode Final hanya bisa dilihat.</div><div style="max-height:380px;overflow:auto">${rows.join('')}</div>`;
    placeUnder(btn, m, 300);
}
function openPalette() {
    modal(
        `<div class="pal-in">${i('search')}<input id="palq" placeholder="Cari halaman, nama karyawan, atau NIP" autocomplete="off"><kbd>Esc</kbd></div><div id="palr" class="pal-r"></div><div class="small muted pal-f">↑ ↓ untuk memilih, Enter untuk membuka</div>`,
    );
    $('#modal').classList.add('wide');
    const q = $('#palq');
    let sel = 0,
        items = [];
    const draw = () => {
        const s = q.value.trim().toLowerCase();
        const pages = [
            ...NAV[UI.role],
            ['panduan', 'Panduan', 'book'],
            ['profil', 'Profil', 'user'],
        ].map(([k, t, ic]) => ({ k: 'page', go: k, t, ic, sub: 'Halaman' }));
        const people = scope().map((e) => ({
            k: 'emp',
            id: e.id,
            t: e.nama,
            ic: 'user',
            sub: `${e.jab}, NIP ${e.nip}, ${unitOf(e.unit).nama}`,
        }));
        items = [...pages, ...people]
            .filter(
                (x) =>
                    !s ||
                    x.t.toLowerCase().includes(s) ||
                    x.sub.toLowerCase().includes(s),
            )
            .slice(0, 9);
        sel = Math.min(sel, Math.max(0, items.length - 1));
        A._pal = items;
        $('#palr').innerHTML = items.length
            ? items
                  .map(
                      (x, n) =>
                          `<button class="pal-i ${n === sel ? 'on' : ''}" data-act="palPick" data-n="${n}">${i(x.ic)}<span class="grow"><b>${esc(x.t)}</b><span class="small muted">${esc(x.sub)}</span></span></button>`,
                  )
                  .join('')
            : `<div class="empty small">Tidak ada hasil untuk "${esc(q.value)}".</div>`;
    };
    q.addEventListener('input', () => {
        sel = 0;
        draw();
    });
    q.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            sel = Math.min(items.length - 1, sel + 1);
            draw();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            sel = Math.max(0, sel - 1);
            draw();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            palPick(sel);
        }
    });
    draw();
    setTimeout(() => q.focus(), 30);
}
function palPick(n) {
    const x = (A._pal || [])[n];
    if (!x) return;
    closeAll();
    if (x.k === 'page') return A.go({ dataset: { go: x.go } });
    UI.month = AKTIF;
    if (UI.role === 'ku') {
        UI.sel = x.id;
        A.go({ dataset: { go: 'nilai' } });
    } else openReview(x.id, UI.month, UI.role === 'kd' ? 'kd' : 'hc');
}
document.addEventListener('keydown', (e) => {
    if (UI.role && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        A.palette();
    }
});

function kuBeranda() {
    const m = UI.month,
        es = scope(),
        c = (s) => es.filter((e) => ev(e.id, m).status === s).length,
        n = es.length;
    const sub = c('Diajukan') + c('Disetujui') + c('Final'),
        ret = es.filter((e) => ev(e.id, m).status === 'Dikembalikan');
    const todo = es.filter((e) =>
            ['Belum', 'Draft', 'Dikembalikan'].includes(ev(e.id, m).status),
        ),
        next = todo.filter((e) => ev(e.id, m).status !== 'Dikembalikan');
    const fTrend = BLN.map((b, k) =>
        k > AKTIF
            ? null
            : avg(
                  es
                      .filter((e) => ev(e.id, k).status === 'Final')
                      .map((e) => total(e, k)),
              ),
    );
    const tpls = [
        ...new Set(es.flatMap((e) => BLN.map((b, n) => tplOf(e, n)))),
    ].filter((t) => TPL[t]);
    return `<div class="content"><div class="two"><div class="stack">
   <div><p class="muted" style="margin:0 0 4px">${greet()}, ${firstName(ACC.ku.nama)}.</p><h2 class="lead">${m === AKTIF ? (todo.length ? `${todo.length} dari ${n} karyawan belum diajukan.` : 'Semua penilaian bulan ini sudah diajukan.') : `Penilaian ${BULAN[m]} sudah selesai.`}</h2></div>
   <div class="figs">
     <div><div class="l">Karyawan unit</div><div class="v num">${n}</div><div class="s">${n} karyawan dalam unit</div></div>
     <div><div class="l">Sudah diajukan</div><div class="v num">${sub}</div><div class="s">${c('Diajukan')} menunggu Kepala Divisi</div></div>
     <div><div class="l">Dikembalikan</div><div class="v num ${c('Dikembalikan') ? 'k-C' : ''}">${c('Dikembalikan')}</div><div class="s">perlu perbaikan</div></div>
     <div><div class="l">Belum diajukan</div><div class="v num">${c('Belum') + c('Draft')}</div><div class="s">${c('Draft')} draft, ${c('Belum')} belum diisi</div></div></div>
   ${ret.length && m === AKTIF ? `<div><div class="row between" style="margin-bottom:8px"><h2>Perlu diperbaiki</h2><span class="chip" style="background:var(--amber-s);color:var(--amber);font-weight:600">${ret.length} penilaian</span></div>${ret.map((e) => `<div class="card fixcard"><div class="grow"><div class="row" style="gap:10px"><b>${e.nama}</b>${st('Dikembalikan')}</div><div class="small muted">${e.jab}, NIP ${e.nip}</div><div class="ink2" style="margin-top:8px">Catatan Kepala Divisi: ${esc(ev(e.id, m).note)}</div></div><button class="btn pri" data-act="openPerson" data-id="${e.id}">Perbaiki nilai</button></div>`).join('')}</div>` : ''}
   ${
       m === AKTIF
           ? `<div><h2 style="margin-bottom:8px">Pekerjaan berikutnya</h2>${
                 next.length
                     ? `<table><tr><th>Karyawan</th><th>Jabatan</th><th>Status</th><th>Terakhir diubah</th><th class="r">Tindakan</th></tr>${next
                           .map((e) => {
                               const x = ev(e.id, m);
                               return `<tr><td><div class="who"><span class="av sm">${ini(e.nama)}</span><div><b>${e.nama}</b><span>NIP ${e.nip}</span></div></div></td><td class="ink2">${e.jab}</td><td>${st(x.status)}</td><td class="small muted">${lastChange(x)}</td><td class="r"><button class="btn sm" data-act="openPerson" data-id="${e.id}">${x.status === 'Draft' ? 'Lanjutkan' : 'Mulai isi'}</button></td></tr>`;
                           })
                           .join('')}</table>`
                     : `<div class="card" style="padding:18px 20px"><span class="muted">Tidak ada pekerjaan tertunda.</span></div>`
             }</div>`
           : ''
   }
   <div><div class="row between" style="margin-bottom:8px"><h2>Tren rata-rata nilai Final</h2><a class="link" href="#" data-act="go" data-go="riwayat">Lihat rincian</a></div>${lineChart(fTrend)}</div>
  </div>
  <aside class="rail">
   <div class="card rc"><h2>Progres pengajuan</h2><div class="small muted" style="margin:12px 0 6px;text-align:right">${sub} dari ${n} sudah diajukan</div><div class="bar" style="height:8px"><i style="width:${n ? (sub / n) * 100 : 0}%;background:var(--red)"></i></div>
     <div class="small muted" style="margin-top:14px">Batas pengisian</div><div style="font-weight:600">${S.set.isi}, 23.59 WIB</div>
     ${todo.length && m === AKTIF ? `<button class="btn pri" style="width:100%;justify-content:center;margin-top:16px" data-act="go" data-go="nilai">Lanjutkan penilaian</button>` : ''}</div>
   <div class="card rc"><h2>Tindak lanjut unit</h2><ul class="tl"><li><span>Penilaian dikembalikan</span><b>${c('Dikembalikan')}</b></li><li><span>Draft belum diajukan</span><b>${c('Draft')}</b></li><li><span>Belum dinilai</span><b>${c('Belum')}</b></li><li><span>Menunggu Kepala Divisi</span><b>${c('Diajukan')}</b></li></ul><button class="btn" style="width:100%;justify-content:center" data-act="go" data-go="pengajuan">Pantau pengajuan</button></div>
   <div class="card rc"><h2>Template unit</h2>${tpls.map((t) => `<div style="margin-top:12px"><b style="font-weight:600">${TPL[t].nama}</b><div class="small muted">${TPL[t].kpi.length} KPI, bobot ${TPL[t].kpi.reduce((a, k) => a + (+k[6] || 0), 0)}%</div></div>`).join('')}<button class="btn" style="width:100%;justify-content:center;margin-top:16px" data-act="go" data-go="kpi">Lihat KPI unit</button></div>
  </aside></div></div>`;
}
function kuPengajuan() {
    const m = UI.month,
        es = scope(),
        tab = UI.tab.pj || 'semua',
        q = (UI.f.pjq || '').toLowerCase();
    const groups = [
        ['semua', 'Semua'],
        ['Dikembalikan', 'Dikembalikan'],
        ['Diajukan', 'Menunggu'],
        ['Disetujui', 'Disetujui'],
        ['Final', 'Final'],
        ['Belum', 'Belum diajukan'],
    ];
    const match = (e, t) => {
        const s = ev(e.id, m).status;
        return t === 'semua' || s === t || (t === 'Belum' && s === 'Draft');
    };
    const hit = (e) =>
        !q || e.nama.toLowerCase().includes(q) || e.nip.includes(q);
    const rows = es.filter((e) => match(e, tab) && hit(e));
    later(() => {
        const s = $('#pjq');
        if (s)
            s.oninput = () => {
                UI.f.pjq = s.value;
                const p = s.selectionStart;
                refresh();
                const n = $('#pjq');
                n.focus();
                n.setSelectionRange(p, p);
            };
    });
    return `<div class="content stack">
   <div class="row between wrap"><div class="seg">${groups.map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-k="pj" data-v="${k}">${t}<span class="c">${es.filter((e) => match(e, k)).length}</span></button>`).join('')}</div>
    <div class="search" style="width:280px">${i('search')}<input class="f" id="pjq" placeholder="Cari nama atau NIP" value="${esc(UI.f.pjq || '')}" style="width:100%;padding-left:32px"></div></div>
   ${
       rows.length
           ? `<div><table><tr><th>Nama</th><th>Berada di tahap</th><th>Status</th><th class="r">Total nilai</th><th>Kategori</th><th>Terakhir diubah</th><th></th></tr>
   ${rows
       .map((e) => {
           const x = ev(e.id, m),
               s = x.status;
           const pos =
               s === 'Belum' || s === 'Draft'
                   ? 'Kepala Unit'
                   : s === 'Dikembalikan'
                     ? 'Kembali ke Kepala Unit'
                     : s === 'Diajukan'
                       ? 'Kepala Divisi'
                       : s === 'Disetujui'
                         ? 'SDM'
                         : 'Selesai';
           const act =
               s === 'Diajukan'
                   ? `<button class="btn sm" data-act="withdraw" data-id="${e.id}">Tarik kembali</button>`
                   : ['Belum', 'Draft', 'Dikembalikan'].includes(s) &&
                       m === AKTIF
                     ? `<button class="btn sm ${s === 'Dikembalikan' ? 'warn' : ''}" data-act="openPerson" data-id="${e.id}">${s === 'Dikembalikan' ? 'Perbaiki' : s === 'Draft' ? 'Lanjutkan' : 'Mulai isi'}</button>`
                     : `<button class="btn sm ghost" data-act="view" data-id="${e.id}">Lihat detail</button>`;
           return `<tr>${personRow(e, m, `<td class="ink2">${pos}${s === 'Dikembalikan' ? `<div class="small" style="color:var(--amber)">${esc(x.note)}</div>` : ''}</td>`)}<td class="small muted">${lastChange(x)}</td><td class="r">${act}</td></tr>`;
       })
       .join('')}</table>
   <p class="small muted" style="margin:8px 2px 0">${rows.length} penilaian ditampilkan, ${BULAN[m]} ${TAHUN}.</p></div>`
           : `<div class="card" style="padding:32px;text-align:center"><b>Tidak ada penilaian pada status ini.</b><div class="small muted" style="margin-top:4px">Pilih status lain atau ubah pencarian.</div></div>`
   }
   <div class="info">${i('help')}<div><b>Penarikan pengajuan</b><div>Penilaian berstatus Diajukan masih bisa ditarik kembali selama belum disetujui Kepala Divisi.</div></div></div>
  </div>`;
}

/* ----- Halaman Cari (gaya Twitter: halaman sendiri + riwayat) ----- */
const HIST_SEED = {
    ku: [
        { k: 'emp', id: 'E01' },
        { k: 'q', q: 'draft' },
        { k: 'page', go: 'riwayat', t: 'Riwayat', ic: 'clock' },
    ],
    kd: [
        { k: 'emp', id: 'E06' },
        { k: 'q', q: 'rawat inap' },
        { k: 'page', go: 'dashboard', t: 'Dashboard divisi', ic: 'chart' },
    ],
    hc: [
        { k: 'q', q: 'radiologi' },
        { k: 'emp', id: 'E10' },
        { k: 'page', go: 'kpi', t: 'Master KPI', ic: 'table' },
    ],
};
function hist() {
    const H = S.hist || (S.hist = {});
    if (!H[UI.role])
        H[UI.role] = JSON.parse(JSON.stringify(HIST_SEED[UI.role] || []));
    return H[UI.role];
}
function pushHist(item) {
    const h = hist(),
        key = (x) => x.k + ':' + (x.id || x.q || x.go);
    const n = h.findIndex((x) => key(x) === key(item));
    if (n >= 0) h.splice(n, 1);
    h.unshift(item);
    if (h.length > 12) h.length = 12;
    save();
}
const hl = (t, s) => {
    t = String(t);
    if (!s) return esc(t);
    const k = t.toLowerCase().indexOf(s);
    return k < 0
        ? esc(t)
        : esc(t.slice(0, k)) +
              '<mark>' +
              esc(t.slice(k, k + s.length)) +
              '</mark>' +
              esc(t.slice(k + s.length));
};
function cariPages() {
    return [
        ...NAV[UI.role],
        ['panduan', 'Panduan', 'book'],
        ['profil', 'Profil', 'user'],
    ];
}
function cariResults(q) {
    const s = q.trim().toLowerCase(),
        m = AKTIF;
    if (!s) {
        const h = hist().filter((x) => x.k !== 'emp' || emp(x.id));
        return h.length
            ? `<div class="row between cari-h"><h2>Pencarian terakhir</h2><button class="link" data-act="histClear">Hapus semua</button></div><div class="card cari-list">${h
                  .map((x) => {
                      const n = hist().indexOf(x);
                      const e = x.k === 'emp' ? emp(x.id) : null;
                      const body =
                          x.k === 'q'
                              ? `<span class="ci">${i('clock')}</span><span class="grow"><b>${esc(x.q)}</b><span class="small muted">Kata kunci</span></span>`
                              : e
                                ? `<span class="av sm">${ini(e.nama)}</span><span class="grow"><b>${esc(e.nama)}</b><span class="small muted">${esc(e.jab)}, NIP ${e.nip}, ${unitOf(e.unit).nama}</span></span>`
                                : `<span class="ci">${i(x.ic || 'list')}</span><span class="grow"><b>${esc(x.t)}</b><span class="small muted">Halaman</span></span>`;
                      return `<div class="cari-row"><button class="cari-main" data-act="histOpen" data-n="${n}">${body}</button><button class="iconbtn" data-act="histDel" data-n="${n}" aria-label="Hapus dari riwayat" title="Hapus dari riwayat">${i('x')}</button></div>`;
                  })
                  .join('')}</div>`
            : `<div class="empty"><b style="color:var(--ink)">Belum ada riwayat pencarian</b><div class="small" style="margin-top:4px">Cari nama karyawan, NIP, atau halaman. Pencarianmu akan muncul di sini.</div></div>`;
    }
    const pages = cariPages().filter(([k, t]) => t.toLowerCase().includes(s));
    const people = scope().filter((e) =>
        [e.nama, e.nip, e.jab, unitOf(e.unit).nama, ev(e.id, m).status]
            .join(' ')
            .toLowerCase()
            .includes(s),
    );
    const tpls = [...new Set(scope().map((e) => tplOf(e, UI.month)))];
    const kpiHits = [];
    tpls.forEach((t) =>
        TPL[t].kpi.forEach((k) => {
            if ((k[1] + ' ' + k[0]).toLowerCase().includes(s))
                kpiHits.push([t, k]);
        }),
    );
    if (!pages.length && !people.length && !kpiHits.length)
        return `<div class="empty"><b style="color:var(--ink)">Tidak ada hasil untuk “${esc(q.trim())}”</b><div class="small" style="margin-top:4px">Coba nama lain, NIP, nama unit, atau nama halaman.</div></div>`;
    let h = '';
    if (people.length)
        h += `<div class="cari-sec"><h3>Karyawan</h3><div class="card cari-list">${people
            .slice(0, 8)
            .map((e) => {
                const x = ev(e.id, m),
                    t = total(e, m);
                return `<div class="cari-row"><button class="cari-main" data-act="cariEmp" data-id="${e.id}"><span class="av sm">${ini(e.nama)}</span><span class="grow" style="min-width:0"><b>${hl(e.nama, s)}</b><span class="small muted">${hl(e.jab, s)}, NIP ${hl(e.nip, s)}, ${hl(unitOf(e.unit).nama, s)}</span></span>${st(x.status)}<span class="num" style="width:60px;text-align:right;font-weight:600">${fmt(t)}</span></button></div>`;
            })
            .join(
                '',
            )}</div>${people.length > 8 ? `<div class="small muted" style="margin:6px 4px">${people.length - 8} karyawan lain cocok. Perjelas kata kuncinya.</div>` : ''}</div>`;
    if (pages.length)
        h += `<div class="cari-sec"><h3>Halaman</h3><div class="card cari-list">${pages.map(([k, t, ic]) => `<div class="cari-row"><button class="cari-main" data-act="cariPage" data-go="${k}" data-t="${esc(t)}" data-ic="${ic}"><span class="ci">${i(ic)}</span><span class="grow"><b>${hl(t, s)}</b><span class="small muted">Halaman</span></span>${i('r')}</button></div>`).join('')}</div></div>`;
    if (kpiHits.length)
        h += `<div class="cari-sec"><h3>KPI</h3><div class="card cari-list">${kpiHits
            .slice(0, 6)
            .map(
                ([t, k]) =>
                    `<div class="cari-row"><button class="cari-main" data-act="cariPage" data-go="kpi" data-t="${esc(TITLES.kpi[UI.role])}" data-ic="list" data-tpl="${t}"><span class="ci">${i('list')}</span><span class="grow"><b>${hl(k[1], s)}</b><span class="small muted">${esc(k[0])}, ${esc(TPL[t].nama)}, bobot ${k[6]}%</span></span>${i('r')}</button></div>`,
            )
            .join('')}</div></div>`;
    return h;
}
function cariView() {
    const q = UI.f.cq || '';
    later(bindCari);
    return `<div class="content"><div class="cari">
   <div class="cari-box">${i('search')}<input id="cq" class="cari-in" placeholder="Cari halaman, nama karyawan, NIP, atau KPI" value="${esc(q)}" autocomplete="off" aria-label="Cari"><button class="iconbtn" id="cqx" data-act="cqClear" aria-label="Hapus teks" style="${q ? '' : 'visibility:hidden'}">${i('x')}</button></div>
   <div id="cres">${cariResults(q)}</div></div></div>`;
}
function bindCari() {
    const inp = $('#cq');
    if (!inp) return;
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
    inp.addEventListener('input', () => {
        UI.f.cq = inp.value;
        $('#cres').innerHTML = cariResults(inp.value);
        $('#cqx').style.visibility = inp.value ? 'visible' : 'hidden';
    });
    inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && inp.value.trim()) {
            pushHist({ k: 'q', q: inp.value.trim() });
            const first = document.querySelector('#cres .cari-main');
            if (first) first.focus();
        }
    });
}
function openEmp(id) {
    UI.month = AKTIF;
    if (UI.role === 'ku') {
        UI.sel = id;
        A.go({ dataset: { go: 'nilai' } });
    } else openReview(id, UI.month, UI.role === 'kd' ? 'kd' : 'hc');
}

IC.dl = 'M12 4v11M7 10l5 5 5-5M4 19h16';
/* =========================================================
   EXPORT EXCEL (.xlsx) — kolom sesuai template awal:
   Pilar, KPI, Numerator, Denominator, Formula Pengukuran, Target, Bobot KPI, Jan … Des
   ========================================================= */
const XL = (() => {
    const CRC = (() => {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++)
                c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            t[n] = c >>> 0;
        }
        return t;
    })();
    const crc32 = (b) => {
        let c = 0xffffffff;
        for (let k = 0; k < b.length; k++)
            c = CRC[(c ^ b[k]) & 255] ^ (c >>> 8);
        return (c ^ 0xffffffff) >>> 0;
    };
    const enc = new TextEncoder();
    function zip(files) {
        const d = new Date(),
            dt =
                ((d.getHours() << 11) |
                    (d.getMinutes() << 5) |
                    (d.getSeconds() >> 1)) &
                0xffff,
            dd =
                (((d.getFullYear() - 1980) << 9) |
                    ((d.getMonth() + 1) << 5) |
                    d.getDate()) &
                0xffff;
        const parts = [],
            cen = [];
        let off = 0;
        files.forEach(([name, txt]) => {
            const nb = enc.encode(name),
                data = enc.encode(txt),
                c = crc32(data);
            const h = new DataView(new ArrayBuffer(30));
            h.setUint32(0, 0x04034b50, true);
            h.setUint16(4, 20, true);
            h.setUint16(6, 0x0800, true);
            h.setUint16(8, 0, true);
            h.setUint16(10, dt, true);
            h.setUint16(12, dd, true);
            h.setUint32(14, c, true);
            h.setUint32(18, data.length, true);
            h.setUint32(22, data.length, true);
            h.setUint16(26, nb.length, true);
            h.setUint16(28, 0, true);
            parts.push(new Uint8Array(h.buffer), nb, data);
            const z = new DataView(new ArrayBuffer(46));
            z.setUint32(0, 0x02014b50, true);
            z.setUint16(4, 20, true);
            z.setUint16(6, 20, true);
            z.setUint16(8, 0x0800, true);
            z.setUint16(10, 0, true);
            z.setUint16(12, dt, true);
            z.setUint16(14, dd, true);
            z.setUint32(16, c, true);
            z.setUint32(20, data.length, true);
            z.setUint32(24, data.length, true);
            z.setUint16(28, nb.length, true);
            z.setUint32(42, off, true);
            cen.push(new Uint8Array(z.buffer), nb);
            off += 30 + nb.length + data.length;
        });
        const cs = cen.reduce((a, b) => a + b.length, 0),
            e = new DataView(new ArrayBuffer(22));
        e.setUint32(0, 0x06054b50, true);
        e.setUint16(8, files.length, true);
        e.setUint16(10, files.length, true);
        e.setUint32(12, cs, true);
        e.setUint32(16, off, true);
        const all = [...parts, ...cen, new Uint8Array(e.buffer)],
            out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
        let p = 0;
        all.forEach((b) => {
            out.set(b, p);
            p += b.length;
        });
        return out;
    }
    const x = (s) =>
        String(s ?? '')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
            .replace(
                /[&<>"]/g,
                (c) =>
                    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[
                        c
                    ],
            );
    const col = (n) => {
        let s = '';
        n++;
        while (n) {
            const r = (n - 1) % 26;
            s = String.fromCharCode(65 + r) + s;
            n = Math.floor((n - 1) / 26);
        }
        return s;
    };
    // Gaya sel (indeks cellXfs)
    const ST = {
        def: 0,
        title: 1,
        muted: 2,
        head: 3,
        txt: 4,
        num: 5,
        pct: 6,
        totL: 7,
        totV: 8,
        totT: 9,
        stat: 10,
        dec: 11,
        lbl: 12,
        fill: 13,
        txtC: 14,
        headL: 15,
        totP: 16,
    };
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="15"/><color rgb="FF064E3B"/><name val="Calibri"/></font><font><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><sz val="10"/><color rgb="FF4A5262"/><name val="Calibri"/></font></fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF064E3B"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE3F2EC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF8DB"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFCBD2CC"/></left><right style="thin"><color rgb="FFCBD2CC"/></right><top style="thin"><color rgb="FFCBD2CC"/></top><bottom style="thin"><color rgb="FFCBD2CC"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="17">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="9" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="2" fontId="4" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="2" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="1" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
<xf numFmtId="9" fontId="4" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
    // cell: {v, s, f}  v: number|string|null, f: formula (tanpa "=")
    function cellXml(ref, c) {
        if (c == null) return '';
        if (typeof c !== 'object') c = { v: c };
        const s = c.s ? ` s="${c.s}"` : '';
        if (c.f != null) {
            if (typeof c.v === 'number')
                return `<c r="${ref}"${s}><f>${x(c.f)}</f><v>${c.v}</v></c>`;
            return `<c r="${ref}"${s} t="str"><f>${x(c.f)}</f><v>${x(c.v ?? '')}</v></c>`;
        }
        if (c.v == null || c.v === '') return c.s ? `<c r="${ref}"${s}/>` : '';
        if (typeof c.v === 'number')
            return `<c r="${ref}"${s}><v>${c.v}</v></c>`;
        return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${x(c.v)}</t></is></c>`;
    }
    function sheetXml(sh, first) {
        const rows = sh.rows
            .map((r, ri) => {
                if (!r) return '';
                const h = sh.heights && sh.heights[ri];
                return `<row r="${ri + 1}"${h ? ` ht="${h}" customHeight="1"` : ''}>${r.map((c, ci) => cellXml(col(ci) + (ri + 1), c)).join('')}</row>`;
            })
            .join('');
        const fz = sh.freeze
            ? `<pane xSplit="${sh.freeze[0]}" ySplit="${sh.freeze[1]}" topLeftCell="${col(sh.freeze[0]) + (sh.freeze[1] + 1)}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight"/>`
            : '';
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" zoomScale="100"${first ? ' tabSelected="1"' : ''} showGridLines="0">${fz}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${sh.cols.map((w, k) => `<col min="${k + 1}" max="${k + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData>${sh.merges && sh.merges.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
    }
    function build(sheets) {
        const used = new Set();
        sheets.forEach((sh) => {
            let n =
                String(sh.name)
                    .replace(/[\[\]:*?\/\\]/g, ' ')
                    .replace(/^'+|'+$/g, '')
                    .trim()
                    .slice(0, 31) || 'Sheet';
            let b = n,
                k = 2;
            while (used.has(n.toLowerCase())) {
                const suf = ' (' + k++ + ')';
                n = b.slice(0, 31 - suf.length) + suf;
            }
            used.add(n.toLowerCase());
            sh.name = n;
        });
        const files = [
            [
                '[Content_Types].xml',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, k) => `<Override PartName="/xl/worksheets/sheet${k + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
            ],
            [
                '_rels/.rels',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
            ],
            [
                'docProps/core.xml',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Penilaian KPI ${TAHUN}</dc:title><dc:creator>ABprove · KPI Kinerja ${x(RS)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`,
            ],
            [
                'xl/workbook.xml',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((s, k) => `<sheet name="${x(s.name)}" sheetId="${k + 1}" r:id="rId${k + 1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
            ],
            [
                'xl/_rels/workbook.xml.rels',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, k) => `<Relationship Id="rId${k + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${k + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
            ],
            ['xl/styles.xml', styles],
            ...sheets.map((s, k) => [
                `xl/worksheets/sheet${k + 1}.xml`,
                sheetXml(s, k === 0),
            ]),
        ];
        return zip(files);
    }
    return { build, col, ST };
})();

/* ---- Isi workbook dari data aplikasi ---- */
const XHEAD = [
    'Pilar',
    'KPI',
    'Numerator',
    'Denominator',
    'Formula Pengukuran',
    'Target',
    'Bobot KPI',
    ...BLN,
];
const XCOLS = [22, 34, 28, 28, 24, 11, 10, ...BLN.map(() => 9.5)];
const pctOf = (t) => {
    const m = /^\s*(\d+(?:[.,]\d+)?)\s*%\s*$/.exec(String(t));
    return m ? parseFloat(m[1].replace(',', '.')) / 100 : null;
};
const katF = (ref) =>
    `IF(${ref}="","",IF(${ref}>=${S.set.sb},"Sangat Baik",IF(${ref}>=${S.set.b},"Baik",IF(${ref}>=${S.set.c},"Cukup","Kurang"))))`;
const rowH = (cells, widths) => {
    let lines = 1;
    cells.forEach((c, k) => {
        const v = c && typeof c === 'object' ? c.v : c;
        if (typeof v === 'string' && widths[k])
            lines = Math.max(lines, Math.ceil(v.length / (widths[k] * 1.05)));
    });
    return lines > 1 ? Math.min(lines, 5) * 15 + 3 : null;
};
// Blok KPI + baris total/kategori/status. Mengembalikan baris & tinggi; mulai di baris sheet `r0` (1-based)
function kpiBlock(K, valsOf, statusOf, r0, opts = {}) {
    const { ST, col } = XL,
        rows = [],
        hs = [],
        n = K.length,
        first = r0 + 2,
        last = r0 + 1 + n;
    rows.push(XHEAD.map((h, k) => ({ v: h, s: k < 5 ? ST.headL : ST.head })));
    hs.push(30);
    K.forEach((k, j) => {
        const t = pctOf(k[5]);
        const r = [
            { v: k[0], s: ST.txt },
            { v: k[1], s: ST.txt },
            { v: k[2] || '', s: ST.txt },
            { v: k[3] || '', s: ST.txt },
            { v: k[4] || '', s: ST.txt },
            t != null ? { v: t, s: ST.pct } : { v: k[5] || '', s: ST.txtC },
            { v: (+k[6] || 0) / 100, s: ST.pct },
        ];
        BLN.forEach((b, m) => {
            const v = valsOf ? valsOf(m, j) : null;
            r.push(
                v != null && v !== '' && !isNaN(v)
                    ? { v: +v, s: opts.fill ? ST.fill : ST.num }
                    : { v: null, s: opts.fill ? ST.fill : ST.num },
            );
        });
        rows.push(r);
        hs.push(rowH(r, XCOLS));
    });
    const tr = last + 1,
        kr = last + 2;
    const tot = [
        { v: 'Total nilai (Nilai × Bobot)', s: ST.totL },
        ...[1, 2, 3, 4].map(() => ({ v: null, s: ST.totL })),
        { v: null, s: ST.totL },
        {
            f: `SUM(G${first}:G${last})`,
            v: K.reduce((a, k) => a + (+k[6] || 0), 0) / 100,
            s: ST.totV,
        },
    ];
    tot[6].s = XL.ST.totP;
    const kat_ = [
        { v: 'Kategori', s: ST.totL },
        ...[1, 2, 3, 4, 5, 6].map(() => ({ v: null, s: ST.totL })),
    ];
    BLN.forEach((b, m) => {
        const c = col(7 + m);
        let cv = '';
        if (valsOf) {
            let ok = true,
                t = 0;
            K.forEach((k, j) => {
                const v = valsOf(m, j);
                if (v == null || v === '' || isNaN(v)) ok = false;
                else t += (v * (+k[6] || 0)) / 100;
            });
            cv = ok ? Math.round(t * 100) / 100 : '';
        }
        tot.push({
            f: `IF(COUNT(${c}${first}:${c}${last})<${n},"",SUMPRODUCT($G$${first}:$G$${last},${c}${first}:${c}${last}))`,
            v: cv,
            s: ST.totV,
        });
        kat_.push({
            f: katF(c + tr),
            v: cv === '' ? '' : kat(cv).t,
            s: ST.totT,
        });
    });
    rows.push(tot, kat_);
    hs.push(20, 20);
    const merges = [`A${tr}:F${tr}`, `A${kr}:G${kr}`];
    if (statusOf) {
        const sr = [
            { v: 'Status', s: ST.totL },
            ...[1, 2, 3, 4, 5, 6].map(() => ({ v: null, s: ST.totL })),
            ...BLN.map((b, m) => ({ v: statusOf(m), s: ST.stat })),
        ];
        rows.push(sr);
        hs.push(30);
        merges.push(`A${kr + 1}:G${kr + 1}`);
    }
    return { rows, hs, merges };
}
function empSheet(e) {
    const u = unitOf(e.unit),
        d = divOf(u.div);
    const head = [
        [{ v: `ABprove · Penilaian KPI Tahunan ${TAHUN}`, s: XL.ST.title }],
        [
            { v: 'Nama', s: XL.ST.muted },
            { v: e.nama, s: XL.ST.lbl },
            null,
            { v: 'Unit', s: XL.ST.muted },
            { v: u.nama, s: XL.ST.lbl },
        ],
        [
            { v: 'NIP', s: XL.ST.muted },
            { v: e.nip, s: XL.ST.lbl },
            null,
            { v: 'Divisi', s: XL.ST.muted },
            { v: d.nama, s: XL.ST.lbl },
        ],
        [
            { v: 'Jabatan', s: XL.ST.muted },
            {
                v: `${e.jab} (template ${TPL[tplOf(e, AKTIF)].nama})`,
                s: XL.ST.lbl,
            },
            null,
            { v: 'Penilai', s: XL.ST.muted },
            { v: u.kepala, s: XL.ST.lbl },
        ],
        [
            {
                v: `Nilai 10–100 per bulan. Total nilai = jumlah (Nilai × Bobot KPI). Kategori: Sangat Baik ≥ ${S.set.sb}, Baik ≥ ${S.set.b}, Cukup ≥ ${S.set.c}, di bawah itu Kurang. Diekspor ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
                s: XL.ST.muted,
            },
        ],
        null,
    ];
    const segs = [];
    BLN.forEach((b, m) => {
        const t = tplOf(e, m),
            g = segs[segs.length - 1];
        if (g && g.t === t) g.to = m;
        else segs.push({ t, from: m, to: m });
    });
    const B = { rows: [], hs: [], merges: [] };
    segs.forEach((g, si) => {
        if (segs.length > 1) {
            if (si) (B.rows.push(null), B.hs.push(null));
            B.rows.push([
                {
                    v: `${TPL[g.t].nama} · berlaku ${BULAN[g.from]}${g.to > g.from ? ' – ' + BULAN[g.to] : ''} ${TAHUN}`,
                    s: XL.ST.lbl,
                },
            ]);
            B.hs.push(20);
        }
        const out = (m) => m < g.from || m > g.to || m > AKTIF;
        const blk = kpiBlock(
            TPL[g.t].kpi,
            (m, j) => {
                if (out(m)) return null;
                const x = ev(e.id, m);
                if (x.status === 'Belum') return null;
                const v = x.vals[j];
                return valid(v) ? +v : null;
            },
            (m) =>
                out(m)
                    ? ''
                    : ((s) => (s === 'Belum' ? 'Belum diisi' : s))(
                          ev(e.id, m).status,
                      ),
            head.length + B.rows.length,
        );
        B.rows.push(...blk.rows);
        B.hs.push(...blk.hs);
        B.merges.push(...blk.merges);
    });
    const rows = [...head, ...B.rows];
    const tem = [];
    for (let m = 0; m <= AKTIF; m++) {
        const x = ev(e.id, m);
        if (x.pos) tem.push([BULAN[m], 'Positif', x.pos]);
        if (x.neg) tem.push([BULAN[m], 'Negatif', x.neg]);
        if (x.note) tem.push([BULAN[m], 'Catatan Kepala Divisi', x.note]);
    }
    const hs = [24, null, null, null, null, null, ...B.hs];
    if (tem.length) {
        rows.push(
            null,
            [{ v: 'Temuan dan catatan', s: XL.ST.lbl }],
            [
                { v: 'Bulan', s: XL.ST.headL },
                { v: 'Jenis', s: XL.ST.headL },
                { v: 'Isi', s: XL.ST.headL },
            ],
        );
        hs.push(null, null, 20);
        tem.forEach((t) => {
            rows.push([
                { v: t[0], s: XL.ST.txt },
                { v: t[1], s: XL.ST.txt },
                { v: t[2], s: XL.ST.txt },
            ]);
            hs.push(t[2].length > 60 ? 33 : null);
        });
        const r0 = rows.length - tem.length;
        tem.forEach((t, k) => {
            rows[r0 + k].push(...Array(4).fill({ v: null, s: XL.ST.txt }));
        });
        B.merges.push(
            ...tem.map((t, k) => `C${r0 + k + 1}:G${r0 + k + 1}`),
            `C${r0}:G${r0}`,
        );
        rows[r0 - 1].push(...Array(4).fill({ v: null, s: XL.ST.headL }));
    }
    return {
        name: e.nama.replace(/^dr\.\s*/, ''),
        rows,
        heights: hs,
        cols: XCOLS,
        merges: B.merges,
        freeze: [2, head.length + (segs.length > 1 ? 0 : 1)],
    };
}
function summarySheet(es, label) {
    const ST = XL.ST,
        cols = [5, 28, 12, 22, 24, 26, ...BLN.map(() => 8), 10, 13];
    const H = [
        'No',
        'Nama',
        'NIP',
        'Jabatan',
        'Unit',
        'Divisi',
        ...BLN,
        'Rata-rata',
        'Kategori',
    ];
    const rows = [
        [{ v: `ABprove · Rekap Penilaian KPI ${TAHUN}`, s: ST.title }],
        [
            {
                v: `${label}. Kolom bulan berisi total nilai karyawan (Nilai × Bobot KPI). Kosong berarti belum lengkap atau belum dinilai.`,
                s: ST.muted,
            },
        ],
        null,
        H.map((h, k) => ({ v: h, s: k >= 1 && k <= 5 ? ST.headL : ST.head })),
    ];
    es.forEach((e, k) => {
        const r = rows.length + 1,
            u = unitOf(e.unit);
        const tv = BLN.map((b, m) => (m > AKTIF ? null : total(e, m)));
        const sc = tv.filter((v) => v != null);
        const a = sc.length ? sc.reduce((p, q) => p + q, 0) / sc.length : null;
        rows.push([
            { v: k + 1, s: ST.num },
            { v: e.nama, s: ST.txt },
            { v: e.nip, s: ST.txtC },
            { v: e.jab, s: ST.txt },
            { v: u.nama, s: ST.txt },
            { v: divOf(u.div).nama, s: ST.txt },
            ...tv.map((v) => ({
                v: v == null ? null : Math.round(v * 100) / 100,
                s: ST.dec,
            })),
            {
                f: `IF(COUNT(G${r}:R${r})=0,"",AVERAGE(G${r}:R${r}))`,
                v: a == null ? '' : Math.round(a * 100) / 100,
                s: ST.totV,
            },
            { f: katF('S' + r), v: a == null ? '' : kat(a).t, s: ST.totT },
        ]);
    });
    return {
        name: 'Ringkasan',
        rows,
        heights: [24, null, null, 30],
        cols,
        freeze: [2, 4],
    };
}
function templateSheet(key) {
    const T = TPL[key];
    const head = [
        [{ v: 'ABprove · Template KPI Tahunan', s: XL.ST.title }],
        [
            {
                v: `Jabatan: ${T.nama}. Isi nilai 10–100 di sel berwarna krem. Target dan bobot dalam persen, total bobot harus 100%.`,
                s: XL.ST.muted,
            },
        ],
        [
            { v: 'Tahun:', s: XL.ST.muted },
            { v: TAHUN, s: XL.ST.lbl },
        ],
        null,
    ];
    const B = kpiBlock(T.kpi, null, null, head.length, { fill: true });
    return {
        name: T.nama,
        rows: [...head, ...B.rows],
        heights: [24, null, null, null, ...B.hs],
        cols: XCOLS,
        merges: B.merges,
        freeze: [2, head.length + 1],
    };
}
let _dlNs = null;
const dlNs = () =>
    _dlNs ||
    (_dlNs =
        window.claude && typeof window.claude.use === 'function'
            ? Promise.race([
                  Promise.resolve(window.claude.use('downloads')).catch(
                      () => null,
                  ),
                  new Promise((r) => setTimeout(() => r(null), 4000)),
              ])
            : Promise.resolve(null));
setTimeout(dlNs, 0);
async function downloadXlsx(bytes, name) {
    const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const ns = await dlNs();
    if (ns) {
        try {
            await ns.save({ filename: name, data: blob });
            toast(`${name} disimpan`);
            return true;
        } catch (err) {
            const c = err && err.code;
            if (c === 'declined') {
                toast('Unduhan dibatalkan');
                return false;
            }
            if (c === 'rate_limited') {
                toast('Tunggu sebentar, lalu coba lagi');
                return false;
            }
        }
    }
    try {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 4000);
        toast(`${name} diunduh`);
        return true;
    } catch (err) {
        toast('File tidak bisa diunduh di tampilan ini');
        return false;
    }
}
/* ---- Pilihan cakupan export ---- */
function exportScopes() {
    const es = scope(),
        o = [];
    const lbl =
        UI.role === 'ku'
            ? unitOf(ACC.ku.unit).nama
            : UI.role === 'kd'
              ? divOf(ACC.kd.div).nama
              : 'seluruh rumah sakit';
    o.push({
        k: 'all',
        t: `Semua karyawan, ${lbl} (${es.length})`,
        es: () => scope(),
        lbl: `Semua karyawan, ${lbl}`,
        fn: UI.role === 'hc' ? 'Seluruh RS' : lbl,
    });
    if (UI.role === 'hc')
        DIVS.forEach((d) => {
            const n = es.filter((e) => unitOf(e.unit).div === d.id);
            if (n.length)
                o.push({
                    k: 'd:' + d.id,
                    t: `${d.nama} (${n.length})`,
                    es: () =>
                        scope().filter((e) => unitOf(e.unit).div === d.id),
                    lbl: d.nama,
                });
        });
    if (UI.role !== 'ku')
        UNITS.forEach((u) => {
            const n = es.filter((e) => e.unit === u.id);
            if (n.length)
                o.push({
                    k: 'u:' + u.id,
                    t: `${u.nama} (${n.length})`,
                    es: () => scope().filter((e) => e.unit === u.id),
                    lbl: u.nama,
                });
        });
    es.forEach((e) =>
        o.push({
            k: 'e:' + e.id,
            t: `${e.nama}, ${e.jab}`,
            es: () => [emp(e.id)],
            lbl: e.nama,
            one: true,
        }),
    );
    return o;
}
const fileSlug = (s) =>
    s
        .replace(/^dr\.\s*/, '')
        .replace(/[^A-Za-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
function openExport(preset) {
    const o = exportScopes();
    const cur = preset && o.find((x) => x.k === preset) ? preset : 'all';
    const groups = [
        ['Grup', o.filter((x) => !x.one)],
        ['Satu karyawan', o.filter((x) => x.one)],
    ];
    modal(`<h2>Export ke Excel</h2><p class="ink2" style="margin:6px 0 18px">File .xlsx mengikuti template KPI: Pilar, KPI, Numerator, Denominator, Formula Pengukuran, Target, Bobot KPI, lalu nilai Januari sampai Desember ${TAHUN} dalam satu baris.</p>
   <label class="fld"><span>Cakupan</span><select class="f" id="xScope">${groups.map(([g, l]) => `<optgroup label="${g}">${l.map((x) => `<option value="${x.k}" ${x.k === cur ? 'selected' : ''}>${esc(x.t)}</option>`).join('')}</optgroup>`).join('')}</select></label>
   <div class="xprev" id="xPrev"></div>
   <div class="row" style="justify-content:flex-end;margin-top:20px;gap:8px"><button class="btn ghost" data-act="close">Batal</button><button class="btn pri" data-act="doExport">${i('dl')}Unduh Excel</button></div>`);
    const upd = () => {
        const s = o.find((x) => x.k === $('#xScope').value),
            es = s.es();
        $('#xPrev').innerHTML =
            `<div class="xp-file">${i('table')}<div><b>${xName(s)}</b><span>${es.length > 1 ? `1 sheet Ringkasan + ${es.length} sheet karyawan` : `1 sheet untuk ${esc(es[0].nama)}`}</span></div></div>
    <ul><li>Tiap sheet karyawan berisi KPI sesuai jabatannya, nilai per bulan, lalu baris <b>Total nilai</b>, <b>Kategori</b>, dan <b>Status</b>.</li><li>Total dan kategori memakai rumus Excel, jadi ikut berubah bila nilai diedit di Excel.</li><li>Bulan yang belum dinilai dibiarkan kosong. Temuan dan catatan ada di bawah tabel.</li></ul>`;
    };
    setTimeout(() => {
        $('#xScope').addEventListener('change', upd);
        upd();
    }, 0);
}
const xName = (s) => `KPI_${TAHUN}_${fileSlug(s.fn || s.lbl)}.xlsx`;
function exportTemplates() {
    const bytes = XL.build(Object.keys(TPL).map(templateSheet));
    downloadXlsx(bytes, `Template_KPI_${TAHUN}.xlsx`);
    return bytes;
}
function buildExport(k) {
    const s = exportScopes().find((x) => x.k === k) || exportScopes()[0],
        es = s.es();
    const sheets = (es.length > 1 ? [summarySheet(es, s.lbl)] : []).concat(
        es.map(empSheet),
    );
    return { bytes: XL.build(sheets), name: xName(s) };
}

/* =========================================================
   PENEMPATAN KPI: pola template KPI per karyawan per bulan
   (pilih karyawan → template atau susun manual → mulai bulan → tanpa akhir / sampai bulan)
   ========================================================= */
IC.up = 'M12 19V5M6 11l6-6 6 6';
IC.mail = 'M3.5 6.5h17v11h-17zM4 7l8 6 8-6';
IC.users =
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4.5-6.5';
IC.down = 'M12 5v14M6 13l6 6 6-6';
if (!S.ctpl) S.ctpl = {};
Object.assign(TPL, S.ctpl);
if (!S.asg) {
    S.asg = { E14: { 10: 'YJM', 11: 'YJM' } };
    S.asgLog = [
        {
            t: '6 Nov 2026',
            who: ACC.hc.nama,
            txt: 'menetapkan MJR Yanjangmed & Koord Yanmed untuk dr. Lukman Hakim, November 2026 dan seterusnya',
        },
    ];
    save();
}
if (!S.asgLog) S.asgLog = [];
const tKeys = () => Object.keys(TPL);
const tIdx = (k) => Math.max(0, tKeys().indexOf(k)) % 6;
const tCode = (k) =>
    TPL[k].kode || (k.length <= 4 ? k : 'K' + (tKeys().indexOf(k) + 1));
const tChip = (k) => `<span class="tchip tc${tIdx(k)}">${esc(tCode(k))}</span>`;
const pzLocked = (e, m) => {
    const x = S.ev[e.id + '|' + m];
    return (
        !!x && (x.status !== 'Belum' || Object.keys(x.vals || {}).length > 0)
    );
};
function pzSet(id, m, k) {
    const e = emp(id);
    S.asg[id] = S.asg[id] || {};
    if (k === e.tpl) delete S.asg[id][m];
    else S.asg[id][m] = k;
}
const pzNames = (es) =>
    es.length <= 2
        ? es.map((e) => e.nama).join(' dan ')
        : `${es[0].nama} dan ${es.length - 1} karyawan lain`;
const nowHM = () => {
    const d = new Date();
    return (
        'Hari ini, ' +
        String(d.getHours()).padStart(2, '0') +
        '.' +
        String(d.getMinutes()).padStart(2, '0')
    );
};

function hcPenempatan() {
    const F = UI.f,
        q = (F.pzq || '').toLowerCase(),
        M = UI.month;
    UI.pzSel = new Set();
    const es = scope().filter((e) => !F.pzu || e.unit === F.pzu);
    const groups = tKeys()
        .map((k) => ({ k, ps: es.filter((e) => tplOf(e, M) === k) }))
        .filter((g) => g.ps.length);
    later(() => {
        const s = $('#pzq');
        if (s)
            s.addEventListener('input', () => {
                UI.f.pzq = s.value;
                const v = s.value.toLowerCase();
                document.querySelectorAll('.pg-card').forEach((c) => {
                    let n = 0;
                    c.querySelectorAll('.pg-item[data-q]').forEach((r) => {
                        const ok = r.dataset.q.includes(v);
                        r.style.display = ok ? '' : 'none';
                        if (ok) n++;
                    });
                    c.style.display = n ? '' : 'none';
                });
            });
    });
    const nxt = (e) => {
        for (let m = M + 1; m < 12; m++) {
            const k = tplOf(e, m);
            if (k !== tplOf(e, M))
                return `<span class="pg-next tc${tIdx(k)}" title="Mulai ${BULAN[m]} memakai ${esc(TPL[k].nama)}">${BLN[m]} → ${esc(tCode(k))}</span>`;
        }
        return '';
    };
    return `<div class="content stack">
   <div class="row between wrap" style="gap:12px">
    <div class="row wrap" style="gap:8px"><div class="search">${i('search')}<input class="f" id="pzq" placeholder="Cari karyawan" value="${esc(F.pzq || '')}" style="padding-left:34px;width:260px"></div>
     <select class="f" data-act="filter" data-k="pzu"><option value="">Semua unit</option>${UNITS.map((u) => `<option value="${u.id}" ${F.pzu === u.id ? 'selected' : ''}>${u.nama}</option>`).join('')}</select></div>
    <button class="btn pri" data-act="pzOpen">${i('plus')}Atur KPI</button></div>
   <p class="muted small" style="margin:0">KPI yang dipakai untuk penilaian <b style="color:var(--ink2)">${BULAN[M]} ${TAHUN}</b>. Ganti bulan lewat pilihan periode di atas.</p>
   <div class="pg-grid">${
       groups
           .map(
               (g) => `<section class="pg-card tc${tIdx(g.k)}">
     <header class="pg-head"><span class="pg-dot"></span><div class="grow"><b>${esc(TPL[g.k].nama)}</b><span>${g.ps.length} orang · ${TPL[g.k].kpi.length} KPI</span></div><a href="#" class="pg-link" data-act="cariPage" data-go="kpi" data-tpl="${g.k}">Lihat KPI</a></header>
     <div class="pg-list">${g.ps
         .map((e) => {
             const qq = [e.nama, e.nip, e.jab, unitOf(e.unit).nama]
                 .join(' ')
                 .toLowerCase();
             return `<div class="pg-item" data-q="${esc(qq)}" ${q && !qq.includes(q) ? 'style="display:none"' : ''}><span class="av sm">${ini(e.nama)}</span><div class="grow pg-who"><b>${esc(e.nama)}</b><span>${esc(e.jab)} · ${unitOf(e.unit).nama.replace('Unit ', '')}</span></div>${nxt(e)}<button class="pg-move" data-act="pzMove" data-id="${e.id}">Pindah</button></div>`;
         })
         .join('')}</div>
    </section>`,
           )
           .join('') || `<div class="empty">Tidak ada karyawan.</div>`
   }</div>
   ${
       S.asgLog.length
           ? `<div><h2 style="margin-bottom:10px">Riwayat perubahan</h2><div class="feed">${S.asgLog
                 .slice(0, 6)
                 .map(
                     (l) =>
                         `<div class="small"><span class="muted" style="width:110px;flex-shrink:0">${esc(l.t)}</span><div><b>${esc(l.who)}</b> ${esc(l.txt)}</div></div>`,
                 )
                 .join('')}</div></div>`
           : ''
   }
  </div>`;
}

/* ----- Drawer Atur KPI ----- */
function pzLib() {
    const L = [],
        seen = new Set();
    tKeys().forEach((t) =>
        TPL[t].kpi.forEach((k) => {
            const id = k[0] + '|' + k[1];
            if (k[1] && !seen.has(id)) {
                seen.add(id);
                L.push(k);
            }
        }),
    );
    return L;
}
function pzMonths(P) {
    const r = [];
    for (let m = P.from; m <= (P.end === 'tanpa' ? 11 : P.to); m++) r.push(m);
    return r;
}
function openPz(ids) {
    const sel = UI.pzSel || new Set();
    let ms = [...sel].map((s) => +s.split('|')[1]);
    const e0 = ids && ids[0] ? emp(ids[0]) : null;
    const from = ms.length ? Math.min(...ms) : AKTIF,
        to = ms.length ? Math.max(...ms) : 11;
    UI.pz = {
        emps: ids || [],
        mode: 'tpl',
        tpl: e0 ? tplOf(e0, from) : tKeys()[0],
        man: [],
        nama: '',
        from,
        end: ms.length && to < 11 ? 'sampai' : 'tanpa',
        to,
    };
    pzDrawer();
}
function pzDrawer() {
    const P = UI.pz,
        es = P.emps.map(emp),
        lib = pzLib(),
        pil = [...new Set(lib.map((k) => k[0]))];
    const sumB = P.man.reduce((a, r) => a + (+r.b || 0), 0),
        months = pzMonths(P);
    let ch = 0,
        sk = 0;
    es.forEach((e) => months.forEach((m) => (pzLocked(e, m) ? sk++ : ch++)));
    const T = TPL[P.tpl] || TPL[tKeys()[0]];
    const old = document.querySelector('#drawer .dbody'),
        sc = old ? old.scrollTop : 0,
        wasOpen = $('#drawer').classList.contains('on');
    drawer(`<div class="dhead"><h2 class="grow">Atur KPI</h2><button class="iconbtn" data-act="close" aria-label="Tutup">${i('x')}</button></div>
  <div class="dbody pz-d">
   <div class="pz-l">Karyawan · ${es.length} dipilih <i class="req">*</i></div>
   ${es.length ? `<div class="pz-chips">${es.map((e) => `<span class="pz-chip">${esc(e.nama)}<button data-act="pzRm" data-id="${e.id}" aria-label="Hapus ${esc(e.nama)}">${i('x')}</button></span>`).join('')}</div>` : ''}
   <div class="pz-find">${i('search')}<input id="pzFind" placeholder="Cari karyawan, unit, atau jabatan" autocomplete="off"><div class="pz-res" id="pzRes"></div></div>
   <div class="seg pz-mode"><button class="${P.mode === 'tpl' ? 'on' : ''}" data-act="pzMode" data-v="tpl">Template jabatan</button><button class="${P.mode === 'man' ? 'on' : ''}" data-act="pzMode" data-v="man">Susun manual</button></div>
   ${
       P.mode === 'tpl'
           ? `<div class="pz-l">Template <i class="req">*</i></div><select class="f" id="pzTpl" style="width:100%">${tKeys()
                 .map(
                     (k) =>
                         `<option value="${k}" ${k === P.tpl ? 'selected' : ''}>${esc(TPL[k].nama)} · ${TPL[k].kpi.length} KPI</option>`,
                 )
                 .join('')}</select>
     <div class="pz-prev">${T.kpi.map((k, j) => `<div><span class="muted small num">${j + 1}</span><div class="grow"><b>${esc(k[1] || '(tanpa nama)')}</b><span>${esc(k[0])}. Target ${esc(k[5] || '–')}</span></div><b class="num">${k[6]}%</b></div>`).join('')}</div>`
           : `<div class="pz-l">Urutan KPI · total bobot <b id="pzSum" style="color:${sumB === 100 ? 'var(--green-m)' : 'var(--red)'}">${sumB}%</b> <i class="req">*</i></div>
     <div class="pz-man">${P.man
         .map(
             (r, j) =>
                 `<div class="pz-row"><span class="muted small pz-no">KPI ${j + 1}</span><select class="f" data-pzk="${j}"><option value="">Pilih KPI</option>${pil
                     .map(
                         (p) =>
                             `<optgroup label="${esc(p)}">${lib
                                 .filter((k) => k[0] === p)
                                 .map((k) => {
                                     const id = k[0] + '|' + k[1];
                                     return `<option value="${esc(id)}" ${r.id === id ? 'selected' : ''}>${esc(k[1])}</option>`;
                                 })
                                 .join('')}</optgroup>`,
                     )
                     .join(
                         '',
                     )}</select><span class="pre pz-b"><input class="f num" data-pzb="${j}" value="${r.b ?? ''}" inputmode="numeric" aria-label="Bobot KPI ${j + 1}"><span>%</span></span><button class="iconbtn pz-ib" data-act="pzMv" data-j="${j}" data-d="-1" ${j === 0 ? 'disabled' : ''} aria-label="Naikkan">${i('up')}</button><button class="iconbtn pz-ib" data-act="pzMv" data-j="${j}" data-d="1" ${j === P.man.length - 1 ? 'disabled' : ''} aria-label="Turunkan">${i('down')}</button><button class="iconbtn pz-ib" data-act="pzDel" data-j="${j}" aria-label="Hapus KPI ${j + 1}">${i('x')}</button></div>`,
         )
         .join('')}</div>
     <button class="link pz-add" data-act="pzAdd">${i('plus')}Tambah KPI</button>
     <div class="pz-l" style="margin-top:20px">Nama template</div><input class="f" id="pzNama" style="width:100%" value="${esc(P.nama)}" placeholder="KPI khusus ${esc(es[0] ? es[0].nama : 'karyawan')}"><p class="small muted" style="margin:6px 0 0">Disimpan sebagai template baru dan bisa diubah lagi di Master KPI.</p>`
   }
   <div class="grid2" style="margin-top:22px">
    <label class="fld"><span>Mulai bulan <i class="req">*</i></span><select class="f" id="pzFrom">${BULAN.map((b, m) => `<option value="${m}" ${m === P.from ? 'selected' : ''}>${b} ${TAHUN}</option>`).join('')}</select></label>
    <div class="fld"><span>Berlaku</span><div class="seg" style="width:100%"><button class="${P.end === 'tanpa' ? 'on' : ''}" data-act="pzEnd" data-v="tanpa" style="flex:1">Tanpa akhir</button><button class="${P.end === 'sampai' ? 'on' : ''}" data-act="pzEnd" data-v="sampai" style="flex:1">Sampai bulan</button></div></div>
   </div>
   ${P.end === 'sampai' ? `<label class="fld" style="display:block;margin-top:14px"><span>Sampai bulan</span><select class="f" id="pzTo" style="width:100%">${BULAN.map((b, m) => (m < P.from ? '' : `<option value="${m}" ${m === P.to ? 'selected' : ''}>${b} ${TAHUN}</option>`)).join('')}</select></label>` : ''}
   <div class="pz-sum ${es.length && !ch ? 'warn' : ''}">${i(es.length && !ch ? 'warn' : 'clock')}<div>${es.length ? `<b>${ch} bulan penilaian akan diubah</b> untuk ${es.length} karyawan, ${BULAN[P.from]} ${TAHUN} ${P.end === 'tanpa' ? 'dan seterusnya' : 'sampai ' + BULAN[P.to] + ' ' + TAHUN}.${sk ? ` ${sk} bulan dilewati karena penilaiannya sudah diisi.` : ''}` : 'Pilih karyawan dulu.'}</div></div>
   <p class="small muted" style="margin:14px 0 0;line-height:1.6">Hanya bulan di rentang ini yang diubah; bulan sebelum dan sesudahnya tetap. Bulan yang penilaiannya sudah diisi, diajukan, disetujui, atau final tidak diubah, supaya nilai lama tidak tercampur dengan KPI baru.</p>
  </div>
  <div class="dfoot"><span class="grow"></span><button class="btn ghost" data-act="close">Batal</button><button class="btn pri" data-act="pzSave">Simpan</button></div>`);
    const nb = document.querySelector('#drawer .dbody');
    if (nb && wasOpen) nb.scrollTop = sc;
    bindPz();
}
function bindPz() {
    const P = UI.pz,
        f = $('#pzFind'),
        res = $('#pzRes');
    const show = () => {
        const v = f.value.trim().toLowerCase();
        if (!v) {
            res.innerHTML = '';
            res.classList.remove('on');
            return;
        }
        const hits = scope().filter(
            (e) =>
                !P.emps.includes(e.id) &&
                [e.nama, e.nip, e.jab, unitOf(e.unit).nama]
                    .join(' ')
                    .toLowerCase()
                    .includes(v),
        );
        res.innerHTML = hits.length
            ? `${hits
                  .slice(0, 6)
                  .map(
                      (e) =>
                          `<button data-act="pzAddEmp" data-id="${e.id}"><b>${esc(e.nama)}</b><span>${esc(e.jab)}, ${unitOf(e.unit).nama}</span></button>`,
                  )
                  .join(
                      '',
                  )}${hits.length > 1 ? `<button class="all" data-act="pzAddAll" data-ids="${hits.map((e) => e.id).join(',')}">${i('plus')}Pilih semua ${hits.length} hasil</button>` : ''}`
            : `<div class="none">Tidak ada karyawan yang cocok. <a href="#" class="link" data-act="empNew">Tambah karyawan baru</a></div>`;
        res.classList.add('on');
    };
    f.addEventListener('input', show);
    f.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
            f.value = '';
            show();
        }
    });
    const t = $('#pzTpl');
    if (t)
        t.addEventListener('change', () => {
            P.tpl = t.value;
            pzDrawer();
        });
    document.querySelectorAll('[data-pzk]').forEach((s) =>
        s.addEventListener('change', () => {
            const j = +s.dataset.pzk,
                r = P.man[j];
            r.id = s.value;
            if (r.b == null || r.b === '') {
                const k = pzLib().find((x) => x[0] + '|' + x[1] === s.value);
                if (k) r.b = +k[6];
            }
            pzDrawer();
        }),
    );
    document.querySelectorAll('[data-pzb]').forEach((inp) =>
        inp.addEventListener('input', () => {
            P.man[+inp.dataset.pzb].b = inp.value === '' ? '' : +inp.value;
            const s = P.man.reduce((a, r) => a + (+r.b || 0), 0),
                el = $('#pzSum');
            el.textContent = s + '%';
            el.style.color = s === 100 ? 'var(--green-m)' : 'var(--red)';
        }),
    );
    const nm = $('#pzNama');
    if (nm)
        nm.addEventListener('input', () => {
            P.nama = nm.value;
        });
    $('#pzFrom').addEventListener('change', (ev) => {
        P.from = +ev.target.value;
        if (P.to < P.from) P.to = P.from;
        pzDrawer();
    });
    const to = $('#pzTo');
    if (to)
        to.addEventListener('change', () => {
            P.to = +to.value;
            pzDrawer();
        });
}
function pzSaveNow() {
    const P = UI.pz,
        es = P.emps.map(emp);
    if (!es.length) {
        toast('Pilih minimal satu karyawan');
        $('#pzFind').focus();
        return;
    }
    let key = P.tpl;
    if (P.mode === 'man') {
        const rows = P.man.filter((r) => r.id);
        if (!rows.length) {
            toast('Tambahkan minimal satu KPI');
            return;
        }
        if (new Set(rows.map((r) => r.id)).size !== rows.length) {
            toast('Ada KPI yang dipilih dua kali');
            return;
        }
        const s = rows.reduce((a, r) => a + (+r.b || 0), 0);
        if (s !== 100) {
            toast(`Total bobot masih ${s}%. Sesuaikan sampai 100%.`);
            return;
        }
        const lib = pzLib();
        key = 'C' + Date.now().toString(36);
        TPL[key] = S.ctpl[key] = {
            nama: P.nama.trim() || `KPI khusus ${es[0].nama}`,
            kode: 'K' + (Object.keys(S.ctpl).length + 1),
            kpi: rows.map((r) => {
                const k = lib.find((x) => x[0] + '|' + x[1] === r.id).slice();
                k[6] = +r.b;
                return k;
            }),
        };
    }
    const months = pzMonths(P);
    let ch = 0,
        sk = 0;
    es.forEach((e) =>
        months.forEach((m) => {
            if (pzLocked(e, m)) sk++;
            else {
                pzSet(e.id, m, key);
                ch++;
            }
        }),
    );
    if (!ch) {
        if (P.mode === 'man') {
            delete TPL[key];
            delete S.ctpl[key];
        }
        toast('Tidak ada bulan yang bisa diubah di rentang ini');
        return;
    }
    const rng = `${BULAN[P.from]} ${TAHUN} ${P.end === 'tanpa' ? 'dan seterusnya' : 'sampai ' + BULAN[P.to] + ' ' + TAHUN}`;
    S.asgLog.unshift({
        t: nowHM(),
        who: ACC.hc.nama,
        txt: `menetapkan ${TPL[key].nama} untuk ${pzNames(es)}, ${rng}`,
    });
    S.act.unshift({
        t: 'Baru saja',
        who: ACC.hc.nama,
        txt: `mengatur KPI ${pzNames(es)}`,
    });
    save();
    closeAll();
    if (UI.pzSel) UI.pzSel.clear();
    if (UI.view === 'penempatan') refresh();
    toast(
        `${TPL[key].nama} diterapkan ke ${ch} bulan${sk ? `, ${sk} bulan dilewati` : ''}`,
    );
}

/* =========================================================
   DATA KARYAWAN: tambah, ubah, nonaktifkan (Super HC)
   ========================================================= */
if (!S.empAdd) S.empAdd = [];
if (!S.empMod) S.empMod = {};
S.empAdd.forEach((o) => {
    if (!EMPS.some((e) => e.id === o.id)) EMPS.push(Object.assign({}, o));
});
Object.entries(S.empMod).forEach(([id, o]) => {
    const e = EMPS.find((z) => z.id === id);
    if (e) Object.assign(e, o);
});
const aktifDi = (e, m) =>
    (e.mulai == null || m >= e.mulai) && (e.keluar == null || m < e.keluar);
const empStat = (e) =>
    e.keluar != null && AKTIF >= e.keluar
        ? 'Nonaktif'
        : e.keluar != null
          ? `Nonaktif mulai ${BULAN[e.keluar]}`
          : e.mulai != null && e.mulai > AKTIF
            ? `Mulai ${BULAN[e.mulai]}`
            : 'Aktif';
function empPersist(e, fields) {
    const add = S.empAdd.find((o) => o.id === e.id);
    if (add) Object.assign(add, fields);
    else S.empMod[e.id] = Object.assign(S.empMod[e.id] || {}, fields);
    Object.assign(e, fields);
    save();
}
function hcKaryawan() {
    if (UI.tab.kv === 'kepala') return hcKepala();
    const F = UI.f,
        q = (F.kq || '').toLowerCase(),
        st = UI.tab.ks || 'Aktif';
    const isOff = (e) => e.keluar != null && AKTIF >= e.keluar;
    const base = EMPS.filter((e) => !F.ku || e.unit === F.ku);
    const cnt = (k) =>
        base.filter(
            (e) => k === 'semua' || (k === 'Aktif' ? !isOff(e) : isOff(e)),
        ).length;
    const rows = base.filter(
        (e) => st === 'semua' || (st === 'Aktif' ? !isOff(e) : isOff(e)),
    );
    later(() => {
        const s = $('#kq');
        if (s)
            s.addEventListener('input', () => {
                UI.f.kq = s.value;
                const v = s.value.toLowerCase();
                document
                    .querySelectorAll('tr[data-q]')
                    .forEach(
                        (tr) =>
                            (tr.style.display = tr.dataset.q.includes(v)
                                ? ''
                                : 'none'),
                    );
            });
    });
    return `<div class="content stack">
   <div class="row between wrap" style="gap:12px">
    <div class="row wrap" style="gap:8px">${kvSwitch()}
     <div class="seg">${[
         ['Aktif', 'Aktif'],
         ['Nonaktif', 'Nonaktif'],
         ['semua', 'Semua'],
     ]
         .map(
             ([k, t]) =>
                 `<button class="${st === k ? 'on' : ''}" data-act="tab" data-k="ks" data-v="${k}">${t}<span class="c">${cnt(k)}</span></button>`,
         )
         .join('')}</div>
     <div class="search">${i('search')}<input class="f" id="kq" placeholder="Cari nama, NIP, atau jabatan" value="${esc(F.kq || '')}" style="padding-left:34px;width:250px"></div>
     <select class="f" data-act="filter" data-k="ku"><option value="">Semua unit</option>${UNITS.map((u) => `<option value="${u.id}" ${F.ku === u.id ? 'selected' : ''}>${u.nama}</option>`).join('')}</select></div>
    ${addBtns()}</div>
   ${
       rows.length
           ? `<table class="emp-t"><tr><th>Nama</th><th>Jabatan</th><th>Unit</th><th>Template KPI ${BLN[AKTIF]}</th><th>Penilai</th><th>Status</th><th></th></tr>
    ${rows
        .map((e) => {
            const qq = [e.nama, e.nip, e.jab].join(' ').toLowerCase(),
                k = tplOf(e, AKTIF),
                s = empStat(e),
                u = unitOf(e.unit);
            return `<tr class="click" data-act="empEdit" data-id="${e.id}" data-q="${esc(qq)}" ${q && !qq.includes(q) ? 'style="display:none"' : ''}><td><div class="who"><span class="av sm">${ini(e.nama)}</span><div><b>${esc(e.nama)}</b><span>NIP ${esc(e.nip)}</span></div></div></td><td>${esc(e.jab)}</td><td>${u.nama}<div class="small muted">${divOf(u.div).nama}</div></td><td><span class="row" style="gap:8px">${tChip(k)}<span class="small">${esc(TPL[k].nama)}</span></span></td><td class="small ink2">${u.kepala}</td><td><span class="emp-st ${s === 'Aktif' ? 'on' : s.startsWith('Mulai') ? 'new' : 'off'}">${s}</span></td><td class="r"><span class="link small">Ubah</span></td></tr>`;
        })
        .join('')}</table>`
           : `<div class="empty"><b style="display:block;color:var(--ink)">Belum ada karyawan di sini</b>Klik Tambah karyawan untuk menambahkan.</div>`
   }
  </div>`;
}
function empForm(e) {
    const isNew = !e,
        o = e || {
            nama: '',
            nip: '',
            jab: '',
            unit: UI.f.ku || UNITS[0].id,
            tpl: '',
            mulai: AKTIF,
            email: '',
            hp: '',
        };
    const jabs = [...new Set(EMPS.map((z) => z.jab))];
    const hasVal = e && BLN.some((b, m) => pzLocked(e, m));
    const isAdded = e && S.empAdd.some((z) => z.id === e.id);
    const off = e && e.keluar != null;
    drawer(`<div class="dhead"><h2 class="grow">${isNew ? 'Tambah karyawan' : 'Ubah data karyawan'}</h2><button class="iconbtn" data-act="close" aria-label="Tutup">${i('x')}</button></div>
  <div class="dbody pz-d">
   <div class="stack-s">
    <label class="fld"><span>Nama lengkap <i class="req">*</i></span><input class="f" id="ef_nama" value="${esc(o.nama)}" placeholder="Contoh: dr. Siti Rahmawati"></label>
    <div class="grid2">
     <label class="fld"><span>NIP <i class="req">*</i></span><input class="f" id="ef_nip" value="${esc(o.nip)}" inputmode="numeric" placeholder="Contoh: 1990123"></label>
     <label class="fld"><span>Jabatan <i class="req">*</i></span><input class="f" id="ef_jab" value="${esc(o.jab)}" list="ef_jabs" placeholder="Contoh: Dokter Umum"><datalist id="ef_jabs">${jabs.map((j) => `<option value="${esc(j)}">`).join('')}</datalist></label>
    </div>
    <label class="fld"><span>Unit <i class="req">*</i></span><select class="f" id="ef_unit">${DIVS.map(
        (d) =>
            `<optgroup label="${esc(d.nama)}">${UNITS.filter(
                (u) => u.div === d.id,
            )
                .map(
                    (u) =>
                        `<option value="${u.id}" ${u.id === o.unit ? 'selected' : ''}>${u.nama}</option>`,
                )
                .join('')}</optgroup>`,
    ).join('')}</select></label>
    <div class="ef-info" id="ef_pen">${i('user')}<span>Penilai: <b>${unitOf(o.unit).kepala}</b>, Kepala ${unitOf(o.unit).nama}. Disetujui Kepala ${divOf(unitOf(o.unit).div).nama}.</span></div>
    ${
        isNew
            ? `<div class="grid2">
     <label class="fld"><span>Template KPI <i class="req">*</i></span><select class="f" id="ef_tpl"><option value="">Pilih template</option>${tKeys()
         .map(
             (k) =>
                 `<option value="${k}">${esc(TPL[k].nama)} · ${TPL[k].kpi.length} KPI</option>`,
         )
         .join('')}</select></label>
     <label class="fld"><span>Mulai dinilai <i class="req">*</i></span><select class="f" id="ef_mulai">${BULAN.map((b, m) => (m < AKTIF ? '' : `<option value="${m}" ${m === o.mulai ? 'selected' : ''}>${b} ${TAHUN}</option>`)).join('')}</select></label>
    </div><p class="small muted" style="margin:-4px 0 0" id="ef_hint">Template terisi otomatis bila jabatannya sama dengan karyawan lain.</p>`
            : `<div class="fld"><span>Template KPI ${BULAN[AKTIF]}</span><div class="row" style="gap:10px;padding:6px 0">${tChip(tplOf(e, AKTIF))}<span>${esc(TPL[tplOf(e, AKTIF)].nama)}</span><button class="link small" data-act="empToPz" data-id="${e.id}" style="margin-left:auto">Atur di Penempatan KPI</button></div></div>`
    }
    <div class="grid2">
     <label class="fld"><span>Email</span><input class="f" id="ef_email" type="email" value="${esc(o.email || '')}" placeholder="nama@rs.co.id"></label>
     <label class="fld"><span>No. HP</span><input class="f" id="ef_hp" value="${esc(o.hp || '')}" inputmode="tel" placeholder="08xx"></label>
    </div>
   </div>
   ${
       !isNew
           ? `<div class="ef-zone"><b>Status kepegawaian</b>
     ${
         off
             ? `<p class="small ink2" style="margin:4px 0 12px">${esc(e.nama)} ${AKTIF >= e.keluar ? 'sudah nonaktif' : 'akan nonaktif'} mulai ${BULAN[e.keluar]} ${TAHUN} dan tidak muncul lagi di daftar penilaian sejak bulan itu. Nilai sebelumnya tetap tersimpan.</p><button class="btn" data-act="empOn" data-id="${e.id}">Aktifkan lagi</button>`
             : `<p class="small ink2" style="margin:4px 0 12px">Untuk karyawan yang resign, pensiun, atau pindah ke luar rumah sakit. Nilai yang sudah ada tetap tersimpan.</p><div class="row wrap" style="gap:8px"><button class="btn warn" data-act="empOff" data-id="${e.id}">Nonaktifkan</button>${isAdded && !hasVal ? `<button class="btn ghost" data-act="empDel" data-id="${e.id}" style="color:var(--red)">${i('trash')}Hapus karyawan</button>` : ''}</div>`
     }
   </div>`
           : ''
   }
  </div>
  <div class="dfoot"><span class="grow"></span><button class="btn ghost" data-act="close">Batal</button><button class="btn pri" data-act="empSave" ${e ? `data-id="${e.id}"` : ''}>${isNew ? 'Tambah karyawan' : 'Simpan perubahan'}</button></div>`);
    document
        .querySelectorAll('#drawer .f')
        .forEach((x) =>
            x.addEventListener('input', () => x.classList.remove('err')),
        );
    const u = $('#ef_unit'),
        pen = $('#ef_pen');
    u.addEventListener('change', () => {
        const x = unitOf(u.value);
        pen.querySelector('span').innerHTML =
            `Penilai: <b>${x.kepala}</b>, Kepala ${x.nama}. Disetujui Kepala ${divOf(x.div).nama}.`;
    });
    if (isNew) {
        const jb = $('#ef_jab'),
            tp = $('#ef_tpl'),
            hint = $('#ef_hint');
        jb.addEventListener('input', () => {
            const m = EMPS.find(
                (z) => z.jab.toLowerCase() === jb.value.trim().toLowerCase(),
            );
            if (m && !tp.dataset.touched) {
                tp.value = m.tpl;
                hint.textContent = `Template mengikuti jabatan ${m.jab}. Bisa diganti.`;
            }
        });
        tp.addEventListener('change', () => {
            tp.dataset.touched = '1';
        });
        setTimeout(() => $('#ef_nama')?.focus(), 250);
    }
}
function empSaveNow(id) {
    const g = (k) => ($('#ef_' + k) || {}).value,
        nama = g('nama').trim(),
        nip = g('nip').trim(),
        jab = g('jab').trim(),
        unit = g('unit'),
        email = (g('email') || '').trim(),
        hp = (g('hp') || '').trim();
    const bad = (sel, msg) => {
        toast(msg);
        const el = $(sel);
        if (el) {
            el.classList.add('err');
            el.focus();
        }
        return false;
    };
    document
        .querySelectorAll('#drawer .f.err')
        .forEach((x) => x.classList.remove('err'));
    if (!nama) return bad('#ef_nama', 'Nama lengkap wajib diisi');
    if (!/^\d{4,20}$/.test(nip))
        return bad('#ef_nip', 'NIP harus berupa angka, minimal 4 digit');
    if (EMPS.some((z) => z.nip === nip && z.id !== id))
        return bad('#ef_nip', `NIP ${nip} sudah dipakai karyawan lain`);
    if (!jab) return bad('#ef_jab', 'Jabatan wajib diisi');
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
        return bad('#ef_email', 'Format email belum benar');
    if (!id) {
        const tpl = g('tpl');
        if (!tpl) return bad('#ef_tpl', 'Pilih template KPI');
        const mulai = +g('mulai');
        const o = {
            id: 'N' + Date.now().toString(36),
            nama,
            nip,
            jab,
            unit,
            tpl,
            st: 'Belum',
            mulai,
            email,
            hp,
        };
        S.empAdd.push(o);
        EMPS.push(Object.assign({}, o));
        S.act.unshift({
            t: 'Baru saja',
            who: ACC.hc.nama,
            txt: `menambahkan ${nama} ke ${unitOf(unit).nama}`,
        });
        save();
        closeAll();
        refresh();
        toast(`${nama} ditambahkan. Mulai dinilai ${BULAN[mulai]} ${TAHUN}.`);
        return true;
    }
    const e = emp(id);
    empPersist(e, { nama, nip, jab, unit, email, hp });
    closeAll();
    refresh();
    toast('Data karyawan disimpan');
    return true;
}

/* =========================================================
   KEPALA UNIT: tambah, ganti, ubah (Super HC)
   ========================================================= */
if (!S.unitAdd) S.unitAdd = [];
if (!S.unitMod) S.unitMod = {};
S.unitAdd.forEach((o) => {
    if (!UNITS.some((u) => u.id === o.id)) UNITS.push(Object.assign({}, o));
});
Object.entries(S.unitMod).forEach(([id, o]) => {
    const u = UNITS.find((z) => z.id === id);
    if (u) Object.assign(u, o);
});
if (unitOf(ACC.ku.unit)) ACC.ku.nama = unitOf(ACC.ku.unit).kepala;
const isOffE = (e) => e.keluar != null && AKTIF >= e.keluar;
const kvSwitch = () => {
    const kv = UI.tab.kv || 'karyawan';
    return `<div class="seg">${[
        ['karyawan', 'Karyawan', EMPS.filter((e) => !isOffE(e)).length],
        ['kepala', 'Kepala unit', UNITS.length],
    ]
        .map(
            ([k, t, n]) =>
                `<button class="${kv === k ? 'on' : ''}" data-act="tab" data-k="kv" data-v="${k}">${t}<span class="c">${n}</span></button>`,
        )
        .join('')}</div>`;
};
const addBtns = () =>
    `<div class="row" style="gap:8px"><button class="btn" data-act="kuNew">${i('plus')}Tambah kepala unit</button><button class="btn pri" data-act="empNew">${i('plus')}Tambah karyawan</button></div>`;
function hcKepala() {
    const F = UI.f,
        rows = UNITS.filter((u) => !F.kdv || u.div === F.kdv);
    return `<div class="content stack">
   <div class="row between wrap" style="gap:12px">
    <div class="row wrap" style="gap:8px">${kvSwitch()}
     <select class="f" data-act="filter" data-k="kdv"><option value="">Semua divisi</option>${DIVS.map((d) => `<option value="${d.id}" ${F.kdv === d.id ? 'selected' : ''}>${d.nama}</option>`).join('')}</select></div>
    ${addBtns()}</div>
   <table><tr><th>Unit</th><th>Kepala unit</th><th class="r">Karyawan aktif</th><th>Disetujui oleh</th><th></th></tr>
   ${rows
       .map((u) => {
           const n = EMPS.filter((e) => e.unit === u.id && !isOffE(e)).length;
           return `<tr class="click" data-act="kuEdit" data-u="${u.id}"><td><b style="font-weight:600">${esc(u.nama)}</b><div class="small muted">${divOf(u.div).nama}</div></td><td><div class="who"><span class="av sm">${ini(u.kepala)}</span><div><b>${esc(u.kepala)}</b><span>${u.nip ? 'NIP ' + esc(u.nip) : 'NIP belum diisi'}</span></div></div></td><td class="r num">${n}</td><td class="small ink2">${esc(divOf(u.div).kepala)}<div class="muted">Kepala ${divOf(u.div).nama}</div></td><td class="r"><span class="link small">Ubah</span></td></tr>`;
       })
       .join('')}
   </table>
   <p class="small muted" style="margin:0">Kepala unit memberi nilai untuk semua karyawan aktif di unitnya. Penilaian lalu diteruskan ke Kepala Divisi.</p>
  </div>`;
}
function kuForm(uid) {
    const U = uid ? unitOf(uid) : null,
        def = U || unitOf(UI.f.ku) || UNITS[0];
    const opt = (sel) =>
        DIVS.map(
            (d) =>
                `<optgroup label="${esc(d.nama)}">${UNITS.filter(
                    (u) => u.div === d.id,
                )
                    .map(
                        (u) =>
                            `<option value="${u.id}" ${u.id === sel ? 'selected' : ''}>${esc(u.nama)}</option>`,
                    )
                    .join('')}</optgroup>`,
        ).join('');
    drawer(`<div class="dhead"><h2 class="grow">${U ? 'Ubah kepala unit' : 'Tambah kepala unit'}</h2><button class="iconbtn" data-act="close" aria-label="Tutup">${i('x')}</button></div>
  <div class="dbody pz-d"><div class="stack-s">
   ${
       U
           ? `<div class="ef-info">${i('home')}<span><b>${esc(U.nama)}</b>, ${divOf(U.div).nama}. Penilaian unit ini disetujui ${esc(divOf(U.div).kepala)}.</span></div>`
           : `<div class="fld"><span>Unit yang dipimpin <i class="req">*</i></span><div class="seg" style="width:100%"><button class="on" data-act="kfMode" data-v="ada" style="flex:1">Unit yang sudah ada</button><button data-act="kfMode" data-v="baru" style="flex:1">Unit baru</button></div></div>
   <div id="kf_ada" class="stack-s"><label class="fld"><span>Unit <i class="req">*</i></span><select class="f" id="kf_unit">${opt(def.id)}</select></label><div class="ef-info warn" id="kf_warn"></div></div>
   <div id="kf_baru" class="stack-s" hidden><div class="grid2"><label class="fld"><span>Nama unit <i class="req">*</i></span><input class="f" id="kf_unama" placeholder="Contoh: Unit Farmasi"></label><label class="fld"><span>Divisi <i class="req">*</i></span><select class="f" id="kf_div">${DIVS.map((d) => `<option value="${d.id}">${esc(d.nama)}</option>`).join('')}</select></label></div><div class="ef-info" id="kf_divinfo"></div></div>`
   }
   <label class="fld"><span>Nama lengkap <i class="req">*</i></span><input class="f" id="kf_nama" value="${U ? esc(U.kepala) : ''}" placeholder="Contoh: dr. Rina Kartika, Sp.FK"></label>
   <div class="grid2"><label class="fld"><span>NIP <i class="req">*</i></span><input class="f" id="kf_nip" value="${U ? esc(U.nip || '') : ''}" inputmode="numeric" placeholder="Contoh: 1985112"></label><label class="fld"><span>Email</span><input class="f" id="kf_email" type="email" value="${U ? esc(U.email || '') : ''}" placeholder="nama@rs.co.id"></label></div>
   <div class="grid2"><label class="fld"><span>No. HP</span><input class="f" id="kf_hp" value="${U ? esc(U.hp || '') : ''}" inputmode="tel" placeholder="08xx"></label>
   <label class="fld"><span>${U ? 'Kata sandi baru' : 'Kata sandi awal'} ${U ? '' : '<i class="req">*</i>'}</span><input class="f" id="kf_pw" type="text" autocomplete="new-password" placeholder="${U ? 'Kosongkan bila tidak diubah' : 'Minimal 8 karakter'}"></label></div>
   <p class="small muted" style="margin:0">Kepala unit masuk dengan email atau NIP dan kata sandi ini, lalu bisa mengisi nilai semua karyawan di unitnya. Sampaikan kata sandinya langsung ke yang bersangkutan.</p>
  </div></div>
  <div class="dfoot"><span class="grow"></span><button class="btn ghost" data-act="close">Batal</button><button class="btn pri" data-act="kfSave" ${U ? `data-u="${U.id}"` : ''}>${U ? 'Simpan perubahan' : 'Tambah kepala unit'}</button></div>`);
    document
        .querySelectorAll('#drawer .f')
        .forEach((x) =>
            x.addEventListener('input', () => x.classList.remove('err')),
        );
    if (!U) {
        const su = $('#kf_unit'),
            w = $('#kf_warn'),
            dv = $('#kf_div'),
            di = $('#kf_divinfo');
        const upd = () => {
            const u = unitOf(su.value),
                n = EMPS.filter((e) => e.unit === u.id && !isOffE(e)).length;
            w.innerHTML = `${i('warn')}<span>Kepala saat ini <b>${esc(u.kepala)}</b>. Bila disimpan, kepala baru menggantikannya dan langsung menilai ${n} karyawan di unit ini. Nilai yang sudah ada tidak berubah.</span>`;
        };
        const upd2 = () => {
            const d = divOf(dv.value);
            di.innerHTML = `${i('user')}<span>Penilaian unit baru ini disetujui <b>${esc(d.kepala)}</b>, Kepala ${d.nama}.</span>`;
        };
        su.addEventListener('change', upd);
        dv.addEventListener('change', upd2);
        upd();
        upd2();
    }
    setTimeout(() => {
        const f = $(U ? '#kf_nama' : '#kf_unit');
        if (f) f.focus();
    }, 250);
}
function kfSaveNow(uid) {
    const g = (k) => (($('#kf_' + k) || {}).value || '').trim(),
        nama = g('nama'),
        nip = g('nip'),
        email = g('email'),
        hp = g('hp');
    const bad = (sel, msg) => {
        toast(msg);
        const el = $(sel);
        if (el) {
            el.classList.add('err');
            el.focus();
        }
        return false;
    };
    const mode = uid
        ? 'edit'
        : $('#kf_baru') && !$('#kf_baru').hidden
          ? 'baru'
          : 'ada';
    const target =
        mode === 'edit'
            ? unitOf(uid)
            : mode === 'ada'
              ? unitOf(g('unit'))
              : null;
    if (mode === 'baru') {
        const un = g('unama');
        if (!un) return bad('#kf_unama', 'Nama unit wajib diisi');
        if (UNITS.some((u) => u.nama.toLowerCase() === un.toLowerCase()))
            return bad('#kf_unama', `${un} sudah ada`);
    }
    if (!nama) return bad('#kf_nama', 'Nama lengkap wajib diisi');
    if (!/^\d{4,20}$/.test(nip))
        return bad('#kf_nip', 'NIP harus berupa angka, minimal 4 digit');
    if (
        EMPS.some((e) => e.nip === nip) ||
        UNITS.some((u) => u.nip === nip && u !== target)
    )
        return bad('#kf_nip', `NIP ${nip} sudah dipakai`);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
        return bad('#kf_email', 'Format email belum benar');
    const pw = ($('#kf_pw') || {}).value || '';
    if ((!uid && !pw) || (pw && pw.length < 8))
        return bad(
            '#kf_pw',
            pw ? 'Kata sandi minimal 8 karakter' : 'Isi kata sandi awal',
        );
    const fields = { kepala: nama, nip, email, hp };
    if (pw) fields.pw = pw;
    const persist = (u) => {
        const a = S.unitAdd.find((o) => o.id === u.id);
        if (a) Object.assign(a, fields);
        else S.unitMod[u.id] = Object.assign(S.unitMod[u.id] || {}, fields);
        Object.assign(u, fields);
        if (u.id === ACC.ku.unit) ACC.ku.nama = nama;
    };
    let msg;
    if (mode === 'baru') {
        const o = {
            id: 'U' + Date.now().toString(36),
            div: g('div'),
            nama: g('unama'),
            ...fields,
        };
        S.unitAdd.push(o);
        UNITS.push(Object.assign({}, o));
        S.act.unshift({
            t: 'Baru saja',
            who: ACC.hc.nama,
            txt: `menambahkan ${o.nama} dengan kepala unit ${nama}`,
        });
        msg = `${o.nama} ditambahkan, kepala unit ${nama}`;
    } else {
        const old = target.kepala;
        persist(target);
        if (mode === 'ada' && old !== nama) {
            S.act.unshift({
                t: 'Baru saja',
                who: ACC.hc.nama,
                txt: `menetapkan ${nama} sebagai Kepala ${target.nama}, menggantikan ${old}`,
            });
            msg = `${nama} sekarang Kepala ${target.nama}`;
        } else msg = 'Data kepala unit disimpan';
    }
    save();
    closeAll();
    UI.tab.kv = 'kepala';
    if (UI.view === 'karyawan') refresh();
    toast(msg);
    return true;
}

try {
    const a_ = JSON.parse(sessionStorage.getItem(KEY + '-acc') || 'null');
    if (a_ && UI.role === a_.role) applyAcc(a_);
} catch (e) {}
/* =========================================================
   PANDUAN BERGAMBAR + TUR "TUNJUKKAN DI APLIKASI"
   ========================================================= */
IC.play = 'M8 5.5v13l10.5-6.5z';
const tourPending = () => {
    const e = scope().find((e) => ev(e.id, AKTIF).status === 'Diajukan');
    return e && e.id;
};
const TOURS = {
    ku: {
        isi: {
            go: 'nilai',
            prep: () => {
                UI.f.pf = 'semua';
                UI.f.q = '';
                const e = scope().find((e) =>
                    ['Belum', 'Draft', 'Dikembalikan'].includes(
                        ev(e.id, AKTIF).status,
                    ),
                );
                UI.sel = e ? e.id : null;
            },
            steps: [
                {
                    sel: '.plist .pitem.on',
                    t: 'Pilih karyawan',
                    d: 'Daftar karyawan di unitmu. Klik nama untuk membuka lembar nilainya. Filter Perlu diisi menampilkan yang belum selesai.',
                },
                {
                    sel: '.score-in',
                    t: 'Ketik nilai',
                    d: 'Isi angka 10 sampai 100 untuk setiap KPI. Tekan Enter untuk pindah ke KPI berikutnya.',
                },
                {
                    sel: '.total',
                    t: 'Total terhitung otomatis',
                    d: 'Setiap nilai dikali bobot lalu dijumlahkan. Kategorinya ikut muncul di sini.',
                },
                {
                    sel: '.temuan',
                    t: 'Tulis temuan',
                    d: 'Catat temuan positif atau negatif bila ada. Temuan tidak mengubah total nilai.',
                },
                {
                    sel: '[data-act=submit]',
                    t: 'Ajukan',
                    d: 'Klik Ajukan ke Kepala Divisi bila semua nilai sudah terisi. Belum selesai? Klik Simpan draft di sebelahnya.',
                },
            ],
        },
        perbaiki: {
            go: 'pengajuan',
            prep: () => {
                UI.tab.pj = 'Dikembalikan';
                UI.f.pjq = '';
            },
            steps: [
                {
                    sel: '[data-act=tab][data-k=pj][data-v=Dikembalikan]',
                    t: 'Buka tab Dikembalikan',
                    d: 'Semua penilaian yang dikembalikan Kepala Divisi dikumpulkan di sini.',
                },
                {
                    sel: '.content table tr:nth-child(2) td:nth-child(2)',
                    t: 'Baca catatannya',
                    d: 'Catatan dari Kepala Divisi tampil berwarna oranye di kolom tahap.',
                },
                {
                    sel: '[data-act=openPerson]',
                    t: 'Klik Perbaiki',
                    d: 'Lembar nilai terbuka. Ubah nilai sesuai catatan, lalu ajukan lagi.',
                },
            ],
        },
        tarik: {
            go: 'pengajuan',
            prep: () => {
                UI.tab.pj = 'Diajukan';
                UI.f.pjq = '';
            },
            steps: [
                {
                    sel: '[data-act=tab][data-k=pj][data-v=Diajukan]',
                    t: 'Buka tab Menunggu',
                    d: 'Penilaian yang sudah diajukan dan belum disetujui ada di sini.',
                },
                {
                    sel: '[data-act=withdraw]',
                    t: 'Klik Tarik kembali',
                    d: 'Setelah dikonfirmasi, statusnya kembali menjadi Draft dan nilainya bisa diubah.',
                },
            ],
        },
        riwayat: {
            go: 'riwayat',
            steps: [
                {
                    sel: '.content h2',
                    t: 'Tren nilai unit',
                    d: 'Grafik rata-rata nilai unit selama 12 bulan.',
                },
                {
                    sel: '[data-act=exportOpen]',
                    t: 'Export Excel',
                    d: 'Unduh nilai 12 bulan semua karyawan unit dalam format template KPI.',
                },
            ],
        },
    },
    kd: {
        tinjau: {
            go: 'persetujuan',
            prep: () => {
                UI.tab.ps = 'Diajukan';
            },
            steps: [
                {
                    sel: '[data-act=tab][data-k=ps][data-v=Diajukan]',
                    t: 'Tab Menunggu',
                    d: 'Penilaian yang diajukan Kepala Unit, dikelompokkan per unit.',
                },
                {
                    sel: 'tr[data-act=review] td:nth-child(2)',
                    t: 'Klik nama karyawan',
                    d: 'Lembar nilainya terbuka di panel kanan, lengkap dengan temuan dan riwayat.',
                },
            ],
        },
        setujui: {
            go: 'persetujuan',
            prep: () => {
                UI.tab.ps = 'Diajukan';
            },
            steps: [
                {
                    sel: '.ledger tr:nth-child(2)',
                    pre: () => {
                        const id = tourPending();
                        if (id) openReview(id, AKTIF, 'kd');
                    },
                    t: 'Periksa nilai tiap KPI',
                    d: 'Kolom vs bulan lalu menunjukkan naik turunnya nilai dibanding bulan sebelumnya.',
                },
                {
                    sel: '#note',
                    t: 'Tulis catatan',
                    d: 'Wajib diisi bila penilaian dikembalikan, supaya Kepala Unit tahu apa yang harus diperbaiki.',
                },
                {
                    sel: '[data-act=returnKD]',
                    t: 'Kembalikan',
                    d: 'Kirim balik ke Kepala Unit beserta catatanmu.',
                },
                {
                    sel: '[data-act=approve]',
                    t: 'Setujui',
                    d: 'Bila sudah sesuai, klik Setujui. Panel langsung membuka penilaian berikutnya.',
                },
            ],
        },
        sekaligus: {
            go: 'persetujuan',
            prep: () => {
                UI.tab.ps = 'Diajukan';
            },
            steps: [
                {
                    sel: '[data-act=chk]',
                    t: 'Centang karyawan',
                    d: 'Pilih penilaian yang ingin disetujui bersamaan.',
                },
                {
                    sel: '[data-act=bulkApprove]',
                    t: 'Setujui sekaligus',
                    d: 'Tanpa centang, tombol ini menyetujui semua yang menunggu. Daftar namanya dikonfirmasi dulu.',
                },
            ],
        },
        pantau: {
            go: 'dashboard',
            steps: [
                {
                    sel: '.filters',
                    t: 'Saring data',
                    d: 'Pilih unit, jabatan, atau kategori untuk mempersempit dashboard.',
                },
                {
                    sel: '[data-act=exportOpen]',
                    t: 'Export Excel',
                    d: 'Unduh nilai 12 bulan sesuai filter yang sedang dipakai.',
                },
            ],
        },
    },
    hc: {
        karyawan: {
            go: 'karyawan',
            prep: () => {
                UI.tab.kv = 'karyawan';
            },
            steps: [
                {
                    sel: '[data-act=empNew]',
                    t: 'Tambah karyawan',
                    d: 'Isi nama, NIP, jabatan, unit, template KPI, dan bulan mulai dinilai.',
                },
                {
                    sel: '[data-act=kuNew]',
                    t: 'Tambah kepala unit',
                    d: 'Tunjuk kepala baru untuk unit yang ada, atau buat unit baru beserta kepalanya.',
                },
                {
                    sel: 'tr[data-act=empEdit] td:first-child',
                    t: 'Ubah atau nonaktifkan',
                    d: 'Klik baris karyawan untuk mengubah data atau menonaktifkannya.',
                },
            ],
        },
        final: {
            go: 'rekap',
            prep: () => {
                UI.tab.rk = 'Disetujui';
            },
            steps: [
                {
                    sel: '[data-act=tab][data-k=rk][data-v=Disetujui]',
                    t: 'Tab Siap difinalkan',
                    d: 'Penilaian yang sudah disetujui Kepala Divisi.',
                },
                {
                    sel: 'tr[data-act=reviewHC] td:first-child',
                    t: 'Periksa lembar nilai',
                    d: 'Klik nama untuk memeriksa, lalu Finalkan atau Kembalikan.',
                },
                {
                    sel: '[data-act=bulkFinal]',
                    t: 'Finalkan sekaligus',
                    d: 'Kunci semua penilaian di tab ini dalam satu klik setelah konfirmasi.',
                },
            ],
        },
        rekap: {
            go: 'rekap',
            steps: [
                {
                    sel: '[data-act=exportOpen]',
                    t: 'Export Excel',
                    d: 'Pilih cakupan, lalu unduh file dengan kolom Pilar sampai Desember.',
                },
                {
                    sel: '[data-act=copyRekap]',
                    t: 'Salin cepat',
                    d: 'Salin rekap lalu tempel langsung di Excel tanpa file.',
                },
            ],
        },
        kpi: {
            go: 'kpi',
            steps: [
                {
                    sel: '[data-act=tab][data-k=mk]',
                    t: 'Pilih template',
                    d: 'Setiap jabatan punya template KPI sendiri.',
                },
                {
                    sel: '.content table',
                    t: 'Ubah di tabel',
                    d: 'Pilar, KPI, Numerator, Denominator, Formula, Target, dan Bobot bisa diubah langsung.',
                },
                {
                    sel: '[data-act=saveKpi]',
                    t: 'Simpan',
                    d: 'Pastikan total bobot 100%, lalu simpan.',
                },
            ],
        },
        penempatan: {
            go: 'penempatan',
            steps: [
                {
                    sel: '[data-act=pzOpen]:not([data-id])',
                    t: 'Atur KPI',
                    d: 'Pilih karyawan, template, dan bulan berlakunya sekaligus.',
                },
                {
                    sel: '.pg-head',
                    t: 'Satu kotak, satu template',
                    d: 'Karyawan dikelompokkan sesuai template KPI yang dipakai di bulan penilaian ini.',
                },
                {
                    sel: '.pg-move',
                    t: 'Pindah template',
                    d: 'Klik Pindah untuk memindahkan karyawan ke template lain mulai bulan ini. Bulan yang sudah dinilai terkunci.',
                },
            ],
        },
        pantau: {
            go: 'dashboard',
            steps: [
                {
                    sel: '.filters',
                    t: 'Saring data',
                    d: 'Pilih divisi, unit, jabatan, atau kategori.',
                },
                {
                    sel: '[data-act=exportOpen]',
                    t: 'Export Excel',
                    d: 'Unduh nilai 12 bulan sesuai filter yang sedang dipakai.',
                },
            ],
        },
    },
};
/* ---- Gambar mini dari tampilan asli ---- */
function shotFig(r, id) {
    const T = TOURS[r][id];
    return `<figure class="shot" data-shot="${r}:${id}"><div class="shot-frame"><div class="shot-bar"><i></i><i></i><i></i><span>ABprove · ${esc(gTitleR(T.go, r))}</span></div><div class="shot-vp"><div class="shot-in"></div></div></div><figcaption class="shot-leg">${T.steps.map((s, n) => `<span><b>${n + 1}</b>${esc(s.t)}</span>`).join('')}</figcaption></figure>`;
}
const gTitleR = (g, r) => {
    const t = TITLES[g];
    return typeof t === 'object' ? t[r] : t;
};
function shotHTML(r, id) {
    const T = TOURS[r][id],
        bk = {
            role: UI.role,
            month: UI.month,
            sel: UI.sel,
            tab: { ...UI.tab },
            f: JSON.parse(JSON.stringify(UI.f)),
            view: UI.view,
            pzSel: UI.pzSel,
        };
    let html = '';
    try {
        UI.role = r;
        UI.month = AKTIF;
        UI.view = T.go;
        UI.pzSel = new Set();
        if (T.prep) T.prep();
        if (id === 'setujui') {
            const pid = tourPending(),
                e = pid && emp(pid);
            html = e
                ? `<div class="shot-drawer"><div class="dhead"><div class="grow"><div class="small muted">${BULAN[AKTIF]} ${TAHUN}</div><h2>Lembar nilai</h2></div></div><div class="dbody">${sheetHTML(e, AKTIF, 'kd')}<label class="small muted" style="display:block;margin-top:22px">Catatan untuk Kepala Unit (wajib bila dikembalikan)</label><textarea class="f" id="note" style="margin-top:6px" placeholder="Contoh: nilai Audit Rekam Medis belum sesuai hasil audit"></textarea></div><div class="dfoot"><span class="grow"></span><button class="btn warn" data-act="returnKD">Kembalikan</button><button class="btn pri" data-act="approve">Setujui</button></div></div>`
                : '';
        } else html = VIEWS[r][T.go]();
    } catch (err) {
        html = '';
    }
    Object.assign(UI, {
        role: bk.role,
        month: bk.month,
        sel: bk.sel,
        tab: bk.tab,
        f: bk.f,
        view: bk.view,
        pzSel: bk.pzSel,
    });
    return html;
}
window.addEventListener('resize', () => {
    clearTimeout(window._gdT);
    window._gdT = setTimeout(() => {
        if (document.querySelector('figure.shot')) gdShots();
    }, 250);
});
function gdShots() {
    document.querySelectorAll('figure.shot').forEach((fig) => {
        const [r, id] = fig.dataset.shot.split(':'),
            T = TOURS[r][id],
            vp = fig.querySelector('.shot-vp'),
            inn = fig.querySelector('.shot-in');
        const html = shotHTML(r, id);
        if (!html) {
            fig.remove();
            return;
        }
        inn.innerHTML = html;
        inn.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
        inn.querySelectorAll('input,textarea,select,button,a').forEach((el) => {
            el.tabIndex = -1;
            el.setAttribute('aria-hidden', 'true');
        });
        const W = id === 'setujui' ? 660 : 1100,
            s0 = vp.clientWidth / W;
        inn.style.width = W + 'px';
        inn.style.transform = `scale(${s0})`;
        const base = inn.getBoundingClientRect();
        const pts = [],
            boxes = [];
        T.steps.forEach((st, n) => {
            const q = st.sel.replace(/^#note$/, 'textarea');
            const el = inn.querySelector(q);
            if (!el) return;
            const b = el.getBoundingClientRect();
            boxes.push([
                n,
                (b.left - base.left) / s0,
                (b.top - base.top) / s0,
                b.width / s0,
                b.height / s0,
            ]);
        });
        const full = inn.scrollHeight;
        let top = 0,
            span = Math.min(full, 560 / s0),
            s = s0;
        if (boxes.length) {
            const lo = Math.min(...boxes.map((b) => b[2])),
                hi = Math.max(...boxes.map((b) => b[2] + b[4]));
            top = Math.max(0, lo - 70);
            span = Math.min(Math.max(hi - top + 80, 320), full - top);
            const MAXH = Math.min(500, innerHeight * 0.62);
            if (span * s0 > MAXH) s = Math.max(MAXH / span, s0 * 0.42);
            if (span * s > MAXH) {
                span = MAXH / s;
            }
        }
        const mk = 30 / s,
            rw = 2.5 / s;
        boxes.forEach(([n, x, y, w, h]) => {
            const p = 6 / s;
            const ring = document.createElement('span');
            ring.className = 'shot-ring';
            Object.assign(ring.style, {
                left: x - p + 'px',
                top: y - p + 'px',
                width: w + p * 2 + 'px',
                height: h + p * 2 + 'px',
                borderWidth: rw + 'px',
                borderRadius: 9 / s + 'px',
            });
            const m = document.createElement('span');
            m.className = 'shot-mk';
            m.textContent = n + 1;
            Object.assign(m.style, {
                left: Math.max(0, x - mk * 0.55) + 'px',
                top: Math.max(0, y - mk * 0.55) + 'px',
                width: mk + 'px',
                height: mk + 'px',
                fontSize: 15 / s + 'px',
            });
            inn.append(ring, m);
        });
        const off = Math.max(0, (vp.clientWidth - W * s) / 2);
        inn.style.transform = `translate(${off}px,${-top * s}px) scale(${s})`;
        vp.style.height = Math.round(span * s) + 'px';
    });
}
/* ---- Tur interaktif ---- */
let TOUR = null;
function tourStart(id) {
    const T = TOURS[UI.role] && TOURS[UI.role][id];
    if (!T) return;
    if (UI.dirty && document.querySelector('.score-in')) {
        toast('Simpan dulu perubahan nilaimu sebelum memulai tur');
        return;
    }
    closeAll();
    UI.month = AKTIF;
    UI.pzSel = new Set();
    if (T.prep) T.prep();
    go(T.go);
    TOUR = { id, T, n: 0 };
    let L = $('#tour');
    if (!L) {
        L = document.createElement('div');
        L.id = 'tour';
        L.className = 'tour';
        L.innerHTML = `<div class="tour-block"></div><div class="tour-hole"></div><div class="tour-tip" role="dialog" aria-modal="true" aria-labelledby="tourT"></div>`;
        document.body.appendChild(L);
    }
    L.classList.add('on');
    document.addEventListener('keydown', tourKey);
    window.addEventListener('resize', tourPos);
    window.addEventListener('scroll', tourPos, true);
    setTimeout(tourShow, 360);
}
function tourKey(e) {
    if (!TOUR) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        tourEnd();
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        tourNext(1);
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        tourNext(-1);
    }
}
function tourNext(d) {
    if (!TOUR) return;
    const n = TOUR.n + d;
    if (n < 0) return;
    if (n >= TOUR.T.steps.length) {
        tourEnd(true);
        return;
    }
    TOUR.n = n;
    tourShow();
}
function tourEnd(done) {
    if (!TOUR) return;
    TOUR = null;
    const L = $('#tour');
    if (L) L.classList.remove('on');
    document.removeEventListener('keydown', tourKey);
    window.removeEventListener('resize', tourPos);
    window.removeEventListener('scroll', tourPos, true);
    if (done) toast('Tur selesai');
}
function tourShow() {
    if (!TOUR) return;
    const s = TOUR.T.steps[TOUR.n];
    if (s.pre && !$('#drawer.on')) {
        s.pre();
        setTimeout(tourShow, 380);
        return;
    }
    const el = document.querySelector(s.sel);
    TOUR.el = el;
    const N = TOUR.T.steps.length,
        last = TOUR.n === N - 1,
        tip = document.querySelector('#tour .tour-tip');
    tip.innerHTML = `<div class="tour-top"><span class="tour-n">Langkah ${TOUR.n + 1} dari ${N}</span><button class="iconbtn" id="tourX" aria-label="Tutup tur">${i('x')}</button></div>
   <h3 id="tourT">${esc(s.t)}</h3><p>${esc(s.d)}${el ? '' : `<span class="tour-miss">Bagian ini belum tampil karena tidak ada datanya saat ini.</span>`}</p>
   <div class="tour-dots">${s ? Array.from({ length: N }, (_, k) => `<i class="${k === TOUR.n ? 'on' : ''}"></i>`).join('') : ''}</div>
   <div class="tour-acts">${last ? `<button class="btn ghost sm" id="tourGd">Kembali ke Panduan</button>` : `<button class="btn ghost sm" id="tourP" ${TOUR.n ? '' : 'disabled'}>Sebelumnya</button>`}<button class="btn pri sm" id="tourN">${last ? 'Selesai' : 'Lanjut'}</button></div>`;
    $('#tourX').onclick = () => tourEnd();
    $('#tourN').onclick = () => tourNext(1);
    const p = $('#tourP');
    if (p) p.onclick = () => tourNext(-1);
    const g = $('#tourGd');
    if (g)
        g.onclick = () => {
            const id = TOUR.id;
            tourEnd(true);
            go('panduan');
            setTimeout(() => {
                const x = $('#g-' + id);
                if (x) x.scrollIntoView({ block: 'start' });
            }, 380);
        };
    if (el) {
        try {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch (e) {
            el.scrollIntoView();
        }
    }
    tourPos();
    setTimeout(tourPos, 320);
    setTimeout(() => $('#tourN')?.focus(), 60);
}
function tourPos() {
    if (!TOUR) return;
    const hole = document.querySelector('#tour .tour-hole'),
        tip = document.querySelector('#tour .tour-tip'),
        el = TOUR.el;
    const vw = innerWidth,
        vh = innerHeight,
        tw = Math.min(340, vw - 24);
    tip.style.width = tw + 'px';
    if (!el || !el.isConnected) {
        hole.style.opacity = '0';
        tip.style.left = (vw - tw) / 2 + 'px';
        tip.style.top = Math.max(16, (vh - tip.offsetHeight) / 2) + 'px';
        return;
    }
    const b = el.getBoundingClientRect(),
        pad = 6;
    Object.assign(hole.style, {
        opacity: '1',
        left: b.left - pad + 'px',
        top: b.top - pad + 'px',
        width: b.width + pad * 2 + 'px',
        height: b.height + pad * 2 + 'px',
    });
    const th = tip.offsetHeight,
        below = b.bottom + pad + 14,
        above = b.top - pad - 14 - th;
    let top =
        below + th < vh - 12
            ? below
            : above > 12
              ? above
              : Math.min(vh - th - 12, Math.max(12, b.top));
    let left = Math.min(Math.max(12, b.left), vw - tw - 12);
    if (
        top === Math.min(vh - th - 12, Math.max(12, b.top)) &&
        b.right + tw + 24 < vw
    )
        left = b.right + 18;
    tip.style.top = top + 'px';
    tip.style.left = left + 'px';
}

const VIEWS = {
    ku: {
        cari: cariView,
        profil: profilView,
        panduan: panduanView,
        beranda: kuBeranda,
        nilai: kuNilai,
        pengajuan: kuPengajuan,
        riwayat: kuRiwayat,
        kpi: kpiReadOnly,
    },
    kd: {
        cari: cariView,
        profil: profilView,
        panduan: panduanView,
        beranda: kdBeranda,
        persetujuan: kdPersetujuan,
        dashboard: dashboard,
        kpi: kpiReadOnly,
    },
    hc: {
        karyawan: hcKaryawan,
        penempatan: hcPenempatan,
        cari: cariView,
        profil: profilView,
        panduan: panduanView,
        beranda: hcBeranda,
        rekap: hcRekap,
        dashboard: dashboard,
        kpi: hcKpi,
        pengaturan: hcPengaturan,
    },
};

/* =========================================================
   AKSI
   ========================================================= */
function nextOpen(fromId) {
    const m = UI.month,
        es = scope(),
        i0 = es.findIndex((e) => e.id === fromId);
    for (let k = 1; k <= es.length; k++) {
        const e = es[(i0 + k) % es.length];
        if (editable(ev(e.id, m))) return e.id;
    }
    return null;
}
function swapPane() {
    const p = $('#pane');
    if (!p) return refresh();
    p.style.opacity = 0;
    setTimeout(() => {
        refresh();
        const n = $('#pane');
        if (n) {
            n.style.opacity = 0;
            n.style.transition = 'opacity .18s';
            requestAnimationFrame(() => (n.style.opacity = 1));
        }
    }, 90);
}
const A = {
    go: (el) => go(el.dataset.go),
    burger: () => {
        if (window.innerWidth < 900) {
            document.querySelector('.app').classList.add('mob-open');
            $('#scrim').classList.add('on');
            return;
        }
        UI.navOpen = !UI.navOpen;
        try {
            localStorage.setItem(KEY + '-nav', UI.navOpen ? '1' : '0');
        } catch (e) {}
        const ap = document.querySelector('.app');
        if (ap) ap.classList.toggle('collapsed', !UI.navOpen);
        const b = document.querySelector('.burger');
        if (b) b.setAttribute('aria-expanded', UI.navOpen);
    },
    close: closeAll,
    notif: openNotif,
    help: () => go('panduan'),
    notifPop: (el) => {
        const m = $('#menu');
        if (m.classList.contains('on') && m.classList.contains('pop-notif')) {
            m.classList.remove('on');
            return;
        }
        openNotifPop(el);
    },
    acct: (el) => {
        const m = $('#menu');
        if (m.classList.contains('on') && m.classList.contains('pop-acct')) {
            m.classList.remove('on');
            return;
        }
        openAcct(el);
    },
    period: (el) => {
        const m = $('#menu');
        if (m.classList.contains('on') && m.classList.contains('pop-period')) {
            m.classList.remove('on');
            return;
        }
        openPeriod(el);
    },
    setMonth: (el) => {
        UI.month = +el.dataset.m;
        $('#menu').classList.remove('on');
        refresh();
    },
    palette: () => {
        UI.f.cq = '';
        A.go({ dataset: { go: 'cari' } });
    },
    cqClear: () => {
        UI.f.cq = '';
        $('#cq').value = '';
        $('#cres').innerHTML = cariResults('');
        $('#cqx').style.visibility = 'hidden';
        $('#cq').focus();
    },
    histOpen: (el) => {
        const x = hist()[+el.dataset.n];
        if (!x) return;
        if (x.k === 'q') {
            UI.f.cq = x.q;
            pushHist(x);
            refresh();
        } else if (x.k === 'emp') {
            pushHist(x);
            openEmp(x.id);
        } else {
            pushHist(x);
            A.go({ dataset: { go: x.go } });
        }
    },
    histDel: (el) => {
        hist().splice(+el.dataset.n, 1);
        save();
        $('#cres').innerHTML = cariResults($('#cq').value);
    },
    histClear: () =>
        confirmBox(
            'Hapus semua pencarian terakhir?',
            'Riwayat pencarian di akun ini akan dikosongkan. Tindakan ini tidak bisa dibatalkan.',
            '<button class="btn pri" data-act="%A">Hapus semua</button>',
            'doHistClear',
        ),
    doHistClear: () => {
        S.hist[UI.role] = [];
        save();
        closeAll();
        toast('Riwayat pencarian dihapus');
        refresh();
    },
    cariEmp: (el) => {
        const q = ($('#cq') || {}).value;
        if (q && q.trim()) pushHist({ k: 'q', q: q.trim() });
        pushHist({ k: 'emp', id: el.dataset.id });
        openEmp(el.dataset.id);
    },
    cariPage: (el) => {
        const q = ($('#cq') || {}).value;
        if (q && q.trim()) pushHist({ k: 'q', q: q.trim() });
        pushHist({
            k: 'page',
            go: el.dataset.go,
            t: el.dataset.t,
            ic: el.dataset.ic,
        });
        if (el.dataset.tpl) {
            UI.tab.kt = el.dataset.tpl;
            UI.tab.mk = el.dataset.tpl;
        }
        A.go({ dataset: { go: el.dataset.go } });
    },
    palPick: (el) => palPick(+el.dataset.n),
    guardSave: () => {
        const f = A._after;
        closeAll();
        A.draft();
        f && f();
    },
    guardDiscard: () => {
        const f = A._after;
        UI.dirty = false;
        closeAll();
        f && f();
    },
    readAll: () => {
        notifList().forEach((x) => (RD()[x.id] = 1));
        save();
        toast('Semua notifikasi ditandai dibaca');
        refresh();
    },
    theme: (el) => {
        UI.theme = el.dataset.v;
        try {
            localStorage.setItem(KEY + '-theme', UI.theme);
        } catch (e) {}
        applyTheme();
        document
            .querySelectorAll('#menu [data-act=theme]')
            .forEach((b) => b.classList.toggle('on', b.dataset.v === UI.theme));
    },
    exportOpen: (el) => openExport(el.dataset.preset),
    doExport: () => {
        const k = $('#xScope').value;
        const { bytes, name } = buildExport(k);
        closeAll();
        downloadXlsx(bytes, name);
    },
    exportTpl: () => exportTemplates(),
    pzOpen: (el) => {
        const id = el.dataset && el.dataset.id;
        const ids = id
            ? [id]
            : [...new Set([...(UI.pzSel || [])].map((s) => s.split('|')[0]))];
        openPz(ids);
    },
    pzMove: (el) => {
        const e = emp(el.dataset.id),
            ms = [];
        for (let m = UI.month; m < 12; m++) if (!pzLocked(e, m)) ms.push(m);
        if (!ms.length) {
            toast(
                `Penilaian ${e.nama} sampai Desember sudah diisi, KPI-nya terkunci`,
            );
            return;
        }
        UI.pzSel = new Set([e.id + '|' + ms[0]]);
        openPz([e.id]);
        UI.pz.end = 'tanpa';
        UI.pz.to = 11;
        const cur = tplOf(e, ms[0]),
            oth = tKeys().find((k) => k !== cur);
        if (oth) UI.pz.tpl = oth;
        pzDrawer();
        UI.pzSel = new Set();
    },
    pzSeg: (el) => {
        const e = emp(el.dataset.id),
            a = +el.dataset.a,
            b = +el.dataset.b,
            ms = [];
        for (let m = a; m <= b; m++) if (!pzLocked(e, m)) ms.push(m);
        if (!ms.length) {
            toast(
                `${BLN[a]}${a !== b ? '–' + BLN[b] : ''} sudah dinilai, KPI-nya terkunci`,
            );
            return;
        }
        UI.pzSel = new Set(ms.map((m) => e.id + '|' + m));
        openPz([e.id]);
        UI.pzSel = new Set();
    },
    pzCell: (el) => {
        const e = emp(el.dataset.id),
            m = +el.dataset.m;
        if (pzLocked(e, m)) {
            toast(`${BULAN[m]} sudah dinilai, KPI-nya terkunci`);
            return;
        }
        const k = e.id + '|' + m;
        UI.pzSel = UI.pzSel || new Set();
        if (UI.pzSel.has(k)) UI.pzSel.delete(k);
        else UI.pzSel.add(k);
        refresh();
    },
    pzClear: () => {
        UI.pzSel.clear();
        refresh();
    },
    pzApply: (el) => {
        const k = el.dataset.k,
            items = [...UI.pzSel].map((s) => s.split('|'));
        items.forEach(([id, m]) => pzSet(id, +m, k));
        const es = [...new Set(items.map((x) => x[0]))].map(emp),
            ms = [...new Set(items.map((x) => +x[1]))].sort((a, b) => a - b);
        S.asgLog.unshift({
            t: nowHM(),
            who: ACC.hc.nama,
            txt: `menetapkan ${TPL[k].nama} untuk ${pzNames(es)}, ${ms.map((m) => BLN[m]).join(', ')} ${TAHUN}`,
        });
        save();
        UI.pzSel.clear();
        refresh();
        toast(`${TPL[k].nama} diterapkan ke ${items.length} sel`);
    },
    pzRm: (el) => {
        UI.pz.emps = UI.pz.emps.filter((x) => x !== el.dataset.id);
        pzDrawer();
    },
    pzAddEmp: (el) => {
        UI.pz.emps.push(el.dataset.id);
        pzDrawer();
        setTimeout(() => {
            const f = $('#pzFind');
            if (f) f.focus();
        }, 30);
    },
    pzAddAll: (el) => {
        el.dataset.ids.split(',').forEach((id) => {
            if (!UI.pz.emps.includes(id)) UI.pz.emps.push(id);
        });
        pzDrawer();
    },
    pzMode: (el) => {
        const P = UI.pz;
        P.mode = el.dataset.v;
        if (P.mode === 'man' && !P.man.length)
            P.man = TPL[P.tpl].kpi
                .filter((k) => k[1])
                .map((k) => ({ id: k[0] + '|' + k[1], b: +k[6] }));
        pzDrawer();
    },
    pzMv: (el) => {
        const P = UI.pz,
            j = +el.dataset.j,
            d = +el.dataset.d;
        if (!P.man[j + d]) return;
        [P.man[j], P.man[j + d]] = [P.man[j + d], P.man[j]];
        pzDrawer();
    },
    pzDel: (el) => {
        UI.pz.man.splice(+el.dataset.j, 1);
        pzDrawer();
    },
    pzAdd: () => {
        UI.pz.man.push({ id: '', b: '' });
        pzDrawer();
    },
    pzEnd: (el) => {
        UI.pz.end = el.dataset.v;
        if (UI.pz.to < UI.pz.from) UI.pz.to = UI.pz.from;
        pzDrawer();
    },
    pzSave: () => pzSaveNow(),
    empNew: () => empForm(),
    empEdit: (el) => empForm(emp(el.dataset.id)),
    empSave: (el) => empSaveNow(el.dataset.id),
    empToPz: (el) => {
        closeAll();
        UI.pzSel = new Set();
        go('penempatan');
        setTimeout(() => openPz([el.dataset.id]), 320);
    },
    empOff: (el) => {
        A._eo = el.dataset.id;
        const e = emp(el.dataset.id);
        confirmBox(
            `Nonaktifkan ${esc(e.nama)}?`,
            `Mulai bulan yang dipilih, ${esc(e.nama)} tidak muncul lagi di daftar penilaian. Nilai sebelumnya tetap tersimpan dan bisa diekspor.`,
            '<button class="btn warn" data-act="%A">Nonaktifkan</button>',
            'doEmpOff',
            `<label class="fld" style="display:block;margin-top:14px"><span>Nonaktif mulai</span><select class="f" id="ef_off" style="width:100%">${BULAN.map((b, m) => (m < AKTIF ? '' : `<option value="${m}" ${m === Math.min(11, AKTIF + 1) ? 'selected' : ''}>${b} ${TAHUN}</option>`)).join('')}</select></label>`,
        );
    },
    doEmpOff: () => {
        const e = emp(A._eo),
            m = +$('#ef_off').value;
        empPersist(e, { keluar: m });
        S.act.unshift({
            t: 'Baru saja',
            who: ACC.hc.nama,
            txt: `menonaktifkan ${e.nama} mulai ${BULAN[m]}`,
        });
        save();
        closeAll();
        refresh();
        toast(`${e.nama} nonaktif mulai ${BULAN[m]} ${TAHUN}`);
    },
    empOn: (el) => {
        const e = emp(el.dataset.id);
        empPersist(e, { keluar: null });
        closeAll();
        refresh();
        toast(`${e.nama} aktif kembali`);
    },
    empDel: (el) => {
        A._ed = el.dataset.id;
        const e = emp(el.dataset.id);
        confirmBox(
            `Hapus ${esc(e.nama)}?`,
            'Karyawan ini belum punya nilai, jadi bisa dihapus permanen.',
            '<button class="btn pri" data-act="%A">Hapus</button>',
            'doEmpDel',
        );
    },
    doEmpDel: () => {
        const id = A._ed,
            e = emp(id);
        S.empAdd = S.empAdd.filter((o) => o.id !== id);
        const k = EMPS.findIndex((z) => z.id === id);
        if (k >= 0) EMPS.splice(k, 1);
        if (S.asg) delete S.asg[id];
        save();
        closeAll();
        refresh();
        toast(`${e.nama} dihapus`);
    },
    kuNew: () => kuForm(),
    kuEdit: (el) => kuForm(el.dataset.u),
    kfMode: (el) => {
        el.parentElement
            .querySelectorAll('button')
            .forEach((b) => b.classList.toggle('on', b === el));
        $('#kf_ada').hidden = el.dataset.v !== 'ada';
        $('#kf_baru').hidden = el.dataset.v !== 'baru';
        const f = $(el.dataset.v === 'ada' ? '#kf_unit' : '#kf_unama');
        if (f) f.focus();
    },
    kfSave: (el) => kfSaveNow(el.dataset.u),
    tourStart: (el) => tourStart(el.dataset.t),
    toc: (el) => {
        const t = document.getElementById('g-' + el.dataset.id);
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    pfSave: () => {
        const p = prof();
        p.nama = $('#pfNama').value.trim();
        p.email = $('#pfEmail').value.trim();
        p.hp = $('#pfHp').value.trim();
        ACC[UI.role].nama = p.nama;
        save();
        toast('Profil disimpan');
        refresh();
    },
    pfCancel: () => {
        refresh();
        toast('Perubahan dibatalkan');
    },
    pwShow: () => {
        const show = $('#pw0').type === 'password';
        document
            .querySelectorAll('.pw')
            .forEach((x) => (x.type = show ? 'text' : 'password'));
        $('#pwLbl').textContent = show ? 'Sembunyikan' : 'Tampilkan';
    },
    pwSave: () => {
        toast('Kata sandi diubah');
        refresh();
    },
    menuMe: (el) => openMe(el),
    asRole: (el) => {
        closeAll();
        UI.role = el.dataset.role;
        UI.sel = null;
        UI.f = {};
        UI.tab = {};
        try {
            sessionStorage.setItem(KEY + '-role', UI.role);
        } catch (e) {}
        go('beranda');
    },
    logout: () =>
        confirmBox(
            'Keluar dari akun?',
            'Pastikan draft sudah disimpan sebelum mengakhiri sesi.',
            '<button class="btn pri" data-act="%A">Keluar</button>',
            'doLogout',
        ),
    doLogout: () => {
        UI.dirty = false;
        closeAll();
        try {
            sessionStorage.removeItem(KEY + '-role');
            sessionStorage.removeItem(KEY + '-acc');
        } catch (e) {}
        LG = {
            v: 'masuk',
            tries: 0,
            lock: 0,
            err: '',
            fe: {},
            id: null,
            sent: '',
        };
        UI.role = null;
        UI.view = 'beranda';
        render();
        setHash();
    },
    month: (el) => {
        UI.month = Math.max(0, Math.min(AKTIF, UI.month + +el.dataset.d));
        refresh();
    },
    notifGo: (el) => {
        if (el.dataset.nid) {
            RD()[el.dataset.nid] = 1;
            save();
        }
        closeAll();
        if (el.dataset.id) UI.sel = el.dataset.id;
        go(el.dataset.go);
    },
    openPerson: (el) => {
        UI.sel = el.dataset.id;
        UI.month = AKTIF;
        if (UI.view === 'nilai') swapPane();
        else go('nilai');
    },
    sel: (el) => {
        UI.sel = el.dataset.id;
        swapPane();
    },
    step: (el) => {
        const es = scope(),
            n = es.findIndex((e) => e.id === UI.sel) + +el.dataset.d;
        if (es[n]) {
            UI.sel = es[n].id;
            swapPane();
        }
    },
    pf: (el) => {
        UI.f.pf = el.dataset.v;
        refresh();
    },
    tab: (el) => {
        UI.tab[el.dataset.k] = el.dataset.v;
        UI.f.chk = {};
        const c = $('#content');
        refresh();
        $('#content').classList.add('view-in');
    },
    view: (el) =>
        openReview(
            el.dataset.id,
            el.dataset.m != null ? +el.dataset.m : UI.month,
            'view',
        ),
    review: (el) => {
        if (event && event.target.closest('input[type=checkbox]')) return;
        openReview(el.dataset.id, UI.month, UI.role === 'kd' ? 'kd' : 'view');
    },
    reviewHC: (el) => openReview(el.dataset.id, UI.month, 'hc'),
    noop: () => {},
    chk: (el) => {
        event.stopPropagation();
        UI.f.chk = UI.f.chk || {};
        UI.f.chk[el.dataset.id] = el.checked;
        refresh();
    },
    copyPrev: () => {
        const e = emp(UI.sel);
        confirmBox(
            `Salin nilai ${BULAN[UI.month - 1]}?`,
            `Nilai ${BULAN[UI.month - 1]} milik ${e.nama} dipakai sebagai titik awal dan tetap bisa diubah.`,
            '<button class="btn pri" data-act="%A">Salin nilai</button>',
            'doCopyPrev',
            `<div class="info" style="margin-top:14px">${i('help')}<div><b>Syarat penyalinan</b><div>Hanya KPI yang sama dengan bulan lalu yang disalin. KPI baru tetap kosong.</div></div></div>`,
        );
    },
    doCopyPrev: () => {
        closeAll();
        const e = emp(UI.sel),
            p = ev(e.id, UI.month - 1);
        document.querySelectorAll('.score-in').forEach((inp) => {
            const pk = kpis(e, UI.month - 1),
                ck = kpis(e, UI.month),
                jj = pk.findIndex((k) => k[1] === ck[inp.dataset.j][1]);
            const v = jj < 0 ? null : p.vals[jj];
            if (valid(v)) inp.value = v;
            inp.dispatchEvent(new Event('input'));
        });
        toast(`Nilai ${BULAN[UI.month - 1]} disalin. Sesuaikan bila perlu.`);
    },
    draft: () => {
        const x = ev(UI.sel, UI.month);
        UI.dirty = false;
        x.savedAt = now();
        x.vals = readVals();
        x.pos = $('#tpos').value.trim();
        x.neg = $('#tneg').value.trim();
        if (x.status === 'Belum') x.status = 'Draft';
        save();
        toast('Draft disimpan');
        refresh();
    },
    submit: () => {
        const e = emp(UI.sel),
            v = readVals(),
            K = kpis(e);
        if (K.some((k, j) => !valid(v[j]))) {
            toast('Isi semua nilai dengan angka 10–100 sebelum mengajukan');
            const b = [...document.querySelectorAll('.score-in')].find(
                (inp) => !valid(inp.value),
            );
            b && b.focus();
            return;
        }
        let t = 0;
        K.forEach((k, j) => (t += (v[j] * k[6]) / 100));
        confirmBox(
            'Ajukan penilaian?',
            `${e.nama}, ${BULAN[UI.month]} ${TAHUN}<br>Total ${fmt(t)}, ${kat(t).t}, ${K.length} dari ${K.length} KPI lengkap`,
            '<button class="btn pri" data-act="%A">Ajukan penilaian</button>',
            'doSubmit',
            `<div class="info" style="margin-top:14px">${i('out')}<div><b>Dikirim ke Kepala Divisi</b><div>Masih bisa ditarik kembali selama belum disetujui.</div></div></div>`,
        );
    },
    doSubmit: () => {
        closeAll();
        UI.dirty = false;
        const e = emp(UI.sel),
            x = ev(e.id, UI.month),
            v = readVals();
        const bad = kpis(e).some((k, j) => !valid(v[j]));
        if (bad) {
            toast('Isi semua nilai dengan angka 10–100 sebelum mengajukan');
            const b = [...document.querySelectorAll('.score-in')].find(
                (inp) => !valid(inp.value),
            );
            b && b.focus();
            return;
        }
        x.vals = v;
        x.pos = $('#tpos').value.trim();
        x.neg = $('#tneg').value.trim();
        x.status = 'Diajukan';
        x.note = '';
        log(x, 'mengajukan ke Kepala Divisi');
        S.act[0].txt = `mengajukan penilaian ${e.nama}`;
        save();
        toast(`Penilaian ${e.nama} diajukan`);
        const n = nextOpen(e.id);
        if (n) {
            UI.sel = n;
            swapPane();
        } else {
            go('pengajuan');
        }
    },
    withdraw: (el) => {
        const id = el.dataset.id || UI.sel,
            e = emp(id);
        confirmBox(
            'Tarik kembali pengajuan?',
            `${e.nama}, ${BULAN[UI.month]} ${TAHUN}.<br>Penilaian kembali menjadi Draft dan bisa diubah lagi. Hanya bisa dilakukan selama belum disetujui Kepala Divisi.`,
            `<button class="btn pri" data-act="%A" data-id="${id}">Tarik kembali</button>`,
            'doWithdraw',
        );
    },
    doWithdraw: (el) => {
        const id = el.dataset.id || UI.sel,
            x = ev(id, UI.month);
        x.status = 'Draft';
        log(x, 'menarik kembali pengajuan');
        save();
        closeAll();
        toast('Pengajuan ditarik, status kembali ke draft');
        refresh();
    },
    approve: (el) => {
        const e = emp(el.dataset.id),
            x = ev(e.id, UI.month);
        const n = ($('#note') || {}).value || '';
        x.status = 'Disetujui';
        x.note = '';
        log(x, 'menyetujui' + (n ? `: ${n}` : ''));
        S.act[0].txt = `menyetujui penilaian ${e.nama}`;
        save();
        toast(`Penilaian ${e.nama} disetujui`);
        const nx = scope().find(
            (z) => ev(z.id, UI.month).status === 'Diajukan',
        );
        refresh();
        if (nx) setTimeout(() => openReview(nx.id, UI.month, 'kd'), 120);
        else closeAll();
    },
    returnKD: (el) => {
        const n = $('#note').value.trim();
        if (!n) {
            toast(
                'Tulis catatan agar Kepala Unit tahu apa yang perlu diperbaiki',
            );
            $('#note').focus();
            return;
        }
        const e = emp(el.dataset.id),
            x = ev(e.id, UI.month);
        x.status = 'Dikembalikan';
        x.note = n;
        log(x, 'mengembalikan: ' + n);
        S.act[0].txt = `mengembalikan penilaian ${e.nama}`;
        save();
        closeAll();
        toast(`Penilaian ${e.nama} dikembalikan ke Kepala Unit`);
        refresh();
    },
    bulkApprove: () => {
        const sel = UI.f.chk || {};
        let es = scope().filter(
            (e) => ev(e.id, UI.month).status === 'Diajukan',
        );
        if (Object.values(sel).some(Boolean)) es = es.filter((e) => sel[e.id]);
        modal(
            `<h2>Setujui ${es.length} penilaian?</h2><p class="ink2">${es.map((e) => e.nama).join(', ')}.</p><div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn ghost" data-act="close">Batal</button><button class="btn pri" data-act="doBulkApprove">Setujui</button></div>`,
        );
        A._bulk = es;
    },
    doBulkApprove: () => {
        A._bulk.forEach((e) => {
            const x = ev(e.id, UI.month);
            x.status = 'Disetujui';
            log(x, 'menyetujui (sekaligus)');
        });
        S.act[0].txt = `menyetujui ${A._bulk.length} penilaian sekaligus`;
        UI.f.chk = {};
        save();
        closeAll();
        toast(`${A._bulk.length} penilaian disetujui`);
        refresh();
    },
    finalOne: (el) => {
        const e = emp(el.dataset.id),
            x = ev(e.id, UI.month);
        x.status = 'Final';
        log(x, 'memfinalkan dan mengunci');
        S.act[0].txt = `memfinalkan penilaian ${e.nama}`;
        save();
        closeAll();
        toast(`Nilai ${e.nama} difinalkan`);
        refresh();
    },
    returnHC: (el) => {
        const e = emp(el.dataset.id),
            x = ev(e.id, UI.month);
        x.status = 'Dikembalikan';
        x.note = 'Dikembalikan SDM untuk diperiksa ulang.';
        log(x, 'mengembalikan ke Kepala Unit');
        S.act[0].txt = `mengembalikan penilaian ${e.nama}`;
        save();
        closeAll();
        toast('Dikembalikan ke Kepala Unit');
        refresh();
    },
    bulkFinal: () => {
        const F = UI.f;
        const es = scope().filter(
            (e) =>
                (!F.div || unitOf(e.unit).div === F.div) &&
                (!F.unit || e.unit === F.unit) &&
                ev(e.id, UI.month).status === 'Disetujui',
        );
        A._bulk = es;
        modal(
            `<h2>Finalkan ${es.length} penilaian?</h2><p class="ink2">Nilai akan dikunci dan tidak bisa diubah lagi oleh Kepala Unit maupun Kepala Divisi.</p><div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn ghost" data-act="close">Batal</button><button class="btn pri" data-act="doBulkFinal">${i('lock')}Finalkan</button></div>`,
        );
    },
    doBulkFinal: () => {
        A._bulk.forEach((e) => {
            const x = ev(e.id, UI.month);
            x.status = 'Final';
            log(x, 'memfinalkan (sekaligus)');
        });
        S.act[0].txt = `memfinalkan ${A._bulk.length} penilaian`;
        save();
        closeAll();
        toast(`${A._bulk.length} penilaian difinalkan`);
        refresh();
    },
    remind: (el) => {
        event.stopPropagation();
        toast(`Pengingat dikirim ke Kepala ${el.dataset.u}`);
    },
    copyRekap: async () => {
        const m = UI.month;
        const lines = [
            [
                'Nama',
                'Jabatan',
                'Unit',
                'Divisi',
                'Bulan',
                'Status',
                'Total nilai',
                'Kategori',
                'Temuan positif',
                'Temuan negatif',
            ].join('\t'),
        ].concat(
            scope().map((e) => {
                const x = ev(e.id, m),
                    t = total(e, m);
                return [
                    e.nama,
                    e.jab,
                    unitOf(e.unit).nama,
                    divOf(unitOf(e.unit).div).nama,
                    BULAN[m] + ' ' + TAHUN,
                    x.status,
                    t == null ? '' : t.toFixed(2).replace('.', ','),
                    kat(t).t,
                    x.pos,
                    x.neg,
                ]
                    .map((v) => String(v).replace(/[\t\n]/g, ' '))
                    .join('\t');
            }),
        );
        try {
            await navigator.clipboard.writeText(lines.join('\n'));
            toast('Rekap disalin. Tempel di Excel.');
        } catch (e) {
            toast('Browser tidak mengizinkan menyalin');
        }
    },
    filter: () => {},
    clearF: () => {
        UI.f = {};
        refresh();
    },
    addKpi: () => {
        const k = UI.tab.mk && TPL[UI.tab.mk] ? UI.tab.mk : Object.keys(TPL)[0];
        TPL[k].kpi.push(['Technical Care', '', '', '', ND, '', 0]);
        refresh();
        const ins = document.querySelectorAll('[data-kf$=",1"]');
        ins[ins.length - 1].focus();
    },
    delKpi: (el) => {
        const k = UI.tab.mk && TPL[UI.tab.mk] ? UI.tab.mk : Object.keys(TPL)[0];
        TPL[k].kpi.splice(+el.dataset.j, 1);
        refresh();
        toast('KPI dihapus');
    },
    saveKpi: () => {
        const k = UI.tab.mk && TPL[UI.tab.mk] ? UI.tab.mk : Object.keys(TPL)[0];
        const s = TPL[k].kpi.reduce((a, x) => a + (+x[6] || 0), 0);
        if (s !== 100) {
            toast(`Total bobot masih ${s}%. Sesuaikan sampai 100%.`);
            return;
        }
        toast('Master KPI disimpan');
        refresh();
    },
    newTpl: () => {
        const id = 'T' + Date.now();
        TPL[id] = {
            nama: 'Template baru',
            kpi: [['Technical Care', '', '', '', ND, '', 100]],
        };
        UI.tab.mk = id;
        refresh();
        const n = document.querySelector('[data-act="tplName"]');
        n.focus();
        n.select();
    },
    tplName: () => {},
    upload: () => {
        drawer(`<div class="dhead"><h2 class="grow">Upload master KPI</h2><button class="iconbtn" data-act="close">${i('x')}</button></div><div class="dbody">
   <label class="drop" id="drop">${i('upload')}<div style="font-weight:600;margin-top:8px">Pilih file Excel</div><div class="small muted">Kolom: Pilar, KPI, Numerator, Denominator, Formula Pengukuran, Target, Bobot KPI</div><input type="file" accept=".xlsx,.xls,.csv" hidden id="fin"></label>
   <div id="pv"></div></div><div class="dfoot"><span class="grow"></span><button class="btn ghost" data-act="close">Batal</button><button class="btn pri" id="imp" data-act="doImport" disabled>Impor</button></div>`);
        const show = (name) => {
            $('#pv').innerHTML =
                `<p style="margin:18px 0 8px"><b>${esc(name)}</b></p><p class="small" style="margin:0 0 10px"><span style="color:var(--green-m);font-weight:600">10 KPI siap diimpor.</span> <span style="color:var(--red);font-weight:600">1 baris belum punya bobot.</span></p><table>${TPL.YJM.kpi.map((k, j) => `<tr ${j === 10 ? 'style="background:var(--red-s)"' : ''}><td class="small">${esc(k[1])}</td><td class="r small num">${j === 10 ? '<span style="color:var(--red)">kosong</span>' : k[6] + '%'}</td></tr>`).join('')}</table>`;
            $('#imp').disabled = false;
        };
        $('#fin').onchange = (e) => {
            const f = e.target.files[0];
            if (f) show(f.name);
        };
        $('#drop').addEventListener('click', (e) => {
            if (e.target.id !== 'fin') {
                e.preventDefault();
                show('Master KPI Individu 2026.xlsx');
            }
        });
    },
    doImport: () => {
        closeAll();
        UI.tab.mk = 'YJM';
        refresh();
        toast('11 KPI diimpor ke template MJR Yanjangmed & Koord Yanmed');
    },
    saveSet: () => {
        document.querySelectorAll('[data-set]').forEach((el) => {
            const k = el.dataset.set;
            S.set[k] = ['sb', 'b', 'c'].includes(k) ? +el.value || 0 : el.value;
        });
        save();
        toast('Pengaturan disimpan');
        refresh();
    },
    reset: () =>
        modal(
            `<h2>Kembalikan data contoh?</h2><p class="ink2">Semua perubahan di prototype ini akan dihapus.</p><div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn ghost" data-act="close">Batal</button><button class="btn pri" data-act="doReset">Kembalikan</button></div>`,
        ),
    doReset: () => {
        S = seed();
        save();
        closeAll();
        toast('Data contoh dikembalikan');
        refresh();
    },
};
[
    'sel',
    'step',
    'go',
    'setMonth',
    'openPerson',
    'asRole',
    'notifGo',
    'palPick',
].forEach((k) => {
    const f = A[k];
    if (f) A[k] = (el) => guard(() => f(el));
});
document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) {
        if (!e.target.closest('#menu')) $('#menu').classList.remove('on');
        return;
    }
    const a = el.dataset.act;
    if (!A[a]) return;
    if (a === 'filter' || a === 'tplName') return;
    if (el.tagName === 'A') e.preventDefault();
    if (!['menuMe', 'acct', 'notifPop', 'theme', 'period'].includes(a))
        $('#menu').classList.remove('on');
    window.event = e;
    A[a](el);
});
document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.act === 'filter') {
        UI.f[el.dataset.k] = el.value;
        if (el.dataset.k === 'div') UI.f.unit = '';
        refresh();
    }
});
document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.act === 'tplName') {
        const k = UI.tab.mk && TPL[UI.tab.mk] ? UI.tab.mk : Object.keys(TPL)[0];
        TPL[k].nama = el.value;
    }
});

/* start */
(function start() {
    let h = '';
    try {
        h = location.hash.slice(1);
    } catch (e) {}
    const [r, v] = h.split('-');
    if (ACC[r]) {
        UI.role = r;
        UI.view = VIEWS[r][v] ? v : 'beranda';
    }
    render();
})();
