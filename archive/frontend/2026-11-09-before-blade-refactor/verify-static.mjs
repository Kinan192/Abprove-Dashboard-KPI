import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
);
process.chdir(root);
const out = 'docs/frontend/abprove-review',
    preview = 'frontend/abprove-preview';
const manifest = JSON.parse(
    fs.readFileSync(out + '/source-manifest.json', 'utf8'),
);
const hash = (p) =>
    crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const changed = Object.entries(manifest.protectedExistingFiles)
    .filter(([p, h]) => !fs.existsSync(p) || hash(p) !== h)
    .map(([p]) => p);
const images = manifest.references
    .filter((r) => hash(preview + '/reference/' + r.path) !== r.sha256)
    .map((r) => r.path);
const sourcePath = path.join(manifest.source, 'ABprove_KPI_Kinerja.html');
const syntaxFiles = [
    'assets/abprove.js',
    'assets/review.js',
    'assets/audit.js',
    'assets/catalog.js',
]
    .map((p) => preview + '/' + p)
    .concat([
        'tools/design-review/serve.mjs',
        'tools/design-review/contrast.mjs',
        'playwright.abprove.config.js',
        'tests/DesignReview/abprove.spec.js',
    ]);
const syntaxErrors = syntaxFiles.filter(
    (p) =>
        spawnSync(process.execPath, ['--check', p], { encoding: 'utf8' })
            .status !== 0,
);
const browserReport = JSON.parse(
    fs.readFileSync(out + '/browser-report.json', 'utf8'),
);
const contrast = fs
    .readdirSync(out + '/contrast')
    .filter((p) => p.endsWith('.json'))
    .map((p) => ({
        screen: p,
        ...JSON.parse(fs.readFileSync(out + '/contrast/' + p, 'utf8')),
    }));
const report = {
    generatedAt: new Date().toISOString(),
    originalHtmlUnchanged: fs.existsSync(sourcePath)
        ? hash(sourcePath) === manifest.htmlSHA256
        : null,
    protectedApplicationFiles: Object.keys(manifest.protectedExistingFiles)
        .length,
    changedApplicationFiles: changed,
    referenceImages: manifest.references.length,
    changedReferenceImages: images,
    syntaxFiles: syntaxFiles.length,
    syntaxErrors,
    browser: browserReport.stats,
    contrastScreens: contrast.length,
    contrastSampledPairs: contrast.reduce((n, c) => n + c.sampledPairs, 0),
    contrastIssues: contrast.flatMap((c) =>
        c.issues.map((i) => ({ screen: c.screen, ...i })),
    ),
};
const executablePath = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ headless: true, executablePath });
try {
    const page = await browser.newPage({
            viewport: { width: 1440, height: 900 },
        }),
        errors = [],
        remote = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
    });
    page.on('request', (r) => {
        if (/^https?:/.test(r.url())) remote.push(r.url());
    });
    await page.goto(pathToFileURL(path.resolve(preview + '/audit.html')).href);
    await page.locator('#audit-role').selectOption('ku');
    await page.locator('#audit-screen').selectOption('ku-score');
    const body = page.frameLocator('#audit-preview').locator('body');
    await body.waitFor();
    await page.waitForFunction(
        () =>
            document.getElementById('audit-reference').complete &&
            document.getElementById('audit-reference').naturalWidth > 0,
    );
    await body.evaluate(() => document.fonts.ready);
    await page.evaluate(() => document.fonts.ready);
    await body.evaluate(() =>
        Promise.all(
            document
                .getAnimations()
                .filter((a) => a.effect.getTiming().iterations !== Infinity)
                .map((a) => a.finished.catch(() => {})),
        ),
    );
    const fonts = await body.evaluate(() =>
        [...document.fonts].map((f) => ({
            family: f.family,
            weight: f.weight,
            status: f.status,
        })),
    );
    const handlers = await body.evaluate(() => Object.keys(A));
    const literals = [
        ...fs
            .readFileSync(preview + '/assets/abprove.js', 'utf8')
            .matchAll(/data-act=["']([A-Za-z]\w*)["']/g),
    ].map((m) => m[1]);
    report.controlBindings = {
        literalActions: [...new Set(literals)].sort(),
        handlerCount: handlers.length,
        missingHandlers: [...new Set(literals)].filter(
            (a) => !handlers.includes(a),
        ),
    };
    await page.screenshot({ path: out + '/screenshots/audit-index.png' });
    report.filePreview = {
        opened: true,
        errors,
        remoteRequests: remote,
        fonts,
        selectedScreen: await page.locator('#audit-screen').inputValue(),
    };
} finally {
    await browser.close();
}
report.passed =
    changed.length === 0 &&
    images.length === 0 &&
    syntaxErrors.length === 0 &&
    report.originalHtmlUnchanged !== false &&
    browserReport.stats.unexpected === 0 &&
    browserReport.stats.skipped === 0 &&
    report.contrastIssues.length === 0 &&
    report.filePreview.errors.length === 0 &&
    report.filePreview.remoteRequests.length === 0 &&
    report.filePreview.fonts.every((f) => f.status !== 'error');
report.passed =
    report.passed && report.controlBindings.missingHandlers.length === 0;
fs.writeFileSync(
    out + '/verification.json',
    JSON.stringify(report, null, 2) + '\n',
);
console.log(
    JSON.stringify(
        {
            passed: report.passed,
            protectedFiles: report.protectedApplicationFiles,
            unchangedImages: report.referenceImages,
            syntaxFiles: report.syntaxFiles,
            browserPassed: report.browser.expected,
            contrastIssues: report.contrastIssues.length,
            filePreview: report.filePreview.opened,
            errors: report.filePreview.errors,
        },
        null,
        2,
    ),
);
if (!report.passed) process.exitCode = 1;
