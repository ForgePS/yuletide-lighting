# Portal Phase 2 S5 — File Security

**ENVIRONMENT:** EMULATOR  
**Module:** `packages/firebase/src/portal-file-access.ts`  
**API:** `GET /api/portal/files`

## Ticket lifecycle

1. Authorized portal context resolves via `requirePortalAuthorized`.
2. Optional parent record ownership verified (`requirePortalOwnedRecord`).
3. Storage path resolved from legacy URL or path via `resolvePortalStoragePath` (org-scoped only).
4. Path safety checked: `assertSafePortalStoragePath` — no `..`, `%2e`, wrong customer segment under `portal-service/`.
5. Signed ticket encoded (base64url payload + HMAC); TTL from `portalSecurity.fileAccessTtlMinutes`.

**Default TTL:** 15 minutes (`fileAccessTtlMinutes: 15` in `portal-security-config.ts`; clamped 1–60).

## Ticket payload (v1)

Bound fields: `organizationId`, `customerId`, `portalAccountId`, `portalUserId`, `storagePath`, `fileId`, `name`, `contentType`, `visibility`, `iat`, `exp`.

Verification (`verifyPortalFileTicket`):

- Signature timing-safe compare
- `visibility === 'customer_visible'`
- `storagePath` starts with `organizations/`
- Not expired

## DTO allowlist

Only `PublicPortalFileDto` fields are returned to portal clients. Raw Storage paths, staff proxy URLs, and internal visibility records are stripped or denied.

Denied path returns same shape with `canPreview: false`, `canDownload: false`, `accessUrl: null` — no error detail leakage.

## Streaming endpoint

`/api/portal/files`:

- Accepts `ticket` query param only (minimum length 16)
- Optional `disposition=attachment` for download vs inline preview
- Filename sanitized on response
- **Cache-Control:** `private, no-store`
- Errors: generic `404` with `PORTAL_RESOURCE_NOT_FOUND`

## Secret material

Ticket signing uses `PORTAL_FILE_TICKET_SECRET` or falls back to `PORTAL_SESSION_SECRET`; emulator default is non-production placeholder.

## Client Storage prohibition

Portal customers must not receive Firebase Storage SDK credentials or permanent signed URLs. Staff authenticated users retain org-scoped read under `storage.rules`.
