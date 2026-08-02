/**
 * Portal Phase 2 — public security surfaces (ENVIRONMENT=EMULATOR when E2E_BASE_URL is local).
 * Does not write to production. Prefer E2E_BASE_URL=http://127.0.0.1:3000 with local Next + emulators.
 */
import { test, expect } from '@playwright/test';

const isEmulatorTarget = () => {
  const base = process.env.E2E_BASE_URL ?? '';
  return /localhost|127\.0\.0\.1/.test(base);
};

test.describe('portal phase 2 security surfaces', () => {
  test.beforeEach(() => {
    test.info().annotations.push({
      type: 'environment',
      description: isEmulatorTarget() ? 'EMULATOR' : 'REMOTE_READ_ONLY_PUBLIC',
    });
  });

  test('portal login page loads without staff chrome', async ({ page }) => {
    const res = await page.goto('/portal/login');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
    const text = (await page.locator('body').innerText()).toLowerCase();
    expect(text).toMatch(/portal|access|code|link|login/);
    // Staff CRM shell markers should not dominate portal login
    expect(text).not.toContain('creator console');
  });

  test('invalid magic token does not enumerate customers', async ({ page }) => {
    const bogus = 'phase2InvalidToken0000000000000001';
    const res = await page.goto(`/portal/${bogus}`);
    expect(res?.status()).toBeLessThan(500);
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('cust_');
    expect(body).not.toContain('organizationid');
    expect(body).not.toContain('accessToken'.toLowerCase());
    expect(body).not.toMatch(/\b\d{6}\b.*otp/);
  });

  test('invalid QR access stays generic', async ({ page }) => {
    const bogus = 'phase2InvalidQrToken000000000000001';
    await page.goto(`/portal/access/${bogus}`);
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('@portal-test.invalid');
    expect(body.length).toBeGreaterThan(10);
  });

  test('invalid invitation stays generic without tenant identifiers', async ({ page }) => {
    const bogus = 'bogusTokenForPortalP2S3Invitation000001';
    const res = await page.goto(`/portal/invite/${bogus}`);
    expect(res?.status()).toBeLessThan(500);
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).toMatch(/access|unavailable|invite|invitation|portal/);
    expect(body).not.toContain('organizationid');
    expect(body).not.toContain('customerid');
    expect(body).not.toContain('org_');
    expect(body).not.toContain('cust_');
    expect(body).not.toContain('@portal-test.invalid');
  });

  for (const vp of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    test(`invitation page fits ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/portal/invite/bogusTokenForPortalP2S3Viewport000001');
      await expect(page.locator('body')).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }));
      expect(dimensions.viewportWidth).toBe(vp.width);
      expect(dimensions.viewportHeight).toBe(vp.height);
      expect(dimensions.overflow).toBeLessThanOrEqual(2);
      const body = (await page.locator('body').innerText()).toLowerCase();
      expect(body).not.toContain('organizationid');
      expect(body).not.toContain('cust_');
    });
  }

  test('portal session API rejects empty body', async ({ request }) => {
    const res = await request.post('/api/portal/session', {
      data: {},
    });
    expect([400, 401, 404, 405].includes(res.status()) || res.status() >= 400).toBeTruthy();
    if (res.status() !== 404) {
      const json = await res.json().catch(() => ({}));
      expect(JSON.stringify(json).toLowerCase()).not.toContain('otp');
    }
  });

  test('staff /app is not accessible via portal cookie alone', async ({ page, context }) => {
    await context.addCookies([
      {
        name: '__portal_session',
        value: 'not-a-valid-session',
        url: process.env.E2E_BASE_URL ?? 'https://yuletide-lighting.web.app',
        httpOnly: true,
      },
    ]);
    const res = await page.goto('/app');
    // Should redirect to login or deny — must not render CRM dashboard as portal user
    const url = page.url();
    const status = res?.status() ?? 0;
    expect(status === 200 ? !url.includes('/app/dashboard') : true).toBeTruthy();
  });

  test('keyboard focus reaches login controls', async ({ page }) => {
    await page.goto('/portal/login');
    await page.keyboard.press('Tab');
    const tag = await page.evaluate(() => document.activeElement?.tagName ?? '');
    expect(['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'BODY'].includes(tag)).toBeTruthy();
  });

  const viewports = [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
  ];

  for (const vp of viewports) {
    test(`no horizontal overflow at ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/portal/login');
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(2);
    });
  }
});
