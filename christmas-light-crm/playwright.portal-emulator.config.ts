/**
 * Playwright config for Portal Phase 2 against local Next.js + Firebase emulators.
 * ENVIRONMENT=EMULATOR
 *
 * Usage:
 *   E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test -c playwright.portal-emulator.config.ts
 */
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './e2e',
  testMatch: /portal-phase2.*\.spec\.ts|portal-mobile\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-emulator',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
