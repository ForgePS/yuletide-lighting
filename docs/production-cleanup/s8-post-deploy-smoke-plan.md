# S8 Post-Deploy Smoke Plan

**PHASE:** PORTAL-P2-S8  
**TARGET:** Production **after separate go-live authorization** (or nonprod RC)  
**DURATION:** 15–20 minutes  
**STYLE:** Nondestructive preferred

## Preconditions

- Synthetic/test staff user
- Synthetic portal customer (nonprod) or designated production test customer (only if write authorized)
- Stripe live charges **OFF** unless payment auth given

## Steps

1. Homepage loads (`/`) < 5xx
2. `/api/health` OK
3. Staff sign-in → `/app`
4. Dashboard renders
5. Customer lookup (existing test record)
6. Open one property/job if present
7. Proposal list opens (no send required)
8. Invoice list opens (no charge)
9. Portal magic-link / paste → `__portal_session` → `/portal/app` tokenless URL
10. Portal billing/messages shell loads or safe unavailable
11. Staff logout; portal logout
12. Re-login staff once

## Fail = STOP / ROLLBACK evaluation

- Auth broken
- Wrong-tenant data visible
- 5xx on core routes
- Unexpected live charge / customer SMS/email

## Record

```text
SMOKE_ENV=
SMOKE_SHA=
SMOKE_RESULT=PASS|FAIL
REAL_CHARGES=0
REAL_EMAIL=0
REAL_SMS=0
```
