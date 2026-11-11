import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { contrastReport } from './contrast.mjs';

const out = 'docs/frontend/approved-layout/qa';
let ownedServer;
process.on('exit', () => ownedServer?.kill());
try {
    await fetch('http://127.0.0.1:8008/design-review');
} catch {
    ownedServer = spawn(
        'php',
        ['-S', '127.0.0.1:8008', '-t', 'public', 'tools/testing/server.php'],
        { windowsHide: true, stdio: 'ignore' },
    );
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        try {
            if ((await fetch('http://127.0.0.1:8008/design-review')).ok) {
                ready = true;
                break;
            }
        } catch {}
    }
    if (!ready)
        throw new Error('Laravel audit server did not start on port 8008.');
}
fs.mkdirSync(out + '/contrast', { recursive: true });
fs.mkdirSync(out + '/screenshots', { recursive: true });
const walk = (dir) =>
    fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((e) =>
            e.isDirectory()
                ? walk(path.join(dir, e.name))
                : [path.join(dir, e.name)],
        );
const files = [
    ...walk('resources/views'),
    ...walk('resources/js'),
    ...walk('resources/css'),
];
const alpine = files.filter((p) =>
    /\bx-(?:data|show|model|init|on|bind|text|html|cloak)\b|\bAlpine\b|alpinejs/.test(
        fs.readFileSync(p, 'utf8'),
    ),
);
const packageLock = fs.readFileSync('package-lock.json', 'utf8');
const syntax = walk('resources/js')
    .filter((p) => p.endsWith('.js'))
    .filter((p) => spawnSync(process.execPath, ['--check', p]).status !== 0);
const hash = (file) =>
    crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const screens = JSON.parse(
    fs.readFileSync('resources/data/abprove-screens.json', 'utf8'),
);
const original = JSON.parse(
    fs.readFileSync(
        'docs/frontend/abprove-review/source-manifest.json',
        'utf8',
    ),
);
const references = screens.map((s) => ({
    path: s.reference,
    sha256: hash('public/design-reference/' + s.reference),
    sourceMatches:
        hash('public/design-reference/' + s.reference) ===
        original.references.find((r) => r.path === s.reference).sha256,
}));
const protectedBusiness = Object.entries(
    JSON.parse(fs.readFileSync('docs/backend/v2/source-manifest.json', 'utf8'))
        .protectedExistingFiles,
).filter(([file]) => /^(app\/|routes\/|database\/)/.test(file));
const changedBusiness = protectedBusiness
    .filter(([file, value]) => !fs.existsSync(file) || hash(file) !== value)
    .map(([file]) => file);
const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [],
    samples = [];
