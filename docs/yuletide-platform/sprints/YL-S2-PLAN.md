# YL-S2 Plan — Firebase Auth / Session Hardening

## Objective

Ensure protected staff application state is gated by **live Firebase Auth verification** (revocation + disabled users), not structural JWT checks or cached role snapshots alone.

## Authorization

`authorized to start YL-S2` (user, 2026-08-10). Focus: harden session verification gates + tests.

## Current State

- Middleware: structural JWT check only (edge-safe) — OK as first gate
- `resolveAppAccess`: Admin `verifyIdToken` **without** `checkRevoked`; caches successful AuthContext ~45s (**stale role risk**)
- `/api/auth/session` POST: structural validation only before Set-Cookie — **does not cryptographically verify**
- Password reset UI exists (`/sign-in/forgot-password`) — REUSE, no UI rewrite this sprint
- Firestore user `status` denied for suspended/archived/pending (YL-S1) — REUSE

## Reuse

- `session-token.ts` structural checks for middleware
- Cookie `__session` / AUTH_COOKIE_NAME pattern
- Access-denied reasons + layouts
- Existing auth session integration tests

## Changes Required

1. `auth-session.ts`: `verifyStaffIdToken` with `checkRevoked: true` + Auth `disabled` denial
2. Wire into `resolveAppAccess` and `/api/auth/session` POST
3. Stop caching successful AuthContext (always reload user/org/roles); keep short deny TTL
4. Access-denied reason `disabled`
5. Unit tests for helpers + session route verification behavior
6. Domain doc + COMPLETE

## Expected Files

- `packages/firebase/src/auth-session.ts` (+ tests)
- `packages/firebase/src/firestore.ts` (delegate verifyIdToken)
- `packages/firebase/src/index.ts`
- `apps/web/src/lib/auth.ts`
- `apps/web/src/app/api/auth/session/route.ts`
- `apps/web/src/app/access-denied/page.tsx`
- docs under `docs/yuletide-platform/`

## Firestore / Rules / Functions / Storage

NONE (Auth Admin API only).

## Security Impact

Invalid/revoked/disabled tokens cannot establish or keep staff sessions. Role changes apply on next request (no 45s success cache).

## Tests Required

- Unit: auth-session helpers
- Unit: existing structural token tests remain
- `npm test`
- Auth integration (emulator) still green for Firestore user status paths

## Out of Scope

- YL-S3 RBAC redesign
- Portal session hardening (already Phase 2)
- MFA / custom claims payload redesign
- Production Auth provider console changes
- Sneat / proposal WIP

## Risks

- Session POST now requires Admin credentials on the SSR runtime (already required for layouts)
- `checkRevoked` adds Auth API lookup — acceptable for security sprint
