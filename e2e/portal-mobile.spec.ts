import { test, expect } from '@playwright/test';

test.describe('portal access + mobile shell', () => {
  test('portal login is reachable', async ({ page }) => {
    const res = await page.goto('/portal/login');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/portal|access|paste|link/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test('invalid QR access page stays branded without leaking customer data', async ({ page }) => {
    const bogus = 'zzzzInvalidTokenNotReal00000000000001';
    const res = await page.goto(`/portal/access/${bogus}`);
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).not.toContain('cust_');
    expect(body.toLowerCase()).not.toContain('organizationid');
    expect(body.length).toBeGreaterThan(20);
  });

  test('portal login has no horizontal overflow at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/portal/login');
    await expect(page.locator('body')).toBeVisible();
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
      };
    });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test('portal PWA manifest is published', async ({ request }) => {
    const res = await request.get('/portal-manifest.webmanifest');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.start_url).toContain('/portal');
    expect(body.display).toBe('standalone');
  });

  test('login remains usable at 360px width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/portal/login');
    await expect(page.locator('body')).toBeVisible();
    const box = await page.locator('body').boundingBox();
    expect(box?.width).toBeLessThanOrEqual(360);
  });
});
