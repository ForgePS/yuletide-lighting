import { test, expect } from '@playwright/test';

test.describe('production smoke', () => {
  test('home page loads', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
  });

  test('pricing page loads', async ({ page }) => {
    const res = await page.goto('/pricing');
    expect(res?.ok()).toBeTruthy();
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
    await expect(page.getByText(/welcome back|sign in|installer account/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('unauthenticated /app redirects to sign-in', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/sign-in/, { timeout: 20_000 });
  });

  test('health endpoint reports ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
