export function monthlyWeightRows(data, periodId, filter = {}) {
    const scopes = new Map();
    for (const kpi of data.kpis) {
        if (!kpi.active || kpi.periodId !== periodId) continue;
        const key = `${kpi.unitId}|${kpi.targetRole}`;
        let scope = scopes.get(key);
        if (!scope) {
            scope = { common: 0, selected: new Map() };
            scopes.set(key, scope);
        }
        const weight = Math.round(+kpi.weight * 10000);
        if (kpi.assignmentMode === 'selected') {
            for (const id of new Set(kpi.assigneeIds || []))
                scope.selected.set(id, (scope.selected.get(id) || 0) + weight);
        } else scope.common += weight;
    }
    const rows = [];
    for (const person of data.people) {
        if ((filter.unit && person.unitId !== filter.unit) ||
            (filter.role && person.type !== filter.role)) continue;
        const scope = scopes.get(`${person.unitId}|${person.type}`);
        if (!scope) continue;
        const total = (scope.common + (scope.selected.get(person.id) || 0)) / 10000;
        if (total > 0) rows.push({ person, total });
    }
    return rows;
}
