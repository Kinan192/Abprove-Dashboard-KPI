@props(['data' => 'analytics.trend'])
<div class="panel">
    <div class="panel-header"><div><h2 class="panel-title">Tren rata-rata nilai Final</h2><p class="small muted mt-1">Penilaian Final dalam cakupan akun · 12 bulan</p></div></div>
    <div class="px-5 pb-4">
        <div class="no-data-chart" x-show="!({{ $data }}).some(p => p.average !== null)">Belum ada nilai Final pada rentang ini.</div>
        <div x-show="({{ $data }}).some(p => p.average !== null)">
            <div class="chart-area">
                <div class="chart-y" aria-hidden="true"><span>100</span><span>50</span><span>0</span></div>
                <svg class="line-chart" viewBox="0 0 800 180" preserveAspectRatio="none" role="img" aria-label="Tren rata-rata nilai Final. Rincian tersedia pada tabel di bawah." x-effect="$drawTrend($el, {{ $data }})">
                    <path d="M20 20H780 M20 90H780 M20 160H780" fill="none" stroke="#E0E7E7"/><g data-series></g>
                </svg>
            </div>
            <div class="chart-labels"><template x-for="point in {{ $data }}" :key="point.month"><span x-text="$shortMonth(point.month)"></span></template></div>
        </div>
        <details class="chart-table"><summary>Lihat data tren dalam tabel</summary><div class="table-wrap"><table class="table"><thead><tr><th>Bulan</th><th class="numeric">Rata-rata</th><th class="numeric">Jumlah Final</th></tr></thead><tbody><template x-for="point in {{ $data }}" :key="point.month"><tr><td x-text="$store.ui.month(point.month)"></td><td class="numeric" x-text="point.average === null ? 'Tidak ada data' : $number(point.average)"></td><td class="numeric" x-text="point.count"></td></tr></template></tbody></table></div></details>
    </div>
</div>
