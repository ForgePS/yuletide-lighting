/**
 * Portal Phase 2 S5 — route entitlement + file ticket surfaces (ENVIRONMENT=EMULATOR).
 * Uses public denial UX only; does not require seeded customer tokens in CI.
 */
import { test, expect } from '@playwright/test';

const isEmulatorTarget = () => {
  const base = process.env.E2E_BASE_URL ?? '';
  return /localhost|127\.0\.0\.1/.test(base);
};

test.describe('portal phase 2 S5 route/file security surfaces', () => {
  test.beforeEach(() => {
    test.info().annotations.push({
      type: 'environment',
      description: isEmulatorTarget() ? 'EMULATOR' : 'REMOTE_READ_ONLY_PUBLIC',
    });
  });

  test('portal files API rejects missing/forged tickets without leaking paths', async ({
    request,
  }) => {
    const missing = await request.get('/api/portal/files');
    expect(missing.status()).toBe(404);
    const forged = await request.get('/api/portal/files?ticket=not-a-real-ticket-value-0001');
    expect(forged.status()).toBe(404);
    const body = await forged.text();
    expect(body.toLowerCase()).not.toContain('organizations/');
    expect(body.toLowerCase()).not.toContain('storage');
    expect(body.toLowerCase()).not.toContain('bucket');
  });

  test('portal files API ignores arbitrary path query (no client path)', async ({ request }) => {
    const res = await request.get(
      '/api/portal/files?path=organizations/orgA/portal-service/cust/secret.pdf',
    );
    expect(res.status()).toBe(404);
    const body = await res.text();
    expect(body.toLowerCase()).not.toContain('secret.pdf');
  });

  for (const segment of [
    'billing',
    'documents',
    'messages',
    'jobs',
    'mockups',
    'agreements',
    'proposals',
  ]) {
    test(`invalid token ${segment} route stays generic`, async ({ page }) => {
      const bogus = 'phase2S5InvalidToken0000000000000001';
      const res = await page.goto(`/portal/${bogus}/${segment}`);
      expect(res?.status()).toBeLessThan(500);
      const body = (await page.locator('body').innerText()).toLowerCase();
      expect(body).not.toContain('organizationid');
      expect(body).not.toContain('cust_');
      expect(body).not.toContain('feature_disabled');
      expect(body).not.toContain('action_denied');
      expect(body.length).toBeGreaterThan(5);
    });
  }

  for (const vp of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    test(`denied billing state fits ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/portal/phase2S5InvalidToken0000000000000001/billing');
      await expect(page.locator('body')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(2);
      const heading = page.getByRole('heading').first();
      await expect(heading).toBeVisible();
    });
  }

  test('browser back from invalid portal does not expose protected identifiers', async ({
    page,
  }) => {
    await page.goto('/portal/login');
    await page.goto('/portal/phase2S5InvalidToken0000000000000001/documents');
    await page.goBack();
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('cust_');
    expect(body).not.toContain('organizations/');
  });
});
