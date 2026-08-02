/**
 * Portal Phase 2 S7 — magic-token hardening public surfaces.
 * ENVIRONMENT=EMULATOR when E2E_BASE_URL is localhost.
 *
 * Full magic-link exchange → `/portal/app/...` redirect is covered by integration tests
 * (`portal-phase2-s7.integration.test.ts`) against Firestore emulator helpers.
 * E2E here avoids fragile seeded-token deps on CI/local Next without emulator seed wiring.
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
      timeout: 15_000,
    });
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('organizationid');
    expect(body).not.toContain('cust_');
    expect(body).not.toContain('accessTokenHash');
    expect(page.url()).toContain(bogus);
  });

  test('/portal/app/billing without session shows unavailable or login path', async ({ page }) => {
    annotateLaunchCritical();
    test.skip(!isEmulatorTarget(), 'Session-first portal routes require local S7 web build');
    await page.goto('/portal/app/billing');
    await expect(
      page.getByRole('heading', { name: /billing unavailable|portal unavailable/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: /verify portal access/i })).toBeVisible();
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('organizationid');
    expect(body).not.toContain('accessTokenHash');
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
    expect(blob).not.toContain('accessTokenHash');
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
