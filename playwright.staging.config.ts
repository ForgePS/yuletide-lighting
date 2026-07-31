import { defineConfig, devices } from '@playwright/test';

/**
 * Staging E2E — requires STAGING_BASE_URL and controlled test credentials (never commit secrets).
 * Auth storage state lives in gitignored e2e/.auth/
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: process.env.STAGING_BASE_URL || 'https://yuletide-lighting-staging.web.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 12'] },
      testMatch: /p0\.2c-responsive\.spec\.ts/,
    },
  ],
});
