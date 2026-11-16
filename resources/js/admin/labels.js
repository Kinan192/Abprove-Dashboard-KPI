import { dateTime } from '../abprove/flow-dom';

export const ROLE_LABELS = {
    admin: 'Admin',
    super_hc: 'Super HC',
    kepala_divisi: 'Kepala Divisi',
    kepala_unit: 'Kepala Unit',
};

/** Formats a UTC database timestamp ("Y-m-d H:i:s.u") in WIB. */
export const when = (value) => (value ? dateTime(String(value).slice(0, 19).replace(' ', 'T') + 'Z') : '-');

export const monthLabel = (value) =>
    new Date(`${String(value).slice(0, 7)}-01T12:00:00+07:00`).toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
    });
