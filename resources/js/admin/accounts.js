import { $, confirm, open, toast } from '../abprove/ui';
import { node, status, field } from '../abprove/flow-dom';
import { remoteTable } from './remote-table';
import { ROLE_LABELS, when } from './labels';

const ROLE_HINTS = {
    admin: 'Admin mengelola akun, membaca seluruh log dan mengirim pengingat email. Akses aktif setelah disimpan.',
    super_hc: 'Super HC mengelola struktur, staf, KPI dan periode. Akses aktif setelah disimpan.',
    kepala_divisi: 'Akun bisa masuk setelah Super HC menunjuknya sebagai Kepala Divisi di menu Struktur & Staf.',
    kepala_unit: 'Akun bisa masuk setelah Super HC menunjuknya sebagai Kepala Unit di menu Struktur & Staf.',
};

export function initAccounts(config) {
    const root = $('[data-admin-accounts]');
    const { api } = config;
    const form = $('#account-form');
    const resetForm = $('#password-reset-form');
    const rows = new Map();

    const table = remoteTable({
        api,
        root,
        endpoint: '/data/accounts',
        key: 'admin-accounts',
        columns: 7,
        emptyText: 'Belum ada akun yang cocok dengan filter.',
        renderRow: renderAccount,
        onLoaded: (result) => {
            $('[data-account-stats]').textContent = `${result.total} akun ditemukan.`;
        },
    });

    function renderAccount(account) {
        rows.set(String(account.id), account);
        const tr = node('tr');
        const identity = node('td');
        identity.append(node('strong', account.name, 'block'), node('span', account.login_nip || '-', 'text-xs text-muted'));
        const area = account.unit_name || account.division_name;
        const global = ['admin', 'super_hc'].includes(account.role_key);
        const access = global
            ? 'Seluruh organisasi'
            : area
              ? `${account.role_key === 'kepala_unit' ? 'Unit' : 'Divisi'} ${area}`
              : 'Belum ditugaskan';
        const stateCell = node('td');
        const badge = node('span');
        status(badge, account.is_active ? 'Aktif' : 'Belum', account.is_active ? 'Aktif' : 'Nonaktif');
        stateCell.append(badge);
        const actions = node('td', null, 'numeric');
        const wrap = node('div', null, 'admin-row-actions');
        for (const [action, label] of [
            ['edit', 'Ubah'],
            ['reset', 'Sandi'],
            ['toggle', account.is_active ? 'Nonaktifkan' : 'Aktifkan'],
            ['delete', 'Hapus'],
        ]) {
            const button = node('button', label, action === 'delete' ? 'link text-link' : 'link');
            button.type = 'button';
            button.dataset.accountAction = action;
            button.dataset.id = account.id;
            wrap.append(button);
        }
        actions.append(wrap);
        tr.append(
            identity,
            node('td', account.email || '-'),
            node('td', ROLE_LABELS[account.role_key] || account.role_key),
            node('td', access, area || global ? '' : 'text-muted'),
            node('td', account.last_login_at ? when(account.last_login_at) : 'Belum pernah'),
            stateCell,
            actions,
        );
        return tr;
    }

    function fill(account) {
        form.reset();
        $('[data-form-error]', form).hidden = true;
        field(form, 'id').value = account?.id ?? '';
        field(form, 'name').value = account?.name ?? '';
        field(form, 'login_nip').value = account?.login_nip ?? '';
        field(form, 'email').value = account?.email ?? '';
        field(form, 'role_key').value = account?.role_key ?? 'kepala_unit';
        field(form, 'is_active').checked = account ? !!account.is_active : true;
        $('[data-password-field]', form).hidden = !!account;
        field(form, 'password').required = !account;
        $('#account-form-dialog-title').textContent = account ? 'Ubah akun' : 'Tambah akun';
        hint();
        open('account-form-dialog');
    }
    const hint = () => {
        $('[data-role-hint]', form).textContent = ROLE_HINTS[field(form, 'role_key').value];
    };
    field(form, 'role_key').addEventListener('change', hint);

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const id = field(form, 'id').value;
        const payload = {
            name: field(form, 'name').value.trim(),
            login_nip: field(form, 'login_nip').value.trim(),
            email: field(form, 'email').value.trim(),
            role_key: field(form, 'role_key').value,
            is_active: field(form, 'is_active').checked,
        };
        if (!id) payload.password = field(form, 'password').value;
        api.perform(form, async () => {
            await api.request(id ? `/accounts/${id}` : '/accounts', id ? 'PATCH' : 'POST', payload);
            form.closest('dialog').close();
            toast(id ? 'Akun diperbarui.' : 'Akun dibuat.');
            await table.reload();
        });
    });

    resetForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!resetForm.reportValidity()) return;
        const id = field(resetForm, 'id').value;
        api.perform(resetForm, async () => {
            await api.request(`/accounts/${id}`, 'PATCH', { password: field(resetForm, 'password').value });
            resetForm.closest('dialog').close();
            toast('Kata sandi diatur ulang. Sesi akun tersebut diakhiri.');
        });
    });

    $('[data-account-new]').addEventListener('click', () => fill(null));
    root.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-account-action]');
        if (!button) return;
        const account = rows.get(button.dataset.id);
        const action = button.dataset.accountAction;
        if (action === 'edit') return fill(account);
        if (action === 'reset') {
            resetForm.reset();
            $('[data-form-error]', resetForm).hidden = true;
            field(resetForm, 'id').value = account.id;
            $('[data-reset-name]', resetForm).textContent = `${account.name} · ${account.email}`;
            return open('password-reset-dialog');
        }
        if (action === 'toggle') {
            const ok = await confirm(
                account.is_active
                    ? `Nonaktifkan ${account.name}? Akun tidak dapat masuk dan sesi aktifnya diakhiri.`
                    : `Aktifkan kembali ${account.name}?`,
                { label: account.is_active ? 'Nonaktifkan' : 'Aktifkan' },
            );
            if (!ok) return;
            return api.perform(null, async () => {
                await api.request(`/accounts/${account.id}`, 'PATCH', { is_active: !account.is_active });
                toast(account.is_active ? 'Akun dinonaktifkan.' : 'Akun diaktifkan.');
                await table.reload();
            });
        }
        if (action === 'delete') {
            const ok = await confirm(
                `Hapus akun ${account.name}? Penghapusan hanya untuk akun yang belum pernah dipakai; akun berhistori cukup dinonaktifkan.`,
                { label: 'Hapus akun' },
            );
            if (!ok) return;
            return api.perform(null, async () => {
                await api.request(`/accounts/${account.id}`, 'DELETE', {});
                toast('Akun dihapus.');
                await table.reload();
            });
        }
    });

    table.load();
}
