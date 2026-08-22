# Portal Phase 2 S5 — Storage Rules

**ENVIRONMENT:** EMULATOR  
**Rules deploy:** NO  
**File:** `storage.rules`

## Architecture (S5)

Portal customer file access is **server-ticket based**, not client Storage SDK:

1. Portal list/upload procedures call `createPortalFileAccess` after auth + ownership checks.
2. Client receives `/api/portal/files?ticket=…` (15-minute TTL).
3. Next.js route streams bytes via `readPortalFileFromTicket` using server Admin SDK (`readStorageFile`).

Direct browser reads from Firebase Storage are **not** part of the portal customer threat model.

## Current rules (unchanged in S5)

```
organizations/{orgId}/{allPaths=**}
  read:  signed-in staff where userOrgId() == orgId
  write: signed-in staff in org, size/contentType limits

public/{allPaths=**}
  read:  true
  write: false
```

## Implications

| Actor                           | Storage access                                     |
| ------------------------------- | -------------------------------------------------- |
| Portal customer (token/session) | Denied at rules layer; allowed only via ticket API |
| Staff org user                  | Read/write under org prefix per existing rules     |
| Anonymous                       | Public bucket read only                            |

## S5 decision

**No Storage rules changes** are required or authorized for S5. Ticket streaming uses privileged server credentials, not relaxed customer rules.

Future S6 may add explicit denial tests for portal security metadata paths; that is out of S5 scope.
