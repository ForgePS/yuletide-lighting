# Portal Phase 2 S7 — URL Security

**ENVIRONMENT:** EMULATOR

## Session-first namespace

After magic-link exchange, authenticated pages live under `/portal/app/**` with **no token in the URL**. Auth is the `__portal_session` HttpOnly cookie.

## Legacy entry URLs

`/portal/{accessToken}/...` are shims only:

1. `LegacyPortalEntryShim` POSTs token to `/api/portal/session`.
2. On success → `router.replace` to mapped `/portal/app/...`.
3. On failure → generic “Portal access unavailable”; URL may remain token-bearing until user navigates away (acceptable).

## Response headers (legacy paths)

Applied via `apps/web/src/app/portal/[token]/layout.tsx` `headers()` and `next.config.js`:

| Header            | Value         |
| ----------------- | ------------- |
| `Referrer-Policy` | `no-referrer` |
| `Cache-Control`   | `no-store`    |
| `X-Robots-Tag`    | `noindex`     |

Metadata `robots: { index: false }` reinforces noindex.

## Session API

POST/DELETE `/api/portal/session` responses set `Cache-Control: no-store`.

## Out of scope

- `/portal/login`, `/portal/invite/*`, `/portal/access/*` — separate flows
- Public proposal/agreement/invoice/mockup tokens (`/p/`, `/a/`, `/pay/`, `/m/`)

**Gate status:** Headers wired in S7 worktree; E2E header assertions optional on parent gate.
