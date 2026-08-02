# Portal Phase 2 S7 — Route Cutover Map

**ENVIRONMENT:** EMULATOR
**PHASE:** PORTAL-P2-S7 Session-first URL cutover
**DATE:** 2026-08-02
**BASE SHA:** `d98c3e90715e4a7e104285a68ea16cc56811c30b`

## Summary

Magic-token URLs (`/portal/{accessToken}/...`) are **entry shims only**. After POST `/api/portal/session` succeeds, the browser is replaced onto tokenless **`/portal/app/...`** routes authenticated solely by the `__portal_session` cookie.

## Legacy → session-first mapping

| Legacy magic-token URL             | Session-first destination      |
| ---------------------------------- | ------------------------------ |
| `/portal/{token}`                  | `/portal/app`                  |
| `/portal/{token}/schedule`         | `/portal/app/schedule`         |
| `/portal/{token}/schedule-request` | `/portal/app/schedule-request` |
| `/portal/{token}/service-request`  | `/portal/app/service-request`  |
| `/portal/{token}/messages`         | `/portal/app/messages`         |
| `/portal/{token}/notifications`    | `/portal/app/notifications`    |
| `/portal/{token}/contacts`         | `/portal/app/contacts`         |
| `/portal/{token}/sign`             | `/portal/app/sign`             |
| `/portal/{token}/billing`          | `/portal/app/billing`          |
| `/portal/{token}/proposals`        | `/portal/app/proposals`        |
| `/portal/{token}/agreements`       | `/portal/app/agreements`       |
| `/portal/{token}/properties`       | `/portal/app/properties`       |
| `/portal/{token}/mockups`          | `/portal/app/mockups`          |
| `/portal/{token}/documents`        | `/portal/app/documents`        |
| `/portal/{token}/jobs`             | `/portal/app/jobs`             |
| `/portal/{token}/jobs/{jobId}`     | `/portal/app/jobs/{jobId}`     |
| `/portal/{token}/takedowns`        | `/portal/app/takedowns`        |
| `/portal/{token}/storage`          | `/portal/app/storage`          |
| `/portal/{token}/consultations`    | `/portal/app/consultations`    |
| `/portal/{token}/reviews`          | `/portal/app/reviews`          |
| `/portal/{token}/rebook`           | `/portal/app/rebook`           |

Implementation: `mapLegacyPortalPathToAppPath()` in `apps/web/src/lib/portal-token-entry.tsx`.

## Route classes (authorization)

| Namespace                                                          | Class                                     | Auth                                               |
| ------------------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------- |
| `/portal`, `/portal/login`, `/portal/access/*`, `/portal/invite/*` | PUBLIC_ENTRY                              | None                                               |
| `/portal/{token}/**`                                               | PUBLIC_ENTRY (shim)                       | Magic token exchanged for session; no app render   |
| `/portal/app` and `/portal/app/**`                                 | PORTAL_AUTHENTICATED / FEATURE / RESOURCE | `__portal_session` cookie (token optional in tRPC) |

`resolvePortalRouteDefinition()` treats `/portal/app/...` and legacy `/portal/{token}/...` suffixes identically for the feature matrix. `authorizePortalPath()` returns public for legacy token paths (shim phase) and requires session auth on `/portal/app/**`.

## Entry shim flow

1. User opens legacy URL `/portal/{token}/...`
2. `LegacyPortalEntryShim` POSTs `{ accessToken: token }` to `/api/portal/session`
3. On **409** (existing session for different customer): error UI — no silent account switch (S2 preserved)
4. On success: `router.replace()` to mapped `/portal/app/...` path
5. Authenticated app renders only under `/portal/app/**`

## Security headers (legacy token paths only)

Applied via `apps/web/src/app/portal/[token]/layout.tsx` metadata and `next.config.js` headers:

- `Referrer-Policy: no-referrer`
- `Cache-Control: no-store`
- `X-Robots-Tag: noindex`

Session API POST responses also set `Cache-Control: no-store`.

## File layout

| Path                                                       | Role                                          |
| ---------------------------------------------------------- | --------------------------------------------- |
| `apps/web/src/app/portal/app/**/page.tsx`                  | Thin re-exports to shared page components     |
| `apps/web/src/components/portal/pages/*.tsx`               | Session-first page bodies                     |
| `apps/web/src/app/portal/[token]/[[...segments]]/page.tsx` | Legacy entry shim (all token deep links)      |
| `apps/web/src/lib/portal-paths.ts`                         | `portalAppPath()`, `portalSessionInput`       |
| `apps/web/src/lib/portal-token-entry.tsx`                  | Mapping + `LegacyPortalEntryShim`             |
| `apps/web/src/components/portal/portal-shell.tsx`          | Tokenless nav (`/portal/app/...`)             |
| `packages/firebase/src/portal-route-access.ts`             | `/portal/app` namespace + legacy public entry |

## Out of scope (unchanged)

- Invitation `/portal/invite/{token}`
- QR `/portal/access/{token}`
- Proposal/agreement/invoice/mockup public tokens (`/p/`, `/pay/`, etc.)
- Magic-access hash generation/resolution (`portal-magic-access.ts`)

**NO DEPLOYMENT. NO PRODUCTION FIREBASE.**
