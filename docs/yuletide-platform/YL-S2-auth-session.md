# YL-S2 — Firebase Auth / Session Hardening

## Gates

```text
Edge middleware          → structural JWT (exp/sub) only
/api/auth/session POST   → structural + verifyStaffIdToken (revoked + disabled)
resolveAppAccess         → verifyStaffIdToken + Firestore user/org lifecycle
```

## verifyStaffIdToken

1. `admin.auth().verifyIdToken(token, checkRevoked=true)`
2. `admin.auth().getUser(uid)` → deny if `disabled`
3. Returns `{ uid, email, name }`

## Cache policy (YL-S2)

- Successful AuthContext is **never** cached (roles/status reload every request)
- Short deny cache (~8s) remains to blunt repeated bad tokens

## Sign-out

`DELETE /api/auth/session` clears `__session` cookie (unchanged).

## Password recovery

UI at `/sign-in/forgot-password` — REUSE (Firebase client `sendPasswordResetEmail`). No change this sprint.

## Denial reasons

| Reason | Meaning |
|--------|---------|
| `unauthenticated` | Missing/invalid/revoked token |
| `disabled` | Firebase Auth user disabled |
| `inactive` / `pending` | Firestore user status |
| `org_inactive` / `no_org` | Org lifecycle (YL-S1) |

## Tests

- `packages/firebase/src/auth-session.test.ts`
- `tests/integration/auth/session.integration.test.ts` (stale role reload)
