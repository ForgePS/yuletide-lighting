import { test, expect } from '@playwright/test';

test.describe('production smoke', () => {
  test('home page loads with brand signal', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Yuletide|Lighting|CRM/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('body')).toBeVisible();
  });

  test('legal pages are published', async ({ page }) => {
    for (const path of ['/privacy', '/terms', '/subscription-terms', '/accessibility']) {
      const res = await page.goto(path);
      expect(res?.ok()).toBeTruthy();
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('sign-in is reachable', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('unauthenticated /app redirects away from protected shell', async ({ page }) => {
    const res = await page.goto('/app');
    const url = page.url();
    expect(res?.status() ?? 0).toBeLessThan(500);
    expect(url.includes('/sign-in') || url.includes('/access-denied') || !url.endsWith('/app')).toBeTruthy();
  });

  test('health endpoint reports ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
