# Portal Phase 2 S5 — File Map

**ENVIRONMENT:** EMULATOR  
**Ticket issuer:** `createPortalFileAccess` in `portal-file-access.ts`

## Customer-visible file types

| Category               | Source procedure       | Storage path pattern                                  | DTO field                             | Ticketed                     |
| ---------------------- | ---------------------- | ----------------------------------------------------- | ------------------------------------- | ---------------------------- |
| Customer documents     | `listPortalDocuments`  | `organizations/{orgId}/…` via document URL/path       | `url` → ticket URL                    | Yes                          |
| Signed agreements      | `listPortalAgreements` | `signedDocumentUrl` under org scope                   | `signedDocumentUrl` → ticket URL      | Yes                          |
| Service request photos | `uploadPortalPhoto`    | `organizations/{orgId}/portal-service/{customerId}/…` | `url` in upload response              | Yes                          |
| External HTTPS assets  | Various                | Non-Storage HTTPS (not `/api/files`)                  | `canPreview: true`, `accessUrl: null` | No ticket; preview-only flag |

## Visibility classification

| Value              | Portal exposure                                             |
| ------------------ | ----------------------------------------------------------- |
| `customer_visible` | Eligible for ticket after ownership checks                  |
| `staff_only`       | Denied — `canPreview`/`canDownload` false, `accessUrl` null |
| `internal`         | Denied                                                      |
| `system`           | Denied                                                      |

## Public DTO shape

`PublicPortalFileDto` (allowlisted):

- `id`, `name`, `contentType`, `size?`, `category?`, `createdAt?`
- `canPreview`, `canDownload`
- `accessUrl` — `/api/portal/files?ticket=…` only; never raw bucket path or staff `/api/files?path=`

## Not ticketed in S5

| Surface                                      | Reason                                          |
| -------------------------------------------- | ----------------------------------------------- |
| Storage inventory list (`listPortalStorage`) | Metadata-only DTO; no binary URLs in list       |
| Mockup/proposal preview images               | May use external HTTPS or future ticket cutover |
| Public pay/signing tokens (`/pay`, `/p`)     | Separate public-token authority (S4 documented) |

## Upload limits

- `portalSecurity.maxUploadBytes` default **4,500,000** (clamped 64 KB – 12 MB)
- Portal photo upload: JPEG, PNG, WebP only; enforced in `uploadPortalPhoto`
