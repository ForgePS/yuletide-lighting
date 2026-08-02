# Portal Phase 2 S5 — Cache Review

**ENVIRONMENT:** EMULATOR  
**Deployment:** NO

## Portal file streaming (`/api/portal/files`)

| Header                | Value                    | Rationale                                                             |
| --------------------- | ------------------------ | --------------------------------------------------------------------- |
| `Cache-Control`       | `private, no-store`      | Ticket-bound bytes must not be cached by shared proxies or disk cache |
| `Content-Type`        | From ticket payload      | Correct MIME for preview                                              |
| `Content-Disposition` | `inline` or `attachment` | User-controlled download vs preview                                   |

Tickets expire in 15 minutes; caching responses would extend exposure beyond ticket TTL.

## Dynamic portal pages

Portal routes under `/portal/[token]/…` are authenticated, tenant-specific, and feature-gated. They must not be treated as static assets:

- Next.js App Router pages fetch via tRPC with token/session context.
- No `Cache-Control: public` on HTML or JSON for portal procedures.
- Session cookie `__portal_session` is HttpOnly; responses are user-specific.

## Staff `/api/files` proxy

Staff file proxy remains separate from portal tickets. Portal DTOs must not emit staff proxy URLs (`resolvePortalStoragePath` rejects cross-org paths).

## Service worker

**NOT APPLICABLE** — no service worker registered in `apps/web` for portal or app shell.

## CDN / edge

No production CDN configuration is in scope for S5 emulator evidence. Before launch, verify portal HTML and ticket responses are excluded from public edge cache policies.
