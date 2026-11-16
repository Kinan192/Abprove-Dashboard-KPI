import { $, node, field } from './flow-dom';
import { toast } from './ui';

/**
 * Profile page: identity, password, photo and email preference.
 * Shared by the assessment roles (store-backed) and Admin (config-backed).
 * @param {{ api: object, profile: object, actorEmail: string, refresh: () => Promise<void> }} options
 */
export function initProfile({ api, profile, actorEmail, refresh }) {
    const profileForm = $('[data-local-form="profile"]');
    if (profileForm)
        for (const [k, v] of Object.entries(profile))
            if (field(profileForm, k)) field(profileForm, k).value = v ?? '';
    const avatar = (url) => {
        const img = node('img');
        img.src = url;
        img.alt = 'Foto profil';
        img.className = 'size-full rounded-full object-cover';
        $('[data-profile-avatar]').replaceChildren(img);
    };
    document.addEventListener('submit', async (e) => {
        const form = e.target.closest('[data-local-form]');
        if (!form) return;
        e.preventDefault();
        if (!form.reportValidity()) return;
        const v = Object.fromEntries(new FormData(form));
        return api.perform(form, async () => {
            let payload;
            if (form.dataset.localForm === 'profile')
                payload = { name: v.name, email: v.email, phone: v.phone || null };
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
            await api.request('/profile', 'POST', payload);
            if (
                form.dataset.localForm === 'password' ||
                (payload.email && payload.email !== actorEmail)
            ) {
                toast('Data keamanan akun diubah. Silakan masuk kembali.');
                location.assign('/login');
                return;
            }
            await refresh();
            toast('Profil berhasil diperbarui.');
        });
    });
    $('[data-avatar-file]')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (
            !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
            file.size > 2 * 1024 * 1024
        )
            return toast('Gunakan PNG/JPG/WebP maksimal 2 MB.', true);
        return api.perform(null, async () => {
            const fd = new FormData();
            fd.append('photo', file);
            await api.request('/profile', 'POST', fd);
            avatar(api.prefix + '/profile/photo?t=' + Date.now());
            await refresh();
            toast('Foto profil berhasil disimpan.');
        });
    });
    const check = $('[data-profile-notification]');
    if (check) check.checked = !!profile.notification;
    check?.addEventListener('change', (e) =>
        api.perform(null, async () => {
            try {
                await api.request('/profile', 'POST', {
                    email_notifications: e.target.checked,
                });
                await refresh();
                toast('Preferensi berhasil disimpan.');
            } catch (err) {
                e.target.checked = !e.target.checked;
                throw err;
            }
        }),
    );
    if (profile.hasPhoto && $('[data-profile-avatar]'))
        avatar(api.prefix + '/profile/photo');
}
