import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
const executablePath = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));
export default defineConfig({
    testDir: 'tests/BladeDesign',
    testMatch: /revision-v4\.spec\.js/,
    outputDir: 'test-results/review-v4',
    workers: 1,
    timeout: 30000,
    reporter: [
        ['list'],
        [
            'json',
            { outputFile: 'docs/frontend/role-refinement/browser-report.json' },
        ],
    ],
    webServer: {
        stdout: 'ignore',
        stderr: 'ignore',
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
