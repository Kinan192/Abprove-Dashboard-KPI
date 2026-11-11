import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../frontend/abprove-preview',
);
const port = Number(process.env.ABPROVE_PREVIEW_PORT || 4174);
const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8',
};
const server = http.createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405);
        res.end();
        return;
    }
    let pathname;
    try {
        pathname = decodeURIComponent(
            new URL(req.url, 'http://127.0.0.1').pathname,
        );
    } catch {
        res.writeHead(400);
        res.end();
        return;
    }
    const target = path.resolve(
        root,
        '.' + (pathname === '/' ? '/audit.html' : pathname),
    );
    if (
        !target.startsWith(root + path.sep) ||
        !fs.existsSync(target) ||
        !fs.statSync(target).isFile()
    ) {
        res.writeHead(404);
        res.end('Halaman tidak ditemukan.');
        return;
    }
    res.writeHead(200, {
        'Content-Type':
            types[path.extname(target)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
    });
    if (req.method === 'HEAD') res.end();
    else fs.createReadStream(target).pipe(res);
});
server.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () =>
    console.log(
        `Preview desain ABprove: http://127.0.0.1:${port}/\nHentikan dengan Ctrl+C. Tidak terhubung ke backend.`,
    ),
);
