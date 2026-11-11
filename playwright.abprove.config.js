import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
const executablePath = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));
export default defineConfig({
    testDir: 'tests/DesignReview',
    testMatch: 'abprove.spec.js',
    workers: 1,
    fullyParallel: false,
    timeout: 30000,
    reporter: [
        ['list'],
        [
            'json',
            { outputFile: 'docs/frontend/abprove-review/browser-report.json' },
        ],
    ],
    webServer: {
        command: 'node tools/design-review/serve.mjs',
        url: 'http://127.0.0.1:4174/audit.html',
        reuseExistingServer: false,
        timeout: 20000,
    },
    use: {
        baseURL: 'http://127.0.0.1:4174',
        headless: true,
        viewport: { width: 1440, height: 900 },
        launchOptions: { executablePath },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
});
