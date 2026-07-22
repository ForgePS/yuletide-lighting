# Phase 0 Migration Map

Written before Phase 0 + navigation restructure. Do not delete or rename production data without a backward-compatible migration.

## Canonical data model (org-scoped)

```
organizations/{orgId}
  ├── customers/{customerId}          organizationId required
  │     ├── properties/{id}           LEGACY dual path (read/compat)
  │     ├── jobs/{id}                 LEGACY dual path (read/compat)
  │     ├── activities, designs, communications, storage…
  ├── properties/{id}                 SOURCE OF TRUTH (customerId FK)
  ├── jobs/{id}                       SOURCE OF TRUTH (customerId, propertyId?, proposalId?)
  ├── proposals/{id}                  customerId, propertyId, publicToken
  ├── invoices/{id}                   customerId, proposalId?, jobId?
  ├── contacts/{id}                   customerId?
  ├── calendarEvents, mockups, conversations, inventoryItems, …
  └── settings, roles, auditLogs, …
users/{firebaseUid}                   organizationId, role, settingsRole?, status?
```

### Relationship graph

```
Customer ──┬── Property (1:N)
           ├── Contact (1:N)
           ├── Proposal (1:N) ── Invoice / Agreement / Job
           ├── Job (1:N) ── CalendarEvent, Materials, ServiceIssue
           └── Invoice / Payment / Storage / Rebooking
```

## Dual / conflicting paths (freeze)

| Entity | Source of truth | Legacy (compat only) |
|--------|-----------------|----------------------|
| Properties | `organizations/{org}/properties` + `customerId` | `customers/{id}/properties` |
| Jobs | `organizations/{org}/jobs` (`OrgJobRecord`) | `customers/{id}/jobs` (`JobRecord`) |
| Proposals / Invoices / Contacts | Org collections with FKs | Keep |

**Write-path freeze:** New writes go through `createOrgProperty` / org-level job helpers only. Dual-write to customer subcollections is allowed for read-compat; do not invent a third store. No collection renames this sprint.

## Routes retained vs consolidated

| Keep | Notes |
|------|--------|
| `/app/*` existing modules | No new feature pages this sprint |
| `/sign-in`, `/sign-up`, public tokens (`/p/`, `/pay/`, `/portal/`) | Intentional public surfaces |
| Flat nav hrefs | Re-grouped into sections; same URLs |

| Consolidate later | Notes |
|-------------------|--------|
| Dual property/job reads | Prefer org collections in UI queries |
| Legacy role collapse | Settings roles + capability matrix become enforcement |

## Production risks (pre–Phase 0)

1. Middleware checked cookie presence only (not verified session).
2. `/app` layout was client-only; no access-denied path.
3. Suspended users not rejected in `createAuthContext`.
4. First login without user doc auto-created a new org as owner (tenant pollution).
5. `messages360.public.receiveSms` accepted caller-supplied `organizationId`.
6. Settings permission matrix unused; `read_only` mapped to write-capable `crew`.
7. Firestore rules lagged live collections; open `publicProposals`/`publicInvoices` reads; user self-write of `organizationId`/`role`.
8. Many screens treated `!data` as loading (infinite Loading… on errors).

## Fields requiring care (no destructive migration)

- `users.status` (`active` \| `suspended` \| `pending` \| `archived`) — enforce; default missing → `active` for existing docs.
- `users.settingsRole` — carry on AuthContext; do not overwrite `role` legacy field without migration.
- `organizationId` on all business records — immutable; never trust client-supplied org IDs.
- Property/job dual IDs — keep stable; dual-write with same id when bridging.

## Phase 0 follow-ups (ops — not this sprint)

- Staging vs production environment separation
- Automated backups + restore drills
- Error monitoring (e.g. Sentry) + structured logs
- HttpOnly Firebase session cookies
- Full capability middleware on every procedure
- Security-rule tests in CI against emulator

## Feature flags

Major workflow rebuilds (Customer 360 redesign, proposal acceptance automation, etc.) remain behind later phases. This sprint only hardens gates and navigation.
