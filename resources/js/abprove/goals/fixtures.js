import {
    clone,
    activateCycle,
    assessmentAction,
    monthLabel,
    monthRange,
} from './domain.js';

export function emptyGoal(cycleId = '2026-11', type = 'individual') {
    return {
        id: '',
        code: '',
        type,
        name: '',
        pillar: 'Technical Care',
        description: '',
        templateId: '',
        ownerId: type === 'company' ? 'hospital' : '',
        cycleId,
        direction: 'increase',
        unit: 'percent',
        baseline: '80',
        target: '95',
        targetText: '',
        numerator: '',
        denominator: '',
        formula: 'Numerator / Denominator × 100%',
        weight: '0',
        repeat: false,
        noBaseline: false,
        precision: true,
        krWeighted: false,
        keyResults: [],
        actual: null,
        status: 'draft',
        revision: 1,
    };
}
export function emptyCycle(month = '2027-01') {
    const [year, value] = month.split('-').map(Number),
        process = `${value === 12 ? year + 1 : year}-${String(value === 12 ? 1 : value + 1).padStart(2, '0')}`;
    return {
        id: '',
        month,
        name: `Penilaian ${monthLabel(month)}`,
        description: '',
        status: 'draft',
        opens: `${process}-01T08:00`,
        submission: `${process}-05T23:59`,
        approval: `${process}-10T23:59`,
        finalization: `${process}-15T23:59`,
        closes: `${process}-15T23:59`,
        categories: { sb: 90, b: 80, c: 70 },
        templateIds: [],
        bindings: {},
    };
}
export function seedGoals() {
    const data = {
        version: 1,
        sequence: 100,
        audit: [],
        divisions: [
            { id: 'medis', name: 'Pelayanan Medis' },
            { id: 'keperawatan', name: 'Keperawatan' },
            { id: 'umum-sdm', name: 'Umum & SDM' },
        ],
        units: [
            { id: 'yanmed', name: 'Pelayanan Medis', divisionId: 'medis' },
            { id: 'igd', name: 'Instalasi Gawat Darurat', divisionId: 'medis' },
            { id: 'rawat-inap', name: 'Rawat Inap', divisionId: 'keperawatan' },
            { id: 'sdm', name: 'SDM', divisionId: 'umum-sdm' },
            { id: 'it', name: 'Teknologi Informasi', divisionId: 'umum-sdm' },
        ],
        positions: [
            { id: 'manager', name: 'Manajer Pelayanan Medis' },
            { id: 'dokter', name: 'Dokter Umum' },
            { id: 'perawat', name: 'Perawat Pelaksana' },
            { id: 'admin', name: 'Staf Administrasi' },
        ],
        templates: [
            {
                id: 'tpl-yanmed',
                name: 'Pelayanan Medis · Manajer',
                unitId: 'yanmed',
                divisionId: 'medis',
                positionId: 'manager',
                active: true,
                revision: 1,
            },
            {
                id: 'tpl-igd',
                name: 'IGD · Dokter Umum',
                unitId: 'igd',
                divisionId: 'medis',
                positionId: 'dokter',
                active: true,
                revision: 1,
            },
            {
                id: 'tpl-inap',
                name: 'Rawat Inap · Perawat',
                unitId: 'rawat-inap',
                divisionId: 'keperawatan',
                positionId: 'perawat',
                active: true,
                revision: 1,
            },
            {
                id: 'tpl-sdm',
                name: 'SDM · Staf Administrasi',
                unitId: 'sdm',
                divisionId: 'umum-sdm',
                positionId: 'admin',
                active: true,
                revision: 1,
            },
        ],
        cycles: ['2026-10', '2026-11', '2026-12'].map((month) => ({
            ...emptyCycle(month),
            id: month,
            templateIds: ['tpl-yanmed', 'tpl-igd', 'tpl-inap'],
        })),
        goals: [],
        assessments: [],
        staff: [
            {
                id: 'staff-med-1',
                name: 'dr. Andini Prameswari',
                nip: 'RSAB-26001',
                unitId: 'yanmed',
                divisionId: 'medis',
                positionId: 'manager',
                templateId: 'tpl-yanmed',
            },
            {
                id: 'staff-igd-1',
                name: 'dr. Raka Aditya',
                nip: 'RSAB-26002',
                unitId: 'igd',
                divisionId: 'medis',
                positionId: 'dokter',
                templateId: 'tpl-igd',
            },
            {
                id: 'staff-igd-2',
                name: 'dr. Nadia Putri',
                nip: 'RSAB-26003',
                unitId: 'igd',
                divisionId: 'medis',
                positionId: 'dokter',
                templateId: 'tpl-igd',
            },
            {
                id: 'staff-igd-3',
                name: 'dr. Fajar Ramadhan',
                nip: 'RSAB-26004',
                unitId: 'igd',
                divisionId: 'medis',
                positionId: 'dokter',
                templateId: 'tpl-igd',
            },
            {
                id: 'staff-inap-1',
                name: 'Ns. Diah Kartika',
                nip: 'RSAB-26005',
                unitId: 'rawat-inap',
                divisionId: 'keperawatan',
                positionId: 'perawat',
                templateId: 'tpl-inap',
            },
            {
                id: 'staff-inap-2',
                name: 'Ns. Bagas Pratama',
                nip: 'RSAB-26006',
                unitId: 'rawat-inap',
                divisionId: 'keperawatan',
                positionId: 'perawat',
                templateId: 'tpl-inap',
            },
            {
                id: 'staff-sdm-1',
                name: 'Maya Rahmawati',
                nip: 'RSAB-26007',
                unitId: 'sdm',
                divisionId: 'umum-sdm',
                positionId: 'admin',
                templateId: 'tpl-sdm',
            },
        ],
    };
    // Kolom, urutan pilar, dan contoh bobot mengacu pada lembar KPI pada foto pengguna.
    const medical = [
        [
            'Technical Care',
            'Penambahan Dokter Spesialis',
            'Penambahan Dokter Spesialis',
            'Jumlah Dokter Spesialis yang direncanakan',
            '95%',
            15,
            80,
            95,
        ],
        [
            'Technical Care',
            'Implementasi POA COE Services',
            'POA COE Services yang terlaksana',
            'POA COE yang direncanakan',
            '95%',
            15,
            80,
            95,
        ],
        [
            'Technical Care',
            'Utilisasi Alat vs Capacity',
            'Jumlah pemeriksaan tiap alat',
            'Kapasitas alat per bulan',
            '80%',
            10,
            60,
            80,
        ],
        [
            'Technical Care',
            'Utilisasi Kamar Operasi',
            'Jumlah operasi pada bulan berjalan',
            'Target utilisasi kamar operasi',
            '80%',
            10,
            60,
            80,
        ],
        [
            'Technical Care',
            'Sentinel, KTD, KTC yang terkait medik',
            'Jumlah kasus dalam 1 bulan',
            '',
            'Tidak ada',
            5,
            5,
            0,
        ],
        [
            'Access',
            'Pencapaian Pelatihan',
            'Jumlah pelatihan yang terlaksana',
            'Jumlah pelatihan yang direncanakan',
            '100%',
            10,
            80,
            100,
        ],
        [
            'Coordination and Continuity',
            'Kesesuaian Discharge Planning',
            'Jumlah pasien dengan discharge planning sesuai',
            'Jumlah pasien yang dirawat inap',
            '90%',
            5,
            75,
            90,
        ],
        [
            'Coordination and Continuity',
            'Produktivitas Kerja',
            'Jumlah absensi karyawan',
            'Jumlah hari kerja',
            '1%',
            10,
            5,
            1,
        ],
        [
            'Interpersonal Care',
            'Implementasi Budaya Prima',
            'Jumlah keluhan dalam 1 bulan',
            'Jumlah pelayanan dalam 1 bulan',
            '0 complaint',
            10,
            10,
            0,
        ],
        [
            'Efficient',
            'Selisih pelayanan JKN setiap bulan',
            'Total klaim BPJS − total billing RS',
            'Total billing RS',
            '<20%',
            5,
            30,
            20,
        ],
        [
            'Efficient',
            'Menurunkan AR Ageing >90 hari',
            'Piutang berumur >90 hari',
            'Total piutang',
            '<3%',
            5,
            10,
            3,
        ],
    ];
    const other = {
        'tpl-igd': [
            ['Technical Care', 'Kepatuhan asesmen awal medis', 30],
            ['Access', 'Kecepatan respons pasien gawat darurat', 25],
            ['Technical Care', 'Kelengkapan rekam medis', 20],
            ['Interpersonal Care', 'Komunikasi dengan pasien dan keluarga', 15],
            ['Efficient', 'Ketepatan penggunaan sumber daya', 10],
        ],
        'tpl-inap': [
            ['Technical Care', 'Kepatuhan identifikasi pasien', 30],
            ['Technical Care', 'Kelengkapan asesmen keperawatan', 25],
            [
                'Coordination and Continuity',
                'Kesesuaian serah terima pasien',
                20,
            ],
            ['Interpersonal Care', 'Penerapan komunikasi terapeutik', 15],
            ['Efficient', 'Efisiensi penggunaan bahan medis', 10],
        ],
        'tpl-sdm': [
            ['Access', 'Ketepatan layanan administrasi SDM', 60],
            ['Efficient', 'Akurasi data kepegawaian', 40],
        ],
    };
    for (const cycleId of ['2026-10', '2026-11']) {
        for (const template of data.templates) {
            const rows =
                template.id === 'tpl-yanmed'
                    ? medical
                    : other[template.id].map(([pillar, name, weight]) => [
                          pillar,
                          name,
                          'Jumlah layanan sesuai standar',
                          'Total layanan yang diperiksa',
                          '95%',
                          weight,
                          80,
                          95,
                      ]);
            rows.forEach(
                (
                    [
                        pillar,
                        name,
                        numerator,
                        denominator,
                        targetText,
                        weight,
                        baseline,
                        target,
                    ],
                    index,
                ) =>
                    data.goals.push({
                        ...emptyGoal(cycleId),
                        id: `goal-${cycleId}-${template.id}-${index + 1}`,
                        code: `KPI-${String(++data.sequence).padStart(4, '0')}`,
                        name,
                        pillar,
                        templateId: template.id,
                        ownerId: template.positionId,
                        numerator,
                        denominator,
                        targetText,
                        baseline: String(baseline),
                        target: String(target),
                        weight: String(weight),
                        direction: baseline > target ? 'decrease' : 'increase',
                        unit: denominator ? 'percent' : 'number',
                        formula: denominator
                            ? 'Numerator / Denominator × 100%'
                            : 'Jumlah kasus dalam 1 bulan',
                        repeat: true,
                        status: 'active',
                    }),
            );
        }
    }
    for (const cycle of data.cycles.slice(0, 2)) {
        activateCycle(data, cycle.id);
        const rows = data.assessments.filter((a) => a.cycleId === cycle.id);
        for (let index = 0; index < rows.length; index++) {
            const a = rows[index],
                ku = { role: 'ku', unitId: a.unitId },
                kd = { role: 'kd', divisionId: a.divisionId };
            const scores = Object.fromEntries(
                a.snapshot.map((g, i) => [g.id, 80 + ((index + i) % 16)]),
            );
            if (cycle.id === '2026-11' && index === 3) continue;
            assessmentAction(
                data,
                a.id,
                'draft',
                {
                    scores,
                    positive:
                        'Pelayanan sesuai standar dan dokumentasi lengkap.',
                    negative:
                        index === 2
                            ? 'Lengkapi bukti evaluasi tindak lanjut.'
                            : '',
                },
                ku,
            );
            if (cycle.id === '2026-11' && index === 4) continue;
            assessmentAction(
                data,
                a.id,
                'submit',
                {
                    scores,
                    positive:
                        'Pelayanan sesuai standar dan dokumentasi lengkap.',
                },
                ku,
            );
            if (cycle.id === '2026-11' && index === 2) {
                assessmentAction(
                    data,
                    a.id,
                    'return',
                    {
                        reason: 'Lengkapi bukti audit dan periksa kembali nilai kelengkapan rekam medis.',
                    },
                    kd,
                );
                continue;
            }
            if (cycle.id === '2026-11' && index === 1) continue;
            assessmentAction(data, a.id, 'approve', {}, kd);
            if (cycle.id === '2026-10' || index === 5)
                assessmentAction(data, a.id, 'finalize', {}, { role: 'hc' });
        }
        if (cycle.id === '2026-10') cycle.status = 'closed';
    }
    data.audit = data.audit.slice(0, 30);
    return data;
}
