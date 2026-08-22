# Portal Phase 2 S6 — Idempotency design

**ENVIRONMENT:** EMULATOR  
**Branch:** `production/yuletide-cleanup-launch-readiness`  
**S5 checkpoint SHA:** `d9d8242ad6df0f9e6f58af27baa96bcf16135a3d`

## Scope

Two complementary patterns:

1. **Client idempotency keys** — portal create mutations (service, schedule, message, rebook).
2. **State replay** — public-token flows (proposal, agreement, mockup) and rebook terminal records.

Public-token flows do **not** use `portalIdempotencyKeys`; they return the current resource when already terminal.

## Canonical helper

`withPortalIdempotency` in `packages/firebase/src/portal-mutation.ts`.

### Client key rules

| Rule           | Behavior                          |
| -------------- | --------------------------------- |
| Length         | 8–200 chars after trim            |
| Absent / short | Execute normally; no store write  |
| Valid key      | Claim-or-replay via Firestore doc |

### Scope-bound keys (cross-scope reuse DENY)

Doc id hash binds all of:

```
organizationId | customerId | portalAccountId | portalUserId | action | resourceId
```

Implementation:

```typescript
const scopeKey = [
  args.scope.organizationId,
  args.scope.customerId,
  args.scope.portalAccountId,
  args.scope.portalUserId,
  args.action,
  args.resourceId,
].join('|');
const docId = hashPortalSecret(`${scopeKey}|${clientKey}`, secret).slice(0, 64);
```

- **Path:** `organizations/{orgId}/portalIdempotencyKeys/{docId}`
- **Secret:** `PORTAL_IDEMPOTENCY_SECRET` → `PORTAL_SESSION_SECRET` → emulator fallback
- **Replay:** Returns stored `resultJson` when all scope fields match
- **Conflict:** `IDEMPOTENCY_CONFLICT` when doc exists with mismatched scope fields
- **Concurrency:** `ref.create` with re-read winner on collision

Same client key under a different customer, account, user, action, or resource id produces a **different** doc id (or conflict if scope fields mismatch on same doc).

## Wired portal creates

| Action                   | Resource id  | Function                      | Notes                                             |
| ------------------------ | ------------ | ----------------------------- | ------------------------------------------------- |
| `service_request.create` | `new`        | `submitPortalServiceRequest`  | Creates `serviceIssues` at `reported`             |
| `scheduling.request`     | `new`        | `submitPortalScheduleRequest` | Soft request; synthetic `{ status: 'requested' }` |
| `messaging.send`         | `thread`     | `sendPortalMessage`           | Rate limit inside `execute` only                  |
| `rebooking.request`      | `customerId` | `submitPortalRebookRequest`   | Wraps `processPortalRebook`                       |

### Message rate limit (inside idempotency execute)

Rate limit applies only to **new** sends, not idempotent replays:

- **Max:** 30 messages
- **Window:** 15 minutes (`15 * 60 * 1000` ms)
- **Key:** `portal-message|orgId|customerId|portalUserId`
- **Denial:** `"Too many messages. Please wait and try again."`

Idempotent retry with same key replays stored result without consuming quota.

## Public-token replay (not idempotency keys)

| Flow                              | Function                       | Replay behavior                                                                                             |
| --------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Proposal approve/reject/questions | `recordPublicApproval`         | Returns current proposal when already terminal for action; `canPortalTransition` guards invalid transitions |
| Agreement sign                    | `recordAgreementSignature`     | Firestore transaction no-ops when `active`/`signed`                                                         |
| Mockup approve/revision           | `recordCustomerMockupApproval` | Replays `approved` / `revision_requested`; denies `draft` / `staff_only`                                    |
| Rebook record                     | `processRebookRecord`          | Returns `{ replayed: true }` for `rebooked`, `upgrade_requested`, `declined` — no duplicate proposals       |

## Payment idempotency (provider)

When not in safe mode, checkout uses Stripe idempotency key:

```
portal-checkout:{orgId}:{invoiceId}:{amountCents}
```

Amount is always server-derived via `portalInvoicePayableCents`; client `amountCents` is ignored.

## Static audit

`npm run audit:portal-idempotency` — verifies `withPortalIdempotency` on classified portal creates, terminal rebook replay, agreement transaction, proposal/mockup replay handling, checkout safe mode.

## Evidence

`tests/integration/portal/portal-phase2-s6.integration.test.ts`:

- Service / schedule / message / rebook same-key replay
- Cross-customer scope isolation (different doc ids)
- Action binding (same key, different action → separate executes)
- Short key bypass (< 8 chars → new ids)
- Parallel same-key service create → one id
- Message rate limit + idempotent replay after exhaustion
