import { defineConfig, devices } from '@playwright/test';
process.env.SHEET_V2_ISOLATED_TEST = '1';
export default defineConfig({
  testDir: './tests/e2e/gm', testMatch: 'generator-v2.spec.ts', workers: 1, timeout: 180_000,
  reporter: [['list']], use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3119', screenshot: 'only-on-failure' },
  webServer: { command: 'node scripts/sheet-prototype/test-server.cjs', url: 'http://localhost:3119/login', reuseExistingServer: false, timeout: 180_000 },
});
