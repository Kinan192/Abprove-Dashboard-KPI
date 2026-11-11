import { spawn } from 'node:child_process';
import { once } from 'node:events';
import {
    closeSync,
    mkdirSync,
    openSync,
    readFileSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { projectFingerprint, projectRoot } from './project-identity.mjs';

const children = [];
let stopping = false;
let lockPath;
let lockFile;

function releaseLock() {
    if (lockFile === undefined) return;
    closeSync(lockFile);
    lockFile = undefined;
    try {
        if (JSON.parse(readFileSync(lockPath, 'utf8')).pid === process.pid)
            unlinkSync(lockPath);
    } catch {}
}

async function shutdown(code = 0) {
    if (stopping) return;
    stopping = true;
    const active = children.filter(
        (child) => child.exitCode === null && child.signalCode === null,
    );
    const closed = active.map((child) => once(child, 'close'));
    active.forEach((child) => child.kill());
    let deadline;
    await Promise.race([
        Promise.allSettled(closed),
        new Promise((resolve) => {
            deadline = setTimeout(resolve, 2000);
        }),
    ]);
    clearTimeout(deadline);
    active
        .filter((child) => child.exitCode === null && child.signalCode === null)
        .forEach((child) => child.kill('SIGKILL'));
    releaseLock();
    process.exitCode = code;
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
process.on('exit', releaseLock);

function acquireLock(appPort, authPort, project) {
    lockPath = path.join(
        projectRoot,
        'storage/framework/cache',
        `kpi-launcher-${appPort}-${authPort}.json`,
    );
    mkdirSync(path.dirname(lockPath), { recursive: true });
    try {
        lockFile = openSync(lockPath, 'wx');
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const owner = JSON.parse(readFileSync(lockPath, 'utf8'));
        let alive = true;
        try {
            process.kill(owner.pid, 0);
        } catch (probe) {
            alive = probe.code !== 'ESRCH';
        }
        if (alive)
            throw new Error(
                'Proses start lain masih aktif. Tunggu hingga proses tersebut selesai memulai layanan.',
            );
        unlinkSync(lockPath);
        lockFile = openSync(lockPath, 'wx');
    }
    writeFileSync(lockFile, JSON.stringify({ pid: process.pid, project }));
}

function isListening(port) {
    return new Promise((resolve) => {
        const socket = net.createConnection({ host: '127.0.0.1', port });
        const finish = (listening) => {
            socket.destroy();
            resolve(listening);
        };
        socket.once('connect', () => finish(true));
        socket.once('error', () => finish(false));
        socket.setTimeout(500, () => finish(true));
    });
}

async function inspect(service, project) {
    if (!(await isListening(service.port))) return 'free';
    let data;
    try {
        const response = await fetch(service.url, {
            signal: AbortSignal.timeout(1500),
            redirect: 'error',
        });
        data = await response.json();
    } catch {
        throw new Error(
            `Port ${service.port} sudah digunakan dan layanan ${service.name} project ini tidak dapat diverifikasi.`,
        );
    }
    if (data.service !== service.marker || data.project !== project)
        throw new Error(
            `Port ${service.port} digunakan layanan lain atau konfigurasi project yang berbeda. Hentikan layanan tersebut sebelum menjalankan project.`,
        );
    if (!data.ready)
        throw new Error(
            `${service.name} sudah aktif tetapi belum siap. Periksa koneksi database.`,
        );
    return 'ready';
}

function launch(name, command, args) {
    const child = spawn(command, args, {
        cwd: projectRoot,
        stdio: 'inherit',
        windowsHide: true,
    });
    children.push(child);
    child.on('error', (error) => {
        console.error(`${name} gagal dijalankan. ${error.message}`);
        void shutdown(1);
    });
    child.on('exit', (code, signal) => {
        if (stopping) return;
        console.error(
            `${name} berhenti sebelum launcher dihentikan (${signal || code}).`,
        );
        void shutdown(code || 1);
    });
    return child;
}

async function waitReady(service, child, project) {
    for (let attempt = 0; attempt < 50; attempt++) {
        if (stopping) throw new Error('Startup dibatalkan.');
        if (child.exitCode !== null || child.signalCode !== null)
            throw new Error(`${service.name} berhenti saat startup.`);
        try {
            const response = await fetch(service.url, {
                signal: AbortSignal.timeout(1000),
            });
            const data = await response.json();
            if (
                data.service === service.marker &&
                data.project === project &&
                data.ready &&
                data.pid === child.pid
            )
                return;
        } catch {}
        await delay(200);
    }
    throw new Error(
        `${service.name} belum siap setelah startup. Periksa pesan layanan di atas.`,
    );
}

async function start() {
    process.loadEnvFile(path.join(projectRoot, '.env'));
    const appPort = Number(process.env.PORT || 8000);
    const authPort = Number(process.env.BETTER_AUTH_PORT || 3031);
    if (
        ![appPort, authPort].every(
            (port) => Number.isInteger(port) && port > 0 && port <= 65535,
        ) ||
        appPort === authPort
    )
        throw new Error(
            'PORT dan BETTER_AUTH_PORT harus berisi dua port berbeda antara 1 dan 65535.',
        );
    const project = projectFingerprint();
    const auth = {
        name: 'Better Auth',
        port: authPort,
        marker: 'better-auth',
        url: `http://127.0.0.1:${authPort}/health`,
    };
    const app = {
        name: 'Laravel',
        port: appPort,
        marker: 'kpi-kinerja',
        url: `http://127.0.0.1:${appPort}/_kpi/health`,
    };
    const [authState, appState] = await Promise.all([
        inspect(auth, project),
        inspect(app, project),
    ]);
    if (authState === 'ready' && appState === 'ready') {
        console.log(
            `Project sudah berjalan di http://127.0.0.1:${appPort}/login`,
        );
        return;
    }
    acquireLock(appPort, authPort, project);
    if (authState === 'free') {
        const child = launch('Better Auth', process.execPath, [
            'services/auth/server.mjs',
        ]);
        await waitReady(auth, child, project);
    } else console.log('Menggunakan Better Auth project yang sudah aktif.');
    if (appState === 'free') {
        const child = launch('Laravel', 'php', [
            '-S',
            `127.0.0.1:${appPort}`,
            '-t',
            'public',
            'server.php',
        ]);
        await waitReady(app, child, project);
    } else console.log('Menggunakan server Laravel project yang sudah aktif.');
    console.log(
        `Project siap di http://127.0.0.1:${appPort}/login. Tekan Ctrl+C untuk menghentikan layanan yang dimulai launcher ini.`,
    );
}

start().catch(async (error) => {
    if (!stopping) console.error(error.message);
    await shutdown(1);
});
