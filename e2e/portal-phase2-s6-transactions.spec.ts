/**
 * Portal Phase 2 S6 — transaction / payment / signing public surfaces.
 * ENVIRONMENT=EMULATOR when E2E_BASE_URL is local; otherwise remote read-only public checks.
 * Checkout safe-mode assertions require emulator (S6 code not required on production host).
 * No real Stripe charges. No seeded secrets required.
 */
import { test, expect } from '@playwright/test';

const isEmulatorTarget = () => {
  const base = process.env.E2E_BASE_URL ?? '';
  return /localhost|127\.0\.0\.1/.test(base);
};

test.describe('portal phase 2 S6 transaction surfaces', () => {
  test.beforeEach(() => {
    test.info().annotations.push({
      type: 'environment',
      description: isEmulatorTarget() ? 'EMULATOR' : 'REMOTE_READ_ONLY_PUBLIC',
    });
  });

  test('checkout API rejects missing invoice token without calling provider', async ({
    request,
  }) => {
    test.skip(!isEmulatorTarget(), 'Checkout safe-mode path requires local S6 web + emulator');
    const res = await request.post('/api/stripe/checkout', {
      data: { invoiceToken: '', amountCents: 1 },
    });
    expect([400, 404].includes(res.status())).toBeTruthy();
    const body = await res.text();
    expect(body.toLowerCase()).not.toContain('sk_live');
    expect(body.toLowerCase()).not.toContain('client_secret');
  });

  test('checkout API rejects forged invoice token; client amount ignored', async ({ request }) => {
    test.skip(!isEmulatorTarget(), 'Checkout safe-mode path requires local S6 web + emulator');
    const res = await request.post('/api/stripe/checkout', {
      data: {
        invoiceToken: 's6ForgedInvoiceToken00000001',
        amountCents: 1,
      },
    });
    expect([404, 409, 400].includes(res.status())).toBeTruthy();
    const json = await res.json().catch(() => ({}));
    const blob = JSON.stringify(json).toLowerCase();
    expect(blob).not.toContain('sk_live');
    expect(blob).not.toContain('client_secret');
    expect(json.mode).not.toBe('stripe');
  });

  for (const path of [
    '/p/s6ForgedProposalToken000000000001',
    '/a/s6ForgedAgreementToken00000000001',
    '/m/s6ForgedMockupToken00000000000001',
    '/pay/s6ForgedPayToken000000000000001',
  ]) {
    test(`public token path ${path.split('/')[1]} stays generic`, async ({ page }) => {
      test.skip(
        !isEmulatorTarget(),
        'Public token soft-deny UX asserted on emulator; production host may not include S6 yet',
      );
      const res = await page.goto(path);
      expect(res?.status() ?? 0).toBeLessThan(500);
      const body = (await page.locator('body').innerText()).toLowerCase();
      expect(body.length).toBeGreaterThan(5);
      expect(body).not.toContain('organizationid');
      expect(body).not.toContain('cust_');
      expect(body).not.toContain('sk_live');
      expect(body).not.toContain('client_secret');
    });
  }

  for (const segment of [
    'billing',
    'messages',
    'service-request',
    'proposals',
    'agreements',
    'mockups',
  ]) {
    test(`stale/invalid portal ${segment} page does not leak internals`, async ({ page }) => {
      const bogus = 'phase2S6InvalidToken0000000000000001';
      const res = await page.goto(`/portal/${bogus}/${segment}`);
      expect(res?.status() ?? 0).toBeLessThan(500);
      const body = (await page.locator('body').innerText()).toLowerCase();
      expect(body).not.toContain('organizationid');
      expect(body).not.toContain('feature_disabled');
      expect(body).not.toContain('action_denied');
      expect(body).not.toContain('sk_live');
      expect(body.length).toBeGreaterThan(5);
    });
  }

  for (const segment of ['schedule-request', 'rebook']) {
    test(`stale/invalid portal ${segment} page does not leak internals (emulator)`, async ({
      page,
    }) => {
      test.skip(
        !isEmulatorTarget(),
        `${segment} soft-deny UX verified on emulator; production host may lack S6 route hardening`,
      );
      const bogus = 'phase2S6InvalidToken0000000000000001';
      const res = await page.goto(`/portal/${bogus}/${segment}`);
      expect(res?.status() ?? 0).toBeLessThan(500);
      const body = (await page.locator('body').innerText()).toLowerCase();
      expect(body).not.toContain('organizationid');
      expect(body).not.toContain('sk_live');
    });
  }

  for (const vp of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    test(`billing denial fits ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/portal/phase2S6InvalidToken0000000000000001/billing');
      await expect(page.locator('body')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(2);
    });
  }
});
