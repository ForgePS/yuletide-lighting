# Portal Phase 2 S5 test plan

**ENVIRONMENT=EMULATOR. NO DEPLOYMENT. NO PRODUCTION WRITES.**

## Static audits

1. Run `audit-portal-routes.mjs` — every `apps/web/src/app/portal/[token]/**/page.tsx` segment maps to `PORTAL_ROUTE_DEFINITIONS`; unknown segments flagged.
2. Run `audit-portal-files.mjs` — portal list/upload procedures emit ticket URLs only; no raw Storage paths or staff `/api/files` in public DTOs.
3. Confirm both audits wired into `production:check` after merge.

## Unit / integration (emulator)

Add or extend suites covering:

| Area                       | Cases                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Route resolver             | Public entry passthrough; each canonical segment; unknown segment deny              |
| `requirePortalRouteAccess` | Feature disabled; action denied; auth required; job ownership cross-customer deny   |
| `authorizePortalPath`      | Pathname → definition → access result                                               |
| File tickets               | Issue, verify, expire, tamper signature, wrong org path, staff_only visibility deny |
| `readPortalFileFromTicket` | Valid ticket streams; expired/invalid returns null                                  |
| Upload limit               | `maxUploadBytes` enforcement on `uploadPortalPhoto`                                 |
| DTO shape                  | `PublicPortalFileDto` fields only; no path leakage                                  |

## API route

- `GET /api/portal/files?ticket=` returns 404 for missing/short/invalid/expired tickets.
- Response headers include `Cache-Control: private, no-store`.
- `disposition=attachment` sets download disposition with sanitized filename.

## UI / nav (manual or E2E)

- Disabled feature hidden from nav; direct URL shows fallback without data flash.
- Document/agreement download links use ticket URL pattern.
- Ticket URL cannot be rewritten to another org path.

## Regression

- Re-run S1–S4 portal integration suites (permissions, sessions, query scope, DTO audits).
- Firestore rules tests unchanged (15 cases baseline).

## Gate recording

Leave completion command results **TBD** until checkpoint runner captures format, lint, typecheck, unit, integration, rules, E2E, build, and `production:check` ×3.
