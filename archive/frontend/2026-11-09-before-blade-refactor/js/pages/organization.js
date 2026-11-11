import { get, write, pageState, clone } from '../lib/api';
import { loadLookups } from '../lib/ui';

export const resourceLabels = {
    users: 'pengguna',
    employees: 'karyawan',
    positions: 'jabatan',
    divisions: 'divisi',
    units: 'unit',
};
export const blankRecord = (resource) =>
    resource === 'users'
        ? {
              name: '',
              email: '',
              login_nip: '',
              password: '',
              roles: [],
              is_active: true,
          }
        : resource === 'employees'
          ? {
                nip: '',
                full_name: '',
                position_id: '',
                user_id: null,
                is_active: true,
            }
          : {
                code: '',
                name: '',
                is_active: true,
                ...(resource === 'units' ? { division_id: '' } : {}),
            };
export function resourceFields(resource) {
    return (
        {
            users: [
                ['name', 'Nama pengguna', 'text', true],
                ['email', 'Email', 'email', false],
                ['login_nip', 'NIP login', 'text', false],
                ['password', 'Kata sandi', 'password', false],
            ],
            employees: [
                ['nip', 'NIP', 'text', true],
                ['full_name', 'Nama lengkap', 'text', true],
            ],
            positions: [
                ['code', 'Kode jabatan', 'text', true],
                ['name', 'Nama jabatan', 'text', true],
            ],
            divisions: [
                ['code', 'Kode divisi', 'text', true],
                ['name', 'Nama divisi', 'text', true],
            ],
            units: [
                ['code', 'Kode unit', 'text', true],
                ['name', 'Nama unit', 'text', true],
            ],
        }[resource] || []
    );
}
export function recordPayload(resource, form) {
    const keys = {
        users: ['name', 'email', 'login_nip', 'password', 'is_active', 'roles'],
        employees: ['nip', 'full_name', 'position_id', 'user_id', 'is_active'],
        units: ['code', 'name', 'division_id', 'is_active'],
        divisions: ['code', 'name', 'is_active'],
        positions: ['code', 'name', 'is_active'],
    }[resource];
    const data = Object.fromEntries(keys.map((k) => [k, form[k]]));
    if (resource === 'users' && !data.password) delete data.password;
    if (data.email === '') data.email = null;
    if (data.login_nip === '') data.login_nip = null;
    if (resource === 'employees') {
        data.position_id = Number(data.position_id);
        data.user_id = data.user_id ? Number(data.user_id) : null;
    }
    if (resource === 'units') data.division_id = Number(data.division_id);
    return data;
}

export function recordsPage() {
    return {
        ...pageState(),
        rows: [],
        search: '',
        auditType: '',
        lookups: {
            users: [],
            employees: [],
            units: [],
            divisions: [],
            positions: [],
            assignments: [],
        },
        form: {},
        editingId: null,
        existingRoles: [],
        auditRow: null,
        get ui() {
            return this.$store.ui;
        },
        get resource() {
            return this.ui.page;
        },
        get noun() {
            return resourceLabels[this.resource] || 'aktivitas';
        },
        get fields() {
            return resourceFields(this.resource);
        },
        async init() {
            await this.load();
        },
        async load(page = 1) {
            await this.fetchPage(async () => {
                const [response, lookups] = await Promise.all([
                    get(
                        this.resource === 'audit'
                            ? '/hc/audit'
                            : '/hc/organization/' + this.resource,
                        {
                            search: this.search,
                            subject_type: this.auditType,
                            page,
                        },
                    ),
                    loadLookups(this.ui),
                ]);
                this.rows = response.data;
                this.pagination = response;
                this.lookups = lookups;
            });
        },
        userRoles(id) {
            return this.lookups.users.find((u) => u.id === id)?.roles || [];
        },
        positionName(id) {
            return (
                this.lookups.positions.find((p) => p.id === id)?.name ||
                'Belum dipilih'
            );
        },
        placement(id) {
            return this.lookups.employees.find((e) => e.id === id);
        },
        assignmentNames(id) {
            return (
                this.lookups.assignments
                    .filter((s) => s.user_id === id)
                    .map((s) =>
                        s.role_key === 'super_hc'
                            ? 'Seluruh organisasi'
                            : s.unit_id
                              ? this.lookups.units.find(
                                    (u) => u.id === s.unit_id,
                                )?.name
                              : this.lookups.divisions.find(
                                    (d) => d.id === s.division_id,
                                )?.name,
                    )
                    .filter(Boolean)
                    .join(', ') || 'Belum ditugaskan'
            );
        },
        async edit(row = null) {
            this.errors = {};
            this.formError = '';
            this.editingId = row?.id || null;
            this.form = row
                ? clone(
                      (
                          await get(
                              '/hc/organization/' +
                                  this.resource +
                                  '/' +
                                  row.id,
                          )
                      ).data,
                  )
                : blankRecord(this.resource);
            this.form.is_active = !!this.form.is_active;
            this.form.password = '';
            this.existingRoles = [...(this.form.roles || [])];
            this.$refs.editor.showModal();
        },
        async save() {
            this.busy = true;
            this.errors = {};
            this.formError = '';
            try {
                const data = recordPayload(this.resource, this.form);
                if (
                    this.resource === 'users' &&
                    !this.editingId &&
                    !data.password
                )
                    throw new Error('Kata sandi wajib diisi untuk akun baru.');
                await write(
                    '/hc/organization/' +
                        this.resource +
                        (this.editingId ? '/' + this.editingId : ''),
                    data,
                    this.editingId ? 'PATCH' : 'POST',
                );
                this.$refs.editor.close();
                await this.load();
                this.ui.toast('Data ' + this.noun + ' berhasil disimpan.');
            } catch (error) {
                this.fail(error);
            } finally {
                this.busy = false;
            }
        },
        showAudit(row) {
            this.auditRow = row;
            this.$refs.audit.showModal();
        },
        actor(id) {
            return (
                this.lookups.users.find((u) => u.id === id)?.name || 'Pengelola'
            );
        },
        grantHc(row) {
            this.ui.ask({
                title: 'Berikan akses Super HC?',
                message:
                    row.name +
                    ' akan dapat mengelola seluruh organisasi. Akun harus memiliki kelayakan Super HC dan belum memiliki penugasan.',
                label: 'Berikan akses HC',
                reasonRequired: true,
                run: async (reason) => {
                    await write('/hc/users/' + row.id + '/grant-hc', {
                        reason,
                    });
                    await this.load();
                    this.ui.toast('Akses Super HC diberikan.');
                },
            });
        },
        revokeUser(row) {
            const assignment = this.lookups.assignments.find(
                (s) => s.user_id === row.id,
            );
            if (!assignment) return;
            this.ui.ask({
                title: 'Cabut penugasan aktif?',
                message:
                    row.name +
                    ' akan kehilangan akses pada area yang ditugaskan. Penilaian aktif dapat memblokir perubahan ini.',
                label: 'Cabut penugasan',
                reasonRequired: true,
                run: async (reason) => {
                    await write(
                        '/hc/assignments/' + assignment.id + '/revoke',
                        { reason },
                    );
                    await this.load();
                    this.ui.toast('Penugasan berhasil dicabut.');
                },
            });
        },
        transfer(row) {
            location.href = '/hc/organization?employee=' + row.id;
        },
    };
}

