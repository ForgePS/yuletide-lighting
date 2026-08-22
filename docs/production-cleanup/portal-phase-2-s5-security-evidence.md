# Portal Phase 2 S5 — Security Evidence

**STATUS:** COMPLETE  
**ENVIRONMENT:** EMULATOR  
**DATE:** 2026-08-01  
**BRANCH:** `production/yuletide-cleanup-launch-readiness`  
**HEAD SHA:** `c0cae35a23f96cf3dc08c6f98842c04777775853`  
**Production writes / deploys:** NONE

## Implementation evidence checklist

- [x] Route definitions and resolver: `packages/firebase/src/portal-route-access.ts`
- [x] `requirePortalRouteAccess` / `authorizePortalPath` composing S1+S2+S4
- [x] File ticket issuer/verifier: `packages/firebase/src/portal-file-access.ts`
- [x] Ticket streaming API: `apps/web/src/app/api/portal/files/route.ts`
- [x] Security config: `fileAccessTtlMinutes` (15), `maxUploadBytes` (4.5 MB)
- [x] Ticket integration: `listPortalDocuments`, `listPortalAgreements`, `uploadPortalPhoto`
- [x] Static audit: `scripts/audit-portal-routes.mjs`
- [x] Static audit: `scripts/audit-portal-files.mjs`
- [ ] Legacy magic-token hash migration — deliberately deferred (unchanged)

## Test evidence

| Gate                                 | Result                                |
| ------------------------------------ | ------------------------------------- |
| `npm run format:changed:check`       | PASS                                  |
| `npm run lint`                       | PASS (warnings)                       |
| `npm run typecheck`                  | PASS                                  |
| `npm test`                           | PASS — 195                            |
| Portal S5 integration (emulator)     | PASS — 54                             |
| Prior portal integration (S1–S4)     | PASS — 303                            |
| `npm run test:firebase-rules`        | PASS — 18                             |
| `npm run audit:portal-routes`        | PASS                                  |
| `npm run audit:portal-files`         | PASS                                  |
| `npm run audit:portal-permissions`   | PASS                                  |
| `npm run audit:portal-sessions`      | PASS                                  |
| `npm run audit:portal-auth-security` | PASS                                  |
| `npm run audit:portal-query-scope`   | PASS                                  |
| `npm run audit:portal-public-dtos`   | PASS (after `mapPortalMockup` rename) |
| Playwright portal emulator E2E       | SKIPPED — no local server             |
| `npm run build`                      | PASS                                  |
| `npm run production:check` (3×)      | PASS / PASS / PASS                    |

Reviewer: gate automation — ENVIRONMENT=EMULATOR

## Security assertions (expected)

- Unknown portal route segments deny without data leakage.
- Disabled features denied at API regardless of nav visibility.
- File tickets bind org, customer, portal user, and storage path; expire at 15 minutes.
- Portal file responses use `Cache-Control: private, no-store`.
- No permanent Storage URLs in public portal DTOs.
