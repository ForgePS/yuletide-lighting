# Portal Phase 2 S7B — Browser Secret Audit

**ENVIRONMENT:** EMULATOR  
**DATE:** 2026-08-03  
**S7A CHECKPOINT SHA:** `472c2479066a9591974588297059e7aec59f1b2e`

| Store                     | Classification             | Notes                                                                                                         |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| localStorage              | NO PERSISTENCE             | Static audit fails on `localStorage.*(token)` in portal UI                                                    |
| sessionStorage            | NO PERSISTENCE             | Same                                                                                                          |
| IndexedDB                 | NOT APPLICABLE             | No portal IndexedDB usage found for magic tokens                                                              |
| Service worker cache      | NOT APPLICABLE             | No portal SW credential cache found                                                                           |
| React / client state      | TRANSIENT IN-MEMORY ONLY   | Entry shim holds token from route params only during exchange, then `router.replace`                          |
| Persisted Zustand/RQ      | NOT APPLICABLE             | No persistence of magic token located                                                                         |
| `__portal_session` cookie | HttpOnly session (allowed) | Not the raw magic token                                                                                       |
| Browser history           | Minimized                  | `router.replace` after exchange; prior history entries may still show clicked URL (browser-native limitation) |

## Findings

- PortalShell uses `portalAppPath` — no `/portal/${token}` reconstruction.
- Authenticated navigation is tokenless.
- Raw magic token must not appear in final authenticated URL (integration proves destination mapping; Playwright seeded exchange optional via `PORTAL_S7_E2E_TOKEN`).
