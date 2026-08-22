# YL-S15 Complete — Photos / files harden

**STATUS:** COMPLETE  
**VERDICT:** PASS  
**Date:** 2026-08-13  

## Scope completed

1. **Staff upload/proxy contract** — `sanitizeStorageFolder`, `assertSafeOrgStoragePath`, MIME/size allowlist on `/api/upload`, `/api/files`, platform upload + `uploadFile`/`uploadPlatformFile`
2. **Document visibility fail-closed** — create always persists visibility; portal lists only explicit `customer_visible`
3. **Null-safe storage labels** — `formatStorage*Label` on staff dashboard/detail/pull-sheet + portal storage conditions
4. **Portal file consistency** — HEIC/HEIF aligned validator↔upload; ticketed `listPortalStorage` photos; external HTTPS no longer previewable-null
5. **Unit tests** — path helpers, upload contract, visibility, labels, HEIC

## Verification

| Check | Result |
|-------|--------|
| Unit `npm test` | **PASS** 284/284 |
| Production Storage deploy | **NONE** |
| Production Firestore writes | **NONE** |

## Deferred

- Production `firebase deploy --only storage`
- Storage rules `settingsRole` + lifecycle parity (BACKLOG-007)
- Signed-URL product redesign, seasonal inventory product features

## Next sprint

**NOT AUTHORIZED.**
