import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
export default defineConfig({
    testDir: 'tests/SimpleKpiPrototype',
    testMatch: /browser\.spec\.js/,
    outputDir: 'test-results/kpi-simple',
    workers: 1,
    timeout: 25000,
    reporter: [
        ['list'],
        ['json', { outputFile: 'design-review/kpi-periode/test-report.json' }],
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
        launchOptions: {
            executablePath: [
                'C:/Program Files/Google/Chrome/Application/chrome.exe',
                'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
            ].find((p) => fs.existsSync(p)),
        },
        screenshot: 'off',
        trace: 'off',
        video: 'off',
    },
});
