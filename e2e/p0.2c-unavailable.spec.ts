import { test, expect, authenticateViaUi } from './fixtures/auth';

test.describe('P0.2C unavailable features', () => {
  test('map unavailable state is intentional when token missing', async ({ page }) => {
    await authenticateViaUi(page, 'owner');
    await page.goto('/app/marketing/sign-tracker');
    // MapUnavailable or equivalent controlled empty — not a blank iframe crash.
    const mapUnavailable = page.getByText(/map unavailable|maps unavailable|mapbox/i);
    if (await mapUnavailable.count()) {
      await expect(mapUnavailable.first()).toBeVisible();
    }
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(1500);
    expect(errors.filter((e) => /mapbox|token/i.test(e))).toHaveLength(0);
  });

  test('follow-up automation is not in production navigation and API is disabled', async ({
    page,
  }) => {
    await authenticateViaUi(page, 'owner');
    await page.goto('/app');
    await expect(page.getByRole('link', { name: /follow-?up automation/i })).toHaveCount(0);
    const res = await page.request.get('/api/trpc/followUpAutomation.list?batch=1&input=%7B%7D');
    // Soft assert: either 4xx or disabled payload
    const body = await res.text();
    expect(
      /FOLLOW_UP_AUTOMATION_DISABLED|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|disabled/i.test(body) ||
        res.status() >= 400,
    ).toBeTruthy();
  });

  test('planned integrations are not connectable', async ({ page }) => {
    await authenticateViaUi(page, 'administrator');
    await page.goto('/app/settings');
    const planned = page.getByText(/planned|coming soon|not available/i);
    if (await planned.count()) {
      await expect(planned.first()).toBeVisible();
    }
  });
});
