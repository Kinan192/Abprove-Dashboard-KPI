import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
const executablePath = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));
export default defineConfig({
    testDir: 'tests/BladeDesign',
    testMatch: 'flow-v2.spec.js',
    workers: 1,
    timeout: 30000,
    reporter: [
        ['list'],
        ['json', { outputFile: 'docs/frontend/flow-v2/browser-report.json' }],
    ],
    webServer: {
        command: 'php -S 127.0.0.1:8008 -t public tools/testing/server.php',
        url: 'http://127.0.0.1:8008/design-review',
        reuseExistingServer: true,
        timeout: 20000,
    },
    use: {
        baseURL: 'http://127.0.0.1:8008',
        viewport: { width: 1440, height: 900 },
        headless: true,
        launchOptions: { executablePath },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
});
