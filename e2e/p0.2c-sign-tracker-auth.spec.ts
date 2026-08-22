import { test, expect, authenticateViaUi } from './fixtures/auth';

test.describe('P0.2C authenticated Sign Tracker', () => {
  test('authorized user opens canonical Sign Tracker with summary + filters', async ({ page }) => {
    await authenticateViaUi(page, 'sign_manager');
    await page.goto('/app/marketing/sign-tracker');
    await expect(page).toHaveURL(/\/app\/marketing\/sign-tracker/);
    await expect(page.getByRole('heading', { name: /sign tracker/i })).toBeVisible();
    // Filters / summary present
    await expect(page.getByText(/total|active|pickup|recovered/i).first()).toBeVisible();
  });

  test('legacy field routes redirect to canonical destinations', async ({ page }) => {
    await authenticateViaUi(page, 'owner');
    const redirects: Array<[string, RegExp]> = [
      ['/app/field', /\/app\/marketing\/sign-tracker\/?$/],
      ['/app/field/signs', /\/app\/marketing\/sign-tracker\/?$/],
      ['/app/field/signs/add', /\/app\/marketing\/sign-tracker\/add/],
      ['/app/field/signs/pickup', /\/app\/marketing\/sign-tracker\/pickup/],
      ['/app/field/signs/report', /\/app\/marketing\/sign-tracker\/report/],
    ];
    for (const [from, to] of redirects) {
      await page.goto(from);
      await expect(page).toHaveURL(to);
    }
  });

  test('create sign with required-field validation and list appearance', async ({ page }) => {
    await authenticateViaUi(page, 'sign_manager');
    await page.goto('/app/marketing/sign-tracker/add');
    await page.getByRole('button', { name: /save|create|add/i }).click();
    await expect(page.getByText(/required|enter|must/i).first()).toBeVisible();

    await page
      .getByLabel(/address|location/i)
      .first()
      .fill('101 Staging Verification Rd');
    await page.getByLabel(/city/i).first().fill('Stagingville');
    await page
      .getByLabel(/quantity|placed/i)
      .first()
      .fill('2');
    await page.getByRole('button', { name: /save|create|add/i }).click();
    await page.goto('/app/marketing/sign-tracker');
    await expect(page.getByText(/101 Staging Verification/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('export denied without permission; allowed with permission', async ({ page }) => {
    await authenticateViaUi(page, 'no_export');
    await page.goto('/app/marketing/sign-tracker/report');
    const exportBtn = page.getByRole('button', { name: /export|csv/i });
    if (await exportBtn.count()) {
      await expect(exportBtn.first()).toBeDisabled();
    } else {
      await expect(page.getByText(/export|permission|denied/i).first()).toBeVisible();
    }

    await authenticateViaUi(page, 'sign_manager');
    await page.goto('/app/marketing/sign-tracker/report');
    await expect(page.getByRole('button', { name: /export|csv/i }).first()).toBeEnabled();
  });

  test('viewer cannot create; read-only cannot mutate; suspended denied', async ({ page }) => {
    await authenticateViaUi(page, 'sign_viewer');
    await page.goto('/app/marketing/sign-tracker/add');
    await expect(
      page.getByText(/permission|denied|forbidden|read.?only|not allowed/i).first(),
    ).toBeVisible({
      timeout: 20_000,
    });

    await authenticateViaUi(page, 'read_only');
    await page.goto('/app/marketing/sign-tracker/add');
    await expect(
      page.getByText(/permission|denied|forbidden|read.?only|not allowed/i).first(),
    ).toBeVisible({
      timeout: 20_000,
    });

    await authenticateViaUi(page, 'suspended');
    await page.goto('/app/marketing/sign-tracker');
    await expect(page).not.toHaveURL(/\/app\/marketing\/sign-tracker/);
  });

  test('module denial for warehouse role without sign_tracker', async ({ page }) => {
    await authenticateViaUi(page, 'no_sign_module');
    await page.goto('/app/marketing/sign-tracker');
    await expect(page.getByText(/module|not enabled|unavailable|denied/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
