import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import dotenv from 'dotenv';
import { betterAuth, APIError } from 'better-auth';
import { toNodeHandler } from 'better-auth/node';
import { createPool } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { projectFingerprint } from '../../tools/project-identity.mjs';

dotenv.config({
    path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env'),
    quiet: true,
});
const env = process.env;
const project = projectFingerprint();
if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32)
    throw new Error('BETTER_AUTH_SECRET minimal 32 karakter wajib diisi.');
const pool = createPool({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD || '',
    database: env.DB_DATABASE,
    timezone: 'Z',
    connectionLimit: 8,
});
pool.on('connection', (connection) =>
    connection.query("SET SESSION time_zone = '+00:00'"),
);
const origin = env.APP_URL || 'http://127.0.0.1:8000';
const origins = [
    origin,
    ...(env.BETTER_AUTH_TRUSTED_ORIGINS || '').split(',').filter(Boolean),
];
export const auth = betterAuth({
    appName: 'KPI Kinerja',
    baseURL: origin,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: pool,
    trustedOrigins: origins,
    emailAndPassword: {
        enabled: true,
        disableSignUp: true,
        minPasswordLength: 12,
        maxPasswordLength: 255,
        password: {
            hash: (value) => bcrypt.hash(value, 12),
            verify: ({ hash, password }) =>
                bcrypt.compare(password, hash.replace(/^\$2y\$/, '$2b$')),
        },
    },
    user: {
        modelName: 'users',
        additionalFields: {
            role_key: { type: 'string', required: true, input: false },
        },
        fields: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            emailVerified: 'email_verified',
            image: 'auth_image',
        },
    },
    account: { modelName: 'auth_accounts' },
    verification: { modelName: 'auth_verifications' },
    session: {
        modelName: 'auth_sessions',
        expiresIn: 60 * 60 * 8,
        updateAge: 60 * 5,
        cookieCache: { enabled: false },
        additionalFields: {
            context_key: { type: 'string', required: false, input: false },
        },
    },
    advanced: {
        cookiePrefix: 'kpi',
        cookies: {
            dont_remember: { name: 'kpi_dont_remember' },
            session_token: {
                name: 'kpi_session',
            },
        },
        database: { generateId: 'serial' },
        useSecureCookies: origin.startsWith('https://'),
        ipAddress: { ipAddressHeaders: ['x-kpi-client-ip'] },
    },
    rateLimit: {
        enabled: true,
        window: 60,
        max: 300,
        customRules: {
            '/get-session': false,
            '/sign-in/email': { window: 60, max: 60 },
        },
    },
    databaseHooks: {
        session: {
            create: {
                before: async (session) => {
                    const [rows] = await pool.execute(
                        `SELECT u.is_active,u.role_key,s.id,s.unit_id,s.division_id,
            un.is_active unit_active,d.is_active division_active
            FROM users u LEFT JOIN scope_assignments s ON s.user_id=u.id AND s.revoked_at IS NULL AND s.role_key=u.role_key AND s.assigned_at<=UTC_TIMESTAMP(6)
            LEFT JOIN units un ON un.id=s.unit_id LEFT JOIN divisions d ON d.id=COALESCE(s.division_id,un.division_id) WHERE u.id=?`,
                        [session.userId],
                    );
                    const row = rows[0];
                    if (
                        !row?.is_active ||
                        !row.id ||
                        (row.role_key === 'kepala_unit' &&
                            (!row.unit_active || !row.division_active)) ||
                        (row.role_key === 'kepala_divisi' &&
                            !row.division_active)
                    )
                        throw new APIError('FORBIDDEN', {
                            message:
                                'Akun tidak aktif atau belum mendapat penugasan.',
                        });
                    return {
                        data: {
                            ...session,
                            context_key: `${row.role_key}:${row.id}`,
                        },
                    };
                },
            },
        },
    },
});
const handler = toNodeHandler(auth);
const server = createServer(async (req, res) => {
    if (req.url === '/health') {
        try {
            await pool.query('SELECT id FROM auth_sessions LIMIT 0');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
                JSON.stringify({
                    service: 'better-auth',
                    project,
                    pid: process.pid,
                    ready: true,
                }),
            );
        } catch {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(
                JSON.stringify({
                    service: 'better-auth',
                    project,
                    pid: process.pid,
                    ready: false,
                }),
            );
        }
        return;
    }
    return handler(req, res);
});
server.on('error', async (error) => {
    console.error(
        error.code === 'EADDRINUSE'
            ? `Port Better Auth ${env.BETTER_AUTH_PORT || 3031} sudah digunakan. Jalankan project melalui npm run start.`
            : `Better Auth gagal dimulai. ${error.message}`,
    );
    await pool.end().catch(() => {});
    process.exit(1);
});
server.listen(Number(env.BETTER_AUTH_PORT || 3031), '127.0.0.1', () =>
    console.log('Better Auth siap pada loopback.'),
);
async function shutdown() {
    server.close();
    await pool.end();
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
