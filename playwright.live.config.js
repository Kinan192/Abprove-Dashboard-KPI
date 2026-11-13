import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: 'tests/Live',
    outputDir: 'test-results/live',
    workers: 1,
    timeout: 60000,
    reporter: [
        ['list'],
        ['json', { outputFile: 'docs/backend/v3/browser-report.json' }],
    ],
    use: {
        baseURL: process.env.KPI_E2E_URL,
        headless: true,
        viewport: { width: 1440, height: 900 },
        launchOptions: {
            executablePath:
                'C:/Program Files/Google/Chrome/Application/chrome.exe',
        },
        screenshot: 'off',
        trace: 'off',
        video: 'off',
    },
});