page.on('pageerror', (e) => errors.push(e.message));
for (const screen of screens) {
    await page.goto(
        `http://127.0.0.1:8008/design-review/${screen.role}/${screen.view}${screen.state ? `?state=${screen.state}` : ''}`,
    );
    await page.waitForFunction(
        () => document.documentElement.dataset.frontendReady === 'true',
    );
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(contrastReport);
    fs.writeFileSync(
        `${out}/contrast/${screen.id}.json`,
        JSON.stringify(result, null, 2),
    );
    samples.push({ screen: screen.id, ...result });
    const broken = await page
        .locator('img')
        .evaluateAll((images) =>
            images
                .filter((img) => !img.complete || img.naturalWidth === 0)
                .map((img) => img.src),
        );
    if (broken.length)
        errors.push(`${screen.id}: broken images ${broken.join(',')}`);
}
for (const screen of [
    ...screens,
    { id: 'audit-index', path: '/design-review' },
]) {
    const route =
        screen.path ||
        `/design-review/${screen.role}/${screen.view}${screen.state ? `?state=${screen.state}` : ''}`;
    await page.goto(`http://127.0.0.1:8008${route}`);
    await page.evaluate(
        () => (document.documentElement.dataset.theme = 'dark'),
    );
    await page.waitForTimeout(250);
    const result = await page.evaluate(contrastReport);
    fs.writeFileSync(
        `${out}/contrast/${screen.id}-dark.json`,
        JSON.stringify(result, null, 2),
    );
    samples.push({ screen: `${screen.id}-dark`, ...result });
    if (['hc-kpi', 'ku-profile', 'audit-index'].includes(screen.id))
        await page.screenshot({
            path: `${out}/screenshots/${screen.id}-dark.png`,
        });
}
const states = [
    { id: 'org-actions', path: 'hc/akun', click: '[data-entity-more]' },
    { id: 'org-detail', path: 'hc/akun', click: '.table-name' },
    { id: 'indicator', path: 'hc/kpi', click: '[data-indicator-edit]' },
    { id: 'kpi-version', path: 'hc/kpi', click: '[data-panel-tab="version"]' },
    {
        id: 'cycle-create',
        path: 'hc/pengaturan',
        click: '[data-flow-action="new-cycle"]',
    },
    {
        id: 'score-findings',
        path: 'ku/nilai?person=E03',
        click: '[data-panel-tab="findings"]',
    },
    {
        id: 'review-history',
        path: 'kd/persetujuan?person=E05',
        click: '[data-review-mount] [data-panel-tab="history"]',
    },
    {
        id: 'analytics-history',
        path: 'hc/dashboard',
        click: '[data-panel-tab="history"]',
    },
    {
        id: 'analytics-rank',
        path: 'hc/dashboard',
        click: '[data-panel-tab="rank"]',
    },
    {
        id: 'mobile-filter',
        path: 'hc/rekap',
        width: 390,
        click: '[data-dialog-open="filter-dialog"]',
    },
    {
        id: 'profile-security',
        path: 'hc/profil',
        click: '[data-panel-tab="security"]',
    },
    {
        id: 'profile-preferences',
        path: 'hc/profil',
        click: '[data-panel-tab="preferences"]',
    },
];
for (const theme of ['light', 'dark'])
    for (const state of states) {
        await page.setViewportSize({
            width: state.width || 1440,
            height: state.width ? 844 : 900,
        });
        await page.goto('http://127.0.0.1:8008/design-review/' + state.path);
        await page.evaluate(
            (theme) => (document.documentElement.dataset.theme = theme),
            theme,
        );
        await page.waitForTimeout(250);
        await page.locator(state.click).first().click();
        await page.waitForTimeout(200);
        await page.evaluate(() => document.fonts.ready);
        const result = await page.evaluate(contrastReport),
            id = state.id + '-' + theme;
        fs.writeFileSync(
            out + '/contrast/' + id + '.json',
            JSON.stringify(result, null, 2),
        );
        samples.push({ screen: id, ...result });
        await page.screenshot({ path: out + '/screenshots/' + id + '.png' });
    }
await browser.close();
ownedServer?.kill();
const report = {
    generatedAt: new Date().toISOString(),
    stack: 'Laravel Blade / Tailwind 4 / Vite / native JavaScript',
    protectedBusinessFiles: protectedBusiness.length,
    approvedLayoutChanges: Object.entries(
        JSON.parse(
            fs.readFileSync(
                'docs/frontend/approved-layout/manifest.json',
                'utf8',
            ),
        ).files,
    )
        .filter(([file, value]) => !fs.existsSync(file) || hash(file) !== value)
        .map(([file]) => file),
    changedBusinessFiles: changedBusiness,
    alpineFiles: alpine,
    alpineDependency: packageLock.includes('alpinejs'),
    syntaxErrors: syntax,
    sourceReferences: references,
    pageErrors: errors,
    contrastSampledPairs: samples.reduce((n, s) => n + s.sampledPairs, 0),
    contrastIssues: samples.flatMap((s) =>
        s.issues.map((issue) => ({ screen: s.screen, ...issue })),
    ),
    browser: JSON.parse(
        fs.readFileSync(
            'docs/frontend/compact-crud/browser-report.json',
            'utf8',
        ),
    ).stats,
};
fs.writeFileSync(out + '/verification.json', JSON.stringify(report, null, 2));
console.log(
    JSON.stringify(
        {
            ...report,
            sourceReferences: `${references.length} source images checked`,
            contrastIssues: report.contrastIssues,
        },
        null,
        2,
    ),
);
if (
    report.approvedLayoutChanges.length ||
    changedBusiness.length ||
    alpine.length ||
    report.alpineDependency ||
    syntax.length ||
    errors.length ||
    report.contrastIssues.length ||
    references.some((r) => !r.sourceMatches) ||
    report.browser.unexpected
)
    process.exitCode = 1;
