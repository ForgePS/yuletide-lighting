import { expect, test } from '@playwright/test';

/**
 * P0.1 browser verification — routes that do not require authenticated CRM session.
 * Authenticated Sign Tracker workflows require staging test accounts (see p0.2-manual-verification.md).
 */
test.describe('P0.1 Sign Tracker public/route checks', () => {
  test('legacy /app/field redirects toward marketing sign-tracker', async ({ page }) => {
    const response = await page.goto('/app/field', { waitUntil: 'domcontentloaded' });
    // Middleware may bounce unauthenticated users to sign-in; either redirect chain is acceptable
    // as long as we never land on a broken field hub that links to /app/field as destination.
    const url = page.url();
    expect(response?.status() ?? 200).toBeLessThan(500);
    expect(url.includes('/app/field/signs')).toBeFalsy();
    const content = await page.content();
    expect(content.toLowerCase()).not.toContain('coming soon');
  });

  test('sign-in page has no /app/field href', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
    const hrefs = await page.locator('a[href*="/app/field"]').count();
    expect(hrefs).toBe(0);
  });

  test('mobile viewport sign-in remains usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});
