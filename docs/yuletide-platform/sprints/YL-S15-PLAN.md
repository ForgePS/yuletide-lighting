# YL-S15 Plan — Photos / files harden

## Objective

HARDEN photos/files (YL-S0 baseline YL-S15): staff Admin upload/proxy path+MIME+size contract, document visibility fail-closed for portal, null-safe storage labels, portal HEIC/storage-photo consistency—without production Storage deploy.

## Authorization

User authorized YL-S15. No production deploy. No production Storage/Firestore writes.

## Deliverables

1. **Staff file path + upload contract** — shared sanitize/assert helpers + MIME/size allowlist used by `/api/upload`, `/api/files`, platform upload
2. **Document visibility fail-closed** — default on create; portal denies missing/unknown visibility
3. **Null-safe storage labels** — `formatStorage*Label` in types; wire staff + portal storage UI
4. **Portal file consistency** — align HEIC validator ↔ upload; ticket `listPortalStorage` photos; stop null-URL “previewable” dead-end
5. **Unit tests** for path helpers, visibility, labels, HEIC alignment

## Out of Scope

- Production `firebase deploy --only storage` / prod Storage writes
- Storage rules `settingsRole` + lifecycle parity (BACKLOG-007)
- Signed-URL product redesign, seasonal inventory product features, mobile camera UX
- Production deploy