export function organizationPage() {
    return {
        ...pageState(),
        lookups: {
            divisions: [],
            units: [],
            allUnits: [],
            employees: [],
            users: [],
            assignments: [],
            positions: [],
        },
        divisionId: null,
        unitId: null,
        search: '',
        form: {},
        resource: 'divisions',
        editingId: null,
        preview: null,
        operation: '',
        operationForm: {},
        operationError: '',
        operationBusy: false,
        get ui() {
            return this.$store.ui;
        },
        get noun() {
            return resourceLabels[this.resource] || '';
        },
        get fields() {
            return resourceFields(this.resource);
        },
        get division() {
            return this.lookups.divisions.find(
                (d) => d.id === Number(this.divisionId),
            );
        },
        get unit() {
            return this.lookups.allUnits.find(
                (u) => u.id === Number(this.unitId),
            );
        },
        get units() {
            return this.lookups.allUnits
                .filter((u) => u.division_id === Number(this.divisionId))
                .map((u) => ({
                    ...u,
                    name: u.name + (u.is_active ? '' : ' (Nonaktif)'),
                    head_name: this.lookups.units.find((a) => a.id === u.id)
                        ?.head_name,
                    employee_count: this.lookups.employees.filter(
                        (e) => e.unit_id === u.id && e.is_active,
                    ).length,
                }));
        },
        get employees() {
            return this.lookups.employees.filter(
                (e) =>
                    e.unit_id === Number(this.unitId) &&
                    (!this.search ||
                        (e.full_name + ' ' + e.nip)
                            .toLowerCase()
                            .includes(this.search.toLowerCase())),
            );
        },
        get unitHead() {
            return this.lookups.units.find((u) => u.id === Number(this.unitId));
        },
        get eligibleHeads() {
            const role =
                this.operation === 'head-unit'
                    ? 'kepala_unit'
                    : 'kepala_divisi';
            return this.lookups.users.filter(
                (u) =>
                    u.is_active &&
                    u.roles.includes(role) &&
                    !this.lookups.assignments.some((a) => a.user_id === u.id) &&
                    (role !== 'kepala_unit' ||
                        this.lookups.employees.some(
                            (e) =>
                                e.user_id === u.id &&
                                e.is_active &&
                                e.unit_id === Number(this.unitId),
                        )),
            );
        },
        get availableEmployees() {
            return this.lookups.employees.filter(
                (e) => e.is_active && e.unit_id !== Number(this.unitId),
            );
        },
        get targetUnit() {
            return this.lookups.units.find(
                (u) => u.id === Number(this.operationForm.unit_id),
            );
        },
        get movingEmployee() {
            return this.lookups.employees.find(
                (e) => e.id === Number(this.operationForm.employee_id),
            );
        },
        async init() {
            const params = new URLSearchParams(location.search);
            this.divisionId = Number(params.get('division')) || null;
            this.unitId = Number(params.get('unit')) || null;
            await this.load();
            if (params.get('employee')) {
                const employee = this.lookups.employees.find(
                    (e) => e.id === Number(params.get('employee')),
                );
                if (employee) await this.openPlacement(employee);
            }
        },
        async load() {
            await this.fetchPage(async () => {
                this.lookups = await loadLookups(this.ui);
                if (!this.divisionId || !this.division)
                    this.divisionId = this.lookups.divisions[0]?.id || null;
            });
        },
        selectDivision(id) {
            this.divisionId = id;
            this.unitId = null;
            this.search = '';
        },
        async edit(resource, row = null) {
            this.resource = resource;
            this.editingId = row?.id || null;
            this.form = row ? clone(row) : blankRecord(resource);
            if (resource === 'units' && !row)
                this.form.division_id = this.divisionId;
            this.form.is_active = !!this.form.is_active;
            this.errors = {};
            this.formError = '';
            this.$refs.editor.showModal();
        },
        async save() {
            this.busy = true;
            this.formError = '';
            this.errors = {};
            try {
                const response = await write(
                    '/hc/organization/' +
                        this.resource +
                        (this.editingId ? '/' + this.editingId : ''),
                    recordPayload(this.resource, this.form),
                    this.editingId ? 'PATCH' : 'POST',
                );
                this.$refs.editor.close();
                if (this.resource === 'divisions')
                    this.divisionId = response.data.id;
                if (this.resource === 'units') this.unitId = response.data.id;
                await this.load();
                this.ui.toast('Data ' + this.noun + ' berhasil disimpan.');
            } catch (error) {
                this.fail(error);
            } finally {
                this.busy = false;
            }
        },
        async openHead(area) {
            this.operation = area === 'units' ? 'head-unit' : 'head-division';
            this.operationForm = { user_id: '', reason: '' };
            this.operationError = '';
            this.preview = (
                await get(
                    '/hc/' +
                        area +
                        '/' +
                        (area === 'units' ? this.unitId : this.divisionId) +
                        '/head-preview',
                )
            ).data;
            this.$refs.operation.showModal();
        },
        async openPlacement(employee = null) {
            this.operation = 'placement';
            this.operationForm = {
                employee_id: employee?.id || '',
                unit_id: this.unitId || '',
                reason: '',
            };
            this.preview = employee
                ? (
                      await get(
                          '/hc/employees/' + employee.id + '/placement-preview',
                      )
                  ).data
                : null;
            this.operationError = '';
            this.$refs.operation.showModal();
        },
        async previewPlacement() {
            this.preview = null;
            try {
                if (this.operationForm.employee_id)
                    this.preview = (
                        await get(
                            '/hc/employees/' +
                                this.operationForm.employee_id +
                                '/placement-preview',
                        )
                    ).data;
            } catch (error) {
                this.operationError = error.message;
            }
        },
        saveOperation() {
            if (!this.preview) return;
            const placement = this.operation === 'placement';
            this.ui.ask({
                title: placement
                    ? 'Konfirmasi penempatan karyawan'
                    : 'Konfirmasi penetapan kepala',
                message: placement
                    ? `${this.movingEmployee?.full_name} akan ditempatkan pada ${this.targetUnit?.name}. Histori penilaian tetap pada konteks asal.`
                    : 'Penugasan kepala sebelumnya akan dicabut dan diganti secara bersamaan. Kepala baru tidak otomatis memperoleh histori kepala lama.',
                label: placement ? 'Simpan penempatan' : 'Tetapkan kepala',
                run: async () => {
                    const data = {
                        reason: this.operationForm.reason,
                        confirmed: true,
                    };
                    if (placement) {
                        data.unit_id = Number(this.operationForm.unit_id);
                        data.expected_placement_id =
                            this.preview.current_placement?.id || null;
                        await write(
                            '/hc/employees/' +
                                this.operationForm.employee_id +
                                '/placement',
                            data,
                        );
                    } else {
                        data.user_id = Number(this.operationForm.user_id);
                        data.expected_assignment_id =
                            this.preview.current_assignment?.id || null;
                        const area =
                            this.operation === 'head-unit'
                                ? 'units'
                                : 'divisions';
                        await write(
                            '/hc/' +
                                area +
                                '/' +
                                (area === 'units'
                                    ? this.unitId
                                    : this.divisionId) +
                                '/head',
                            data,
                        );
                    }
                    this.$refs.operation.close();
                    await this.load();
                    this.ui.toast(
                        placement
                            ? 'Penempatan berhasil disimpan.'
                            : 'Kepala berhasil ditetapkan.',
                    );
                },
            });
        },
        async safeHead(area) {
            try {
                await this.openHead(area);
            } catch (error) {
                this.ui.toast(error.message, true);
            }
        },
        async safePlacement(employee) {
            try {
                await this.openPlacement(employee);
            } catch (error) {
                this.ui.toast(error.message, true);
            }
        },
    };
}
