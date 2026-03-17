import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.test.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env['BASE_URL'] ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  // When BASE_URL is set we're running against a live environment (QA/staging).
  // Skip webServer — services are already deployed and reachable.
  ...(process.env['BASE_URL']
    ? {}
    : {
        webServer: [
          {
            command: 'pnpm dev:auth',
            url: 'http://localhost:3001/health',
            reuseExistingServer: true,
            timeout: 30_000,
          },
          {
            command: 'pnpm dev:api-gateway',
            url: 'http://localhost:3000/health',
            reuseExistingServer: true,
            timeout: 30_000,
          },
          {
            command: 'pnpm dev:web',
            url: 'http://localhost:5173',
            reuseExistingServer: true,
            timeout: 30_000,
          },
        ],
      }),
});
