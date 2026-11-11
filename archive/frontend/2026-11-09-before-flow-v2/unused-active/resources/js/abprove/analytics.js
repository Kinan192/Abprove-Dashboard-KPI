import { $, $$, number } from './ui';
export function initAnalytics(c, s) {
    function render() {
        const filters = Object.fromEntries(
            $$('[data-analytics-filter]').map((e) => [
                e.dataset.analyticsFilter,
                e.value,
            ]),
        );
        const people = c.people.filter(
            (p) =>
                (!filters.unit || p.unit === filters.unit) &&
                (!filters.template || p.tpl === filters.template),
        );
        const averages = Array.from({ length: 12 }, (_, month) => {
            const values = people
                .map((p) => s.total(p.id, month))
                .filter((v) => v != null);
            return values.length
                ? values.reduce((n, v) => n + v, 0) / values.length
                : null;
        });
        $$('[data-trend]').forEach((svg) => {
            const group = $('[data-chart-series]', svg);
            group.replaceChildren();
            let segment = [];
            function appendSegment() {
                if (!segment.length) return;
                const line = document.createElementNS(
                    'http://www.w3.org/2000/svg',
                    'polyline',
                );
                line.setAttribute('fill', 'none');
                line.setAttribute('stroke', 'var(--color-primary)');
                line.setAttribute('stroke-width', '2.5');
                line.setAttribute('points', segment.join(' '));
                line.setAttribute('vector-effect', 'non-scaling-stroke');
                group.append(line);
                segment = [];
            }
            averages.forEach((value, i) => {
                if (value == null) {
                    appendSegment();
                    return;
                }
                const x = 10 + (i * 780) / 11,
                    y = 165 - value * 1.5;
                segment.push(`${x},${y}`);
                const circle = document.createElementNS(
                    'http://www.w3.org/2000/svg',
                    'circle',
                );
                circle.setAttribute('cx', x);
                circle.setAttribute('cy', y);
                circle.setAttribute('r', 3);
                circle.setAttribute('fill', 'var(--color-primary)');
                const title = document.createElementNS(
                    'http://www.w3.org/2000/svg',
                    'title',
                );
                title.textContent = `${c.fixture.months[i]}: ${number(value)}`;
                circle.append(title);
                group.append(circle);
            });
            appendSegment();
            svg.setAttribute('role', 'img');
            svg.setAttribute(
                'aria-label',
                `Tren nilai contoh ${c.fixture.year}. Rata-rata bulan ini ${number(averages[c.month])}.`,
            );
        });
        $$('[data-analytics-row]').forEach((row) => {
            const id = row.dataset.person;
            row.hidden = !people.some((p) => p.id === id);
            const vals = [];
            $$('[data-history-person]', row).forEach((button) => {
                const value = s.total(id, +button.dataset.historyMonth);
                button.textContent =
                    value == null
                        ? '-'
                        : Number(value.toFixed(1)).toLocaleString('id-ID');
                button.className = `heat-cell ${value >= 90 ? 'heat-high' : value >= 80 ? 'heat-mid' : 'heat-low'}`;
                button.setAttribute(
                    'aria-label',
                    `Nilai ${c.fixture.months[+button.dataset.historyMonth]}: ${number(value)}`,
                );
                if (value != null) vals.push(value);
            });
            $('[data-average]', row).textContent = vals.length
                ? number(vals.reduce((n, v) => n + v, 0) / vals.length)
                : '-';
        });
        const previous = averages[c.month - 1],
            current = averages[c.month];
        const values = {
            average: number(current),
            total: people.length,
            excellent: people.filter((p) => s.total(p.id) >= +s.state.set.sb)
                .length,
            change:
                current != null && previous
                    ? `${number(((current - previous) / previous) * 100)}%`
                    : '-',
        };
        $$('[data-analytics-count]').forEach(
            (e) => (e.textContent = values[e.dataset.analyticsCount]),
        );
        $$('[data-count="average"]').forEach(
            (e) => (e.textContent = values.average),
        );
    }
    $$('[data-analytics-filter]').forEach((e) =>
        e.addEventListener('change', render),
    );
    document.addEventListener('assessment-updated', render);
    render();
}
