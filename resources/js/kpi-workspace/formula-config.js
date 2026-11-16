import { Formula } from './formula.js';
export const UNITS = [
    '%',
    'Rp',
    'unit',
    'kegiatan',
    'dokter',
    'tiket',
    'kasus',
    'orang',
    'transaksi',
    'dokumen',
    'kali',
    'menit',
    'jam',
    'hari',
    'poin',
    'skor',
    'rasio',
];
export function formulaErrors(k) {
    const errors = {};
    const rows = k.variables || [],
        keys = rows.map((v) => v.key);
    if (
        rows.length > 26 ||
        keys.some((key) => !/^[A-Z]$/.test(key)) ||
        new Set(keys).size !== keys.length
    )
        errors.variables = 'Variabel harus unik, dari A sampai Z.';
    if (rows.some((v) => !v.label?.trim() || v.label.length > 150))
        errors.variables =
            'Beri nama setiap variabel agar jelas untuk penilai.';
    if (rows.some((v) => !['manual', 'fixed'].includes(v.source || 'manual')))
        errors.variables =
            'Sumber variabel harus diisi penilai atau tetap dari konfigurasi.';
    if (
        rows.some(
            (v) =>
                v.source === 'fixed' &&
                (v.value === '' ||
                    v.value == null ||
                    !Number.isFinite(Number(v.value))),
        )
    )
        errors.variables = 'Angka variabel tetap harus valid.';
    if (!rows.length)
        errors.variables = 'KPI otomatis memerlukan minimal satu variabel.';
    try {
        const compiled = Formula.compile(k.formula);
        const unknown = [...compiled.vars].filter((v) => !keys.includes(v));
        if (unknown.length)
            errors.formula = `Variabel belum didefinisikan: ${unknown.join(', ')}.`;
    } catch (e) {
        errors.formula = e.message;
    }
    return errors;
}
export function expressionValue(k, input = {}) {
    const errors = formulaErrors(k);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const scope = {};
    for (const v of k.variables || []) {
        const raw =
            v.source === 'fixed'
                ? v.value
                : (input[`variable_${v.key}`] ?? input.variables?.[v.key]);
        if (raw === '' || raw == null || !Number.isFinite(Number(raw)))
            throw new Error(`Isi ${v.label || v.key} dengan angka yang valid.`);
        scope[v.key] = Number(raw);
    }
    return Formula.evaluate(k.formula, scope);
}
export function humanFormula(k) {
    const names = new Map(
        (k.variables || []).map((v) => [v.key, v.label || `Variabel ${v.key}`]),
    );
    return (k.formula || '')
        .split(/([A-Za-z_]\w*)/)
        .map((part) =>
            names.has(part.toUpperCase())
                ? `[${names.get(part.toUpperCase())}]`
                : part,
        )
        .join('');
}
export function recommendations(k) {
    const keys = (k.variables || []).map((v) => v.key),
        [a, b] = keys;
    if (!a) return [];
    if (!b)
        return [
            { id: 'direct', label: 'Angka realisasi langsung', formula: a },
            {
                id: 'round',
                label: 'Bulatkan 2 desimal',
                formula: `ROUND(${a}, 2)`,
            },
        ];
    return [
        {
            id: 'percentage',
            label: 'Persentase · realisasi / pembanding',
            formula: `${a} / ${b} * 100`,
            unit: '%',
        },
        {
            id: 'uptime',
            label: 'Uptime · total dikurangi downtime',
            formula: `(${a} - ${b}) / ${a} * 100`,
            unit: '%',
        },
        {
            id: 'average',
            label: 'Rata-rata per item',
            formula: `ROUND(${a} / ${b}, 2)`,
        },
        {
            id: 'difference',
            label: 'Selisih dua variabel',
            formula: `${a} - ${b}`,
        },
        ...(keys.length > 2
            ? [
                  {
                      id: 'sum',
                      label: 'Jumlah seluruh variabel',
                      formula: keys.join(' + '),
                  },
              ]
            : []),
    ];
}
export function diagnose(k) {
    const issues = Object.entries(formulaErrors(k)).map(([field, message]) => ({
        kind: 'error',
        message,
        field,
    }));
    if (!issues.length) {
        const used = Formula.compile(k.formula).vars;
        if (!used.size)
            issues.push({
                kind: 'warning',
                message:
                    'Formula tidak memakai variabel; hasilnya akan selalu sama.',
            });
        for (const v of k.variables || [])
            if (!used.has(v.key))
                issues.push({
                    kind: 'warning',
                    message: `Variabel ${v.key} tidak digunakan di formula.`,
                });
        if (
            k.unit === '%' &&
            k.formula.includes('/') &&
            !/\b100\b/.test(k.formula)
        )
            issues.push({
                kind: 'warning',
                message:
                    'Satuan persen tetapi formula belum mengalikan 100. Periksa apakah hasil masih berbentuk rasio.',
                fix: `(${k.formula}) * 100`,
            });
        if (k.formula.includes('/') && !/\bIF\s*\(/i.test(k.formula))
            issues.push({
                kind: 'info',
                message:
                    'Pembagi bernilai nol akan menampilkan error dan memblokir pengiriman. Gunakan IF bila memang ada aturan khusus untuk kondisi nol.',
            });
    }
    return issues.length
        ? issues
        : [
              {
                  kind: 'success',
                  message:
                      'Struktur formula valid. Uji beberapa angka dan periksa bobot sebelum menyimpan.',
              },
          ];
}
