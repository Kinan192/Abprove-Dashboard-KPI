export class HttpError extends Error {
    constructor(status, body) {
        super(
            status >= 500
                ? 'Server belum dapat memproses permintaan. Perubahan belum dikonfirmasi tersimpan.'
                : body.message || 'Permintaan belum berhasil.',
        );
        this.status = status;
        this.errors = body.errors || {};
        this.code = body.code;
    }
}

const pending = new Map();
export async function request(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const headers = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers,
    };
    if (options.body && !(options.body instanceof FormData))
        headers['Content-Type'] = 'application/json';
    if (options.method && options.method !== 'GET')
        headers['X-CSRF-TOKEN'] = document.querySelector(
            'meta[name="csrf-token"]',
        ).content;
    try {
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'same-origin',
            signal: controller.signal,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            if ([401, 419].includes(response.status))
                window.dispatchEvent(new CustomEvent('session-expired'));
            throw new HttpError(response.status, body);
        }
        return body;
    } catch (error) {
        if (error instanceof HttpError) throw error;
        throw new Error(
            'Koneksi belum berhasil. Isian Anda tetap tersedia. Coba lagi dengan koneksi yang stabil.',
        );
    } finally {
        clearTimeout(timer);
    }
}
export function get(url, params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined)
            qs.set(key, value);
    });
    return request(url + (qs.size ? (url.includes('?') ? '&' : '?') + qs : ''));
}
export async function write(url, data = {}, method = 'POST') {
    const key = method + url + JSON.stringify(data);
    if (!pending.has(key)) pending.set(key, crypto.randomUUID());
    try {
        const result = await request(url, {
            method,
            body: JSON.stringify({ ...data, request_id: pending.get(key) }),
        });
        pending.delete(key);
        return result;
    } catch (error) {
        if (error.status) pending.delete(key);
        throw error;
    }
}
export const pageState = () => ({
    loading: true,
    loadError: '',
    busy: false,
    errors: {},
    formError: '',
    pagination: { total: 0, from: 0, to: 0, current_page: 1, last_page: 1 },
    async fetchPage(fn) {
        this.loading = true;
        this.loadError = '';
        try {
            await fn();
        } catch (error) {
            this.loadError = error.message;
        } finally {
            this.loading = false;
        }
    },
    fail(error) {
        this.errors = error.errors || {};
        this.formError = error.message;
    },
});
export const clone = (value) => JSON.parse(JSON.stringify(value));
export const number = (value, digits = 2) =>
    value === null || value === undefined || value === ''
        ? 'Belum tersedia'
        : new Intl.NumberFormat('id-ID', {
              minimumFractionDigits: digits,
              maximumFractionDigits: digits,
          }).format(Number(value));
export const month = (value) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
          }).format(new Date(value.slice(0, 10) + 'T00:00:00Z'))
        : 'Belum ada periode';
export const dateTime = (value) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Jakarta',
          }).format(
              new Date(
                  value.includes('T') ? value : value.replace(' ', 'T') + 'Z',
              ),
          ) + ' WIB'
        : 'Belum tersedia';
export const shortMonth = (value) =>
    new Intl.DateTimeFormat('id-ID', {
        month: 'short',
        timeZone: 'UTC',
    }).format(new Date(value.slice(0, 10) + 'T00:00:00Z'));
