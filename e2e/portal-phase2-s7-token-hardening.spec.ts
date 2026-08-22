/**
 * Portal Phase 2 S7 — magic-token hardening public surfaces + tokenless URL checks.
 * ENVIRONMENT=EMULATOR when E2E_BASE_URL is localhost.
 *
 * Seeded magic-link exchange → `/portal/app` redirect is proven in
 * `portal-phase2-s7.integration.test.ts` (hash-only stages D–F).
 *
 * Default `npm run test:e2e` targets production hosting (undeployed S7 routes).
 * Launch-critical S7 surfaces run under `playwright.portal-emulator.config.ts`
 * with E2E_BASE_URL=http://127.0.0.1:3000 — same accounting pattern as P2-S6
 * emulator-host-specific specs (not counted as missing launch coverage).
 */
import { test, expect } from '@playwright/test';

const isEmulatorTarget = () => {
  const base = process.env.E2E_BASE_URL ?? '';
  return /localhost|127\.0\.0\.1/.test(base);
};

function annotateLaunchCritical() {
  test.info().annotations.push({
    type: 'launch-critical',
    description: 'portal-token-hardening',
  });
}

test.describe('portal phase 2 S7 token hardening surfaces', () => {
  test.beforeEach(() => {
    test.info().annotations.push({
      type: 'environment',
      description: isEmulatorTarget() ? 'EMULATOR' : 'REMOTE_READ_ONLY_PUBLIC',
    });
  });

  test('invalid token entry shim shows generic denial (URL may stay token-bearing)', async ({
    page,
  }) => {
    annotateLaunchCritical();
    test.skip(!isEmulatorTarget(), 'S7 entry shim UX verified on local emulator Next');
    const bogus = 'phase2S7InvalidToken0000000000000001';
    const res = await page.goto(`/portal/${bogus}/billing`);
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(page.getByRole('heading', { name: /portal access unavailable/i })).toBeVisible({
      timeout: 20_000,
    });
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('organizationid');
    expect(body).not.toContain('cust_');
    expect(body).not.toContain('accesstokenhash');
    expect(page.url()).toContain(bogus);
  });

  test('/portal/app/billing without session shows unavailable or login path', async ({ page }) => {
    annotateLaunchCritical();
    test.skip(!isEmulatorTarget(), 'Session-first portal routes require local S7 web build');
    await page.goto('/portal/app/billing');
    await expect(
      page.getByRole('heading', { name: /billing unavailable|portal unavailable|portal access/i }),
    ).toBeVisible({ timeout: 20_000 });
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('organizationid');
    expect(body).not.toContain('accesstokenhash');
    expect(page.url()).toMatch(/\/portal\/(app\/billing|login)/);
  });

  test('session API POST with bogus token returns 401 and Cache-Control no-store', async ({
    request,
  }) => {
    annotateLaunchCritical();
    test.skip(!isEmulatorTarget(), 'Session API hardening verified on local emulator Next');
    const res = await request.post('/api/portal/session', {
      data: { accessToken: 'phase2S7BogusAccessToken00000001' },
    });
    expect(res.status()).toBe(401);
    expect(res.headers()['cache-control']).toMatch(/no-store/i);
    const json = await res.json().catch(() => ({}));
    const blob = JSON.stringify(json).toLowerCase();
    expect(blob).not.toContain('sk_live');
    expect(blob).not.toContain('accesstokenhash');
  });

  test('session API DELETE clears session cookie', async ({ request }) => {
    annotateLaunchCritical();
    test.skip(!isEmulatorTarget(), 'Session DELETE verified on local emulator Next');
    const res = await request.delete('/api/portal/session');
    expect(res.status()).toBe(200);
    expect(res.headers()['cache-control']).toMatch(/no-store/i);
    const setCookie = res.headers()['set-cookie'] ?? '';
    expect(setCookie.toLowerCase()).toContain('__portal_session=');
    expect(setCookie.toLowerCase()).toMatch(/max-age=0|expires=/);
  });
});

test.describe('portal phase 2 S7B emulator seeded exchange', () => {
  test('legacy root magic link redirects to tokenless /portal/app', async ({ page }) => {
    test.info().annotations.push({
      type: 's7-emulator-seeded',
      description: 'Requires PORTAL_S7_E2E_TOKEN + local Next + emulators',
    });
    const raw = process.env.PORTAL_S7_E2E_TOKEN?.trim();
    test.skip(
      !isEmulatorTarget() || !raw || raw.length < 16,
      'Seeded hash-only exchange covered by portal-phase2-s7.integration.test.ts; set PORTAL_S7_E2E_TOKEN for local Playwright proof',
    );
    await page.goto(`/portal/${raw}`);
    await expect(page).toHaveURL(/\/portal\/app\/?$/, { timeout: 30_000 });
    expect(page.url()).not.toContain(raw!);
  });

  test('legacy billing deep link redirects to tokenless billing', async ({ page }) => {
    test.info().annotations.push({
      type: 's7-emulator-seeded',
      description: 'Requires PORTAL_S7_E2E_TOKEN + local Next + emulators',
    });
    const raw = process.env.PORTAL_S7_E2E_TOKEN?.trim();
    test.skip(
      !isEmulatorTarget() || !raw || raw.length < 16,
      'Deep-link exchange proven in S7 integration D–F; set PORTAL_S7_E2E_TOKEN for local Playwright proof',
    );
    await page.goto(`/portal/${raw}/billing`);
    await expect(page).toHaveURL(/\/portal\/app\/billing\/?$/, { timeout: 30_000 });
    expect(page.url()).not.toContain(raw!);
  });
});
