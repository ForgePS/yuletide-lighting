# Portal Phase 2 S6 — Provider safety

**ENVIRONMENT:** EMULATOR  
**Assert:** REAL PAYMENT TRANSACTIONS: **0**; no production email; no production SMS during automated S6 evidence.

## Payments

### Safe mode gate

`portalPaymentSafeMode()` in `packages/firebase/src/portal-mutation.ts` returns `true` when any of:

| Condition                         | Rationale                                      |
| --------------------------------- | ---------------------------------------------- |
| `PORTAL_PAYMENT_SAFE_MODE=1`      | Explicit operator override                     |
| `FIRESTORE_EMULATOR_HOST` set     | Emulator evidence runs                         |
| `FIREBASE_AUTH_EMULATOR_HOST` set | Emulator evidence runs                         |
| `STRIPE_SECRET_KEY` missing       | Fail closed                                    |
| Key starts with `sk_live`         | Never charge live from P2 portal checkout path |

Integration tests set `PORTAL_PAYMENT_SAFE_MODE=1` in `beforeAll`.

### Checkout route (`apps/web/src/app/api/stripe/checkout/route.ts`)

| Control             | Implementation                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Amount authority    | `portalInvoicePayableCents(invoice)` — server invoice truth only                             |
| Client tampering    | **Ignores client `amountCents` entirely** — not read from body for charge amount             |
| Safe mode           | Returns mock URL `{ mode: 'safe', providerCalls: 0 }` — no `stripe.checkout.sessions.create` |
| Non-payable invoice | HTTP 409 `"This action is no longer available."`                                             |
| Live path (future)  | Stripe idempotency key `portal-checkout:{orgId}:{invoiceId}:{amountCents}`                   |

### Evidence assertion

| Metric                                | S6 value                     |
| ------------------------------------- | ---------------------------- |
| Real Stripe checkout sessions created | **0**                        |
| Real payment intents captured         | **0**                        |
| Mock checkout responses in emulator   | Yes (`mock_cs_*` session id) |

## Email / SMS

- Portal OTP delivery uses emulator provider from P2-S3 (`portal-delivery.ts`).
- Production Resend/Twilio adapters are not invoked when `ENVIRONMENT=EMULATOR` or provider is `live-disabled-s3`.
- Acceptance workflow side effects wrapped in try/catch; failures logged, not retried to external providers in tests.

## QR provider calls

`qrSendCode` rate limits and cooldowns apply before any delivery adapter. In emulator runs, delivery stays on emulator adapter — no live SMS/email.

## Verification checklist

- [ ] `portalPaymentSafeMode()` returns `true` in integration `beforeAll`
- [ ] Checkout integration/unit evidence confirms server amount (deposit logic, paid/void deny)
- [ ] No `sk_live` key in test env
- [ ] `production:check` runs with emulator env; no deploy scripts executed
- [ ] Static audit `audit:portal-mutations` verifies checkout uses `portalInvoicePayableCents` + `portalPaymentSafeMode`

## Rollback safety

If safe mode misconfigured in a future environment, set `PORTAL_PAYMENT_SAFE_MODE=1` and verify `portalPaymentSafeMode()` before enabling live Stripe. See `portal-phase-2-s6-rollback.md`.
