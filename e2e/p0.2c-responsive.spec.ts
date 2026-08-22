import { test, expect, authenticateViaUi } from './fixtures/auth';

const viewports = [
  { name: 'mobile-phone', width: 390, height: 844, isMobile: true },
  { name: 'tablet-portrait', width: 768, height: 1024, isMobile: true },
  { name: 'tablet-landscape', width: 1024, height: 768, isMobile: false },
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
];

for (const vp of viewports) {
  test.describe(`P0.2C Sign Tracker responsive — ${vp.name}`, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.name !== 'desktop',
    });

    test('critical workflow usable without horizontal overflow', async ({ page }) => {
      await authenticateViaUi(page, 'sign_manager');
      await page.goto('/app/marketing/sign-tracker');
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 2;
      });
      expect(overflow).toBeFalsy();
      await expect(page.getByRole('heading', { name: /sign tracker/i })).toBeVisible();
      await page.goto('/app/marketing/sign-tracker/pickup');
      await expect(page.getByText(/pickup|sign/i).first()).toBeVisible();
      await page.goto('/app/marketing/sign-tracker/report');
      await expect(page.getByText(/report|campaign|total|recovery/i).first()).toBeVisible();
    });
  });
}
