# Portal Phase 2 S6 — Transaction model

**ENVIRONMENT:** EMULATOR  
**S5 checkpoint SHA:** `d9d8242ad6df0f9e6f58af27baa96bcf16135a3d`

## Layer stack

```
Client request
  → requirePortalAuthorized (P2-S1: feature, action, role, settings)
  → requirePortalMutation (optional: ownership, expectedStatus, expectedUpdatedAtMs)
  → canPortalTransition / assertPortalTransition (customer-visible state machine)
  → withPortalIdempotency (optional: client key claim-or-replay)
  → execute (Firestore write / side effects)
  → audit (timeline, communication, activity)
```

Route/file gates from P2-S5 remain upstream for UI paths; S6 hardens mutation integrity at the Firebase layer.

## Mutation guard (`requirePortalMutation`)

Composes P2-S1 auth with P2-S4 ownership:

- Resolves collection via `COLLECTION_BY_TYPE`
- `requirePortalOwnedRecord` — cross-customer / cross-tenant → `RESOURCE_NOT_FOUND`
- Optional `expectedStatus` — mismatch → `INVALID_STATE`
- Optional `expectedUpdatedAtMs` — mismatch → `STALE_RESOURCE` (optimistic concurrency)

Returns `PortalMutationContext`: `{ authorized, scope, feature, action, resource? }`.

## State machine (`canPortalTransition`)

Customer-facing transitions only. Unknown resource type or current state → **DENY**.

| Resource           | From states                                                             | To states                                    |
| ------------------ | ----------------------------------------------------------------------- | -------------------------------------------- |
| `proposal`         | `sent`, `viewed`, `customer_questions`                                  | `approved`, `rejected`, `customer_questions` |
| `agreement`        | `awaiting_signature`, `draft`                                           | `active`                                     |
| `mockup`           | `in_review`, `published`, `pending_approval`, `sent`, `customer_review` | `approved`, `revision_requested`             |
| `rebooking`        | `not_sent`, `sent`, `opened`                                            | `rebooked`, `upgrade_requested`              |
| `service_request`  | `''` (create)                                                           | `reported`                                   |
| `schedule_request` | `''` (create)                                                           | `requested`                                  |

Terminal states (`approved`, `rebooked`, `used_for_activation`, etc.) are not valid **from** states for new transitions.

## Concurrency patterns

| Pattern                            | Used by                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------- |
| Firestore `runTransaction`         | Agreement signing (`recordAgreementSignature`)                            |
| Idempotency doc `create` + re-read | Portal creates with client keys                                           |
| Terminal short-circuit             | Rebook (`processRebookRecord`), proposal/mockup/agreement replay          |
| Optimistic `expectedUpdatedAtMs`   | Optional callers of `requirePortalMutation`                               |
| Parallel approval races            | Public-token flows return canonical terminal state (integration evidence) |

## Denial reasons (`PortalMutationDeniedError`)

| Reason                 | Typical trigger                            |
| ---------------------- | ------------------------------------------ |
| `AUTH_REQUIRED`        | Missing/invalid session or token           |
| `FEATURE_DISABLED`     | Feature not in `enabledFeatures`           |
| `ACTION_DENIED`        | Role matrix denies action                  |
| `RESOURCE_NOT_FOUND`   | Record missing or not owned                |
| `INVALID_STATE`        | Transition not in table or status mismatch |
| `STALE_RESOURCE`       | `expectedUpdatedAtMs` drift                |
| `IDEMPOTENCY_CONFLICT` | Same doc, mismatched scope fields          |
| `RATE_LIMITED`         | Message bucket exhausted                   |
| `PORTAL_UNAVAILABLE`   | Suspension / portal disabled               |

## Payment authority

`portalInvoicePayableCents(invoice)` — server-only charge computation:

- Closed statuses (`paid`, `void`, `cancelled`/`canceled`, `draft`) → not payable
- Balance = `subtotalCents - amountPaidCents` (clamped ≥ 0)
- Deposit due = `min(depositDue, balance)` when `depositCents > 0` and deposit not fully paid
- Otherwise full balance

`POST /api/stripe/checkout`:

- Loads invoice by `invoiceToken` (public token)
- Computes amount via `portalInvoicePayableCents`
- **Ignores client `amountCents` entirely**
- Safe mode → mock URL, `providerCalls: 0`, no Stripe network call

`portalPaymentSafeMode()` true when:

- `PORTAL_PAYMENT_SAFE_MODE=1`
- `FIRESTORE_EMULATOR_HOST` set
- `FIREBASE_AUTH_EMULATOR_HOST` set
- Missing `STRIPE_SECRET_KEY`
- Key starts with `sk_live` (never live from this path during P2)

## QR terminal (single-use)

`isInactiveStatus` includes `used_for_activation`. After single-use activation, `qrSendCode` / `qrVerify` deny further OTP cycles. `reusable` QRs remain active for re-auth.

## Side-effect ordering

Rebook: proposal creation + pipeline update only when record **not** in terminal state. Idempotent rebook returns existing `newProposalId` without duplicate comms when `replayed`.

## Evidence

| Layer       | File                                                                 |
| ----------- | -------------------------------------------------------------------- |
| Unit        | `packages/firebase/src/portal-phase2-s6-security.test.ts`            |
| Integration | `tests/integration/portal/portal-phase2-s6.integration.test.ts`      |
| Static      | `npm run audit:portal-mutations`, `npm run audit:portal-idempotency` |
