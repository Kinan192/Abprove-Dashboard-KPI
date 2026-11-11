import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const projectRoot = realpathSync(
    fileURLToPath(new URL('../', import.meta.url)),
);

export function projectFingerprint() {
    const root = projectRoot.replaceAll('\\', '/');
    const identity = {
        root: process.platform === 'win32' ? root.toLowerCase() : root,
        configuration: createHash('sha256')
            .update(readFileSync(new URL('../.env', import.meta.url)))
            .digest('hex'),
        host: String(process.env.DB_HOST || '127.0.0.1'),
        port: String(process.env.DB_PORT || '3306'),
        database: String(process.env.DB_DATABASE || 'laravel'),
        origin: String(process.env.APP_URL || 'http://127.0.0.1:8000'),
    };
    return createHash('sha256').update(JSON.stringify(identity)).digest('hex');
}
