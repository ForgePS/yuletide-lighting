# Portal Phase 2 S7B — URL Security

**ENVIRONMENT:** EMULATOR  
**DATE:** 2026-08-03  
**S7A CHECKPOINT SHA:** `472c2479066a9591974588297059e7aec59f1b2e`

## Verified configuration (code + E2E)

| Surface                 | Cache-Control                 | Referrer-Policy        | X-Robots-Tag / robots                           |
| ----------------------- | ----------------------------- | ---------------------- | ----------------------------------------------- |
| `/portal/:token`        | `no-store` (`next.config.js`) | `no-referrer`          | `noindex`                                       |
| `/portal/:token/:path*` | `no-store`                    | `no-referrer`          | `noindex`                                       |
| Session API POST/DELETE | `no-store` (route headers)    | N/A (API)              | N/A                                             |
| `/portal/app/*`         | App defaults                  | Not credential-bearing | Should not be public SEO content; authenticated |

Source: `apps/web/next.config.js` `legacyPortalEntryHeaders`; `apps/web/src/app/api/portal/session/route.ts`; token layout robots metadata.

## Playwright evidence

`e2e/portal-phase2-s7-token-hardening.spec.ts` asserts session API responses include `Cache-Control: no-store`.

Headers on HTML entry routes are applied via Next config (not invented — inspect `next.config.js`).

## Search-engine protection

Token entry routes: `X-Robots-Tag: noindex`. Authenticated `/portal/app/*` is session-gated and is not a public marketing surface. Public marketing SEO is untouched.
