import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

const browserPaths = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
export default defineConfig({
    testDir: 'tests/Browser',
    testMatch: '**/*.spec.js',
    workers: 1,
    fullyParallel: false,
    timeout: 45000,
    expect: { timeout: 10000 },
    reporter: [
        ['list'],
        ['json', { outputFile: 'docs/frontend/browser-report.json' }],
    ],
    use: {
        baseURL: process.env.KPI_E2E_BASE_URL,
        viewport: { width: 1440, height: 900 },
        headless: true,
        launchOptions: {
            executablePath:
                process.env.KPI_BROWSER_PATH ||
                browserPaths.find((p) => fs.existsSync(p)),
        },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
});
