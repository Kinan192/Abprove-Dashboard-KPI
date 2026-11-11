import {
    $,
    $$,
    node,
    text,
    labelCycle,
    dateTime,
    field,
    error,
} from './flow-dom';
import { toast } from './ui';
import { paginate } from './pagination';
export function initFlowRuntime(c, s) {
    const link = (page, extra = {}) => {
        const base = c.links[page];
        if (!base) return '#';
        const url = new URL(base, location.origin);
        url.searchParams.delete('month');
        url.searchParams.set('cycle', s.cycleKey);
        const account = new URLSearchParams(location.search).get('account');
        if (c.review && account) url.searchParams.set('account', account);
        for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
        return url.href;
    };
    $$('a[href]').forEach((a) => {
        const match = Object.entries(c.links).find(
            ([, href]) => new URL(href).pathname === new URL(a.href).pathname,
        );
        if (match) a.href = link(match[0]);
    });
    function render() {
        if (!s.actor) return;
        const profile = s.data.profiles[s.actor.id];
        const name = profile?.name || (!c.review ? c.actor.nama : s.actor.name);
        $$('[data-profile-name],[data-actor-name]').forEach(
            (e) => (e.textContent = name),
        );
        const areas =
            c.role === 'hc'
                ? 'Seluruh organisasi'
                : c.role === 'ku'
                  ? s
                        .scopedUnits()
                        .map((u) => u.name)
                        .join(', ')
                  : s.data.divisions
                        .filter((d) => d.headId === s.actor.id)
                        .map((d) => d.name)
                        .join(', ');
        text(
            document,
            '.top-scope',
            areas || 'Akun belum ditugaskan pada area',
        );
        const letters = name
            .replace(/^(dr\.|apt\.|ns\.)\s*/i, '')
            .split(/[ ,]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((x) => x[0])
            .join('');
        const avatar = $('header [data-dialog-open="account-dialog"] .avatar');
        if (avatar) avatar.textContent = letters;
        const profileAvatar = $('[data-profile-avatar]');
        if (profileAvatar && !profileAvatar.querySelector('img'))
            profileAvatar.textContent = letters;
        const scopeField = $('[data-local-form="profile"] input[readonly]');
        if (scopeField) scopeField.value = areas || 'Belum ditugaskan';
        const scopeCopy = $('[data-profile-name] + p');
        if (scopeCopy) scopeCopy.textContent = areas || 'Belum ditugaskan';
        $$('[data-month-label]').forEach(
            (e) => (e.textContent = labelCycle(s.cycleKey)),
        );
        text(
            document,
            '[data-month-short]',
            labelCycle(s.cycleKey).slice(0, 3),
        );
        const options = $('[data-cycle-options]');
        options.replaceChildren();
        for (const cycle of [...s.data.cycles].sort((a, b) =>
            b.id.localeCompare(a.id),
        )) {
            const a = node(
                'a',
                `${labelCycle(cycle.id)} · ${{ open: 'Terbuka', closed: 'Ditutup', planned: 'Direncanakan' }[cycle.status]}`,
                'menu-item text-xs',
            );
            const url = new URL(location.href);
            url.searchParams.set('cycle', cycle.id);
            url.searchParams.delete('month');
            a.href = url.href;
            options.append(a);
        }
        paginate(options, 'period-menu', { size: 6 });
        const x = s.cycle();
        text(
            document,
            '[data-cycle-notice]',
            x
                ? `${labelCycle(x.id)} · ${{ open: 'Terbuka', closed: 'Ditutup', planned: 'Direncanakan' }[x.status]}. ${s.canWrite() || 'Pengisian sesuai jadwal WIB.'}`
                : 'Periode belum dibuat oleh Super HC.',
        );
        const deadlines = $('[data-deadlines]');
        if (deadlines) {
            deadlines.replaceChildren();
            if (x)
                for (const [label, value] of [
                    ['Mulai', x.opens],
                    ['Batas KU', x.submission],
                    ['Batas KD', x.approval],
                    ['Tutup', x.closes],
                ]) {
                    const item = node('div');
                    item.append(
                        node('dt', label, 'text-muted text-xs'),
                        node('dd', dateTime(value) + ' WIB', 'mt-1'),
                    );
                    deadlines.append(item);
                }
        }
        const results = $('[data-search-results]'),
            q = $('[data-flow-search]')?.value.toLowerCase() || '';
        if (results) {
            results.replaceChildren();
            for (const [page, href] of Object.entries(c.links)) {
                if (!page.toLowerCase().includes(q)) continue;
                const a = node(
                    'a',
                    page.replace(/-/g, ' '),
                    'menu-item capitalize',
                );
                a.href = link(page);
                results.append(a);
            }
            for (const p of s.people()) {
                if (!`${p.name} ${p.nip}`.toLowerCase().includes(q)) continue;
                const a = node('a', `${p.name} · ${p.unitName}`, 'menu-item');
                a.href = link(
                    c.role === 'ku'
                        ? 'nilai'
                        : c.role === 'kd' && p.type === 'unit_head'
                          ? 'nilai-kepala'
                          : c.role === 'kd'
                            ? 'persetujuan'
                            : 'rekap',
                    { person: p.id },
                );
                results.append(a);
            }
            if (!results.childElementCount)
                results.append(
                    node('p', 'Tidak ada hasil pencarian.', 'empty'),
                );
            paginate(results, 'search', { token: q, size: 5 });
        }
    }
    $('[data-flow-search]')?.addEventListener('input', render);
    document.addEventListener('flow-updated', render);
    const profileForm = $('[data-local-form="profile"]');
    if (profileForm) {
        const profile = s.data.profiles[s.actor.id] || {
            name: s.actor.name,
            email: s.actor.email,
        };
        for (const [k, v] of Object.entries(profile))
            if (field(profileForm, k)) field(profileForm, k).value = v;
    }
    document.addEventListener('submit', async (e) => {
        const form = e.target.closest('[data-local-form]');
        if (!form) return;
        e.preventDefault();
        if (!form.reportValidity()) return;
        const v = Object.fromEntries(new FormData(form));
        if (s.live)
            return s.api.perform(form, async () => {
                let payload;
                if (form.dataset.localForm === 'profile')
                    payload = {
                        name: v.name,
                        email: v.email,
                        phone: v.phone || null,
                    };
                if (form.dataset.localForm === 'password') {
                    if (v.new_password !== v.confirmation)
                        throw new Error('Konfirmasi kata sandi belum sama.');
                    payload = {
                        current_password: v.current_password,
                        password: v.new_password,
                        password_confirmation: v.confirmation,
                    };
                }
                if (!payload) return;
                await s.api.request('/profile', 'POST', payload);
                if (
                    form.dataset.localForm === 'password' ||
                    (payload.email && payload.email !== s.actor.email)
                ) {
                    toast('Data keamanan akun diubah. Silakan masuk kembali.');
                    location.assign('/login');
                    return;
                }
                await s.refresh();
                toast('Profil berhasil diperbarui.');
            });
        if (form.dataset.localForm === 'profile') {
            s.data.profiles[s.actor.id] = {
                name: v.name,
                email: v.email,
                phone: v.phone,
            };
            s.save('Ubah profil lokal', v.name);
            toast('Profil diperbarui pada simulasi.');
        }
        if (form.dataset.localForm === 'password') {
            if (v.new_password !== v.confirmation)
                return error(form, 'Konfirmasi kata sandi belum sama.');
            form.reset();
            toast('Validasi sesuai. Kata sandi tidak diubah pada server.');
        }
    });
    $('[data-avatar-file]')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (
            !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
            file.size > 2 * 1024 * 1024
        )
            return toast('Gunakan PNG/JPG/WebP maksimal 2 MB.', true);
        if (s.live)
            return s.api.perform(null, async () => {
                const fd = new FormData();
                fd.append('photo', file);
                await s.api.request('/profile', 'POST', fd);
                const img = node('img');
                img.src = s.api.prefix + '/profile/photo?t=' + Date.now();
                img.alt = 'Foto profil';
                img.className = 'size-full rounded-full object-cover';
                $('[data-profile-avatar]').replaceChildren(img);
                await s.refresh();
                toast('Foto profil berhasil disimpan.');
            });
        const img = node('img');
        img.src = URL.createObjectURL(file);
        img.alt = 'Pratinjau foto profil';
        img.className = 'size-full rounded-full object-cover';
        img.onload = () => URL.revokeObjectURL(img.src);
        $('[data-profile-avatar]').replaceChildren(img);
    });
    $('[data-profile-notification]')?.addEventListener('change', (e) => {
        if (s.live)
            return s.api.perform(null, async () => {
                try {
                    await s.api.request('/profile', 'POST', {
                        email_notifications: e.target.checked,
                    });
                    await s.refresh();
                    toast('Preferensi berhasil disimpan.');
                } catch (err) {
                    e.target.checked = !e.target.checked;
                    throw err;
                }
            });
        s.data.profiles[s.actor.id] ||= {};
        s.data.profiles[s.actor.id].notification = e.target.checked;
        s.save('Preferensi notifikasi', 'Disimpan lokal');
    });
    if (s.live) {
        const profile = s.data.profiles[s.actor.id];
        const check = $('[data-profile-notification]');
        if (check) check.checked = !!profile?.notification;
        if (profile?.hasPhoto && $('[data-profile-avatar]')) {
            const img = node('img');
            img.src = s.api.prefix + '/profile/photo';
            img.alt = 'Foto profil';
            img.className = 'size-full rounded-full object-cover';
            $('[data-profile-avatar]').replaceChildren(img);
        }
    }
    render();
    return link;
}
