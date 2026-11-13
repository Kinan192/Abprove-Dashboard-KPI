import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
const executablePath = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));
export default defineConfig({
    testDir: 'tests/GoalsPrototype',
    testMatch: /prototype\.spec\.js/,
    outputDir: 'test-results/goals-prototype',
    workers: 1,
    timeout: 30000,
    reporter: [
        ['list'],
        [
            'json',
            {
                outputFile:
                    'output/design-review/kpi-periode/browser-report.json',
            },
        ],
    ],
    webServer: {
        command: 'php -S 127.0.0.1:8026 -t public tools/testing/server.php',
        url: 'http://127.0.0.1:8026/design-review/hc/kpi',
        reuseExistingServer: true,
        stdout: 'ignore',
        stderr: 'ignore',
        timeout: 20000,
    },
    use: {
        baseURL: 'http://127.0.0.1:8026',
        viewport: { width: 1440, height: 900 },
        headless: true,
        launchOptions: { executablePath },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
});
