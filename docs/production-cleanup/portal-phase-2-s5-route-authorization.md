# Portal Phase 2 S5 — Route Authorization

**ENVIRONMENT:** EMULATOR  
**Module:** `packages/firebase/src/portal-route-access.ts`

## API surface

### `requirePortalRouteAccess(args)`

Authoritative server gate composing P2-S1 (`requirePortalAuthorized`), P2-S2 session/token resolution, and P2-S4 ownership (`requirePortalOwnedRecord`).

**Input:**

| Field      | Type                        | Default     | Notes                                 |
| ---------- | --------------------------- | ----------- | ------------------------------------- |
| `auth`     | `string \| PortalAuthInput` | required    | Magic token or session-backed input   |
| `feature`  | `PortalFeatureKey`          | `dashboard` | Feature entitlement check             |
| `action`   | `PortalAction`              | `view`      | Role × feature matrix                 |
| `resource` | `{ type, id }`              | optional    | Triggers ownership fetch + validation |

**Output:** `PortalRouteAccess`

```ts
{ allowed: true; authorized: PortalAuthorizedContext }
| { allowed: false; reason: PortalRouteDenialReason; publicMessage: string }
```

### `authorizePortalPath(args)`

Maps a Next.js pathname to `PORTAL_ROUTE_DEFINITIONS`, then delegates to `requirePortalRouteAccess`. Public entry paths return `{ allowed: true, public: true }`.

### `resolvePortalRouteDefinition(pathname)`

Pure resolver; returns `null` for public entry and unknown segments.

## Denial reasons

| Reason               | Typical cause                                               | Public message                       |
| -------------------- | ----------------------------------------------------------- | ------------------------------------ |
| `AUTH_REQUIRED`      | Missing/invalid token or session                            | Session expired; verify access again |
| `SESSION_EXPIRED`    | (mapped via auth failure)                                   | Same as auth required                |
| `PORTAL_UNAVAILABLE` | `PortalAccessDeniedError` — suspended/revoked account       | Generic access unavailable           |
| `FEATURE_DISABLED`   | `PortalFeatureNotEnabledError`                              | Section not available                |
| `ACTION_DENIED`      | `PortalActionNotPermittedError` — role matrix               | Section not available                |
| `RESOURCE_NOT_FOUND` | Unknown route segment or cross-customer/cross-tenant record | Item could not be found              |

Internal reason codes are **never** returned to the client UI; only `publicMessage` strings from `PORTAL_PUBLIC_MESSAGES` or route-specific copy.

## Resource types (ownership)

Supported `resource.type` values in `requirePortalRouteAccess`:

| type        | Collection            |
| ----------- | --------------------- |
| `job`       | `jobs`                |
| `document`  | `customerDocuments`   |
| `invoice`   | `invoices`            |
| `proposal`  | `proposals`           |
| `agreement` | `multiYearAgreements` |
| `property`  | `properties`          |

Unknown types fail closed with `RESOURCE_NOT_FOUND`.

## No-flash policy

- **Nav hiding is not security.** Disabled features are omitted from `NAV`, but deep links must still be denied server-side.
- **UI:** `PortalAuthedFrame` waits for dashboard query before rendering feature content; disabled features show `PortalFeatureFallback` inside the shell (nav may still render) rather than exposing protected data.
- **API/tRPC:** All mutations and sensitive reads must call `requirePortalAuthorized` or `requirePortalRouteAccess`; nav state is never trusted.

## Nav vs security

| Layer                      | Purpose                        | Fail mode                                   |
| -------------------------- | ------------------------------ | ------------------------------------------- |
| Nav filter                 | UX — hide unavailable sections | Cosmetic only                               |
| `PortalAuthedFrame`        | Prevent flash of feature UI    | Client-side; backed by server on data fetch |
| `requirePortalRouteAccess` | Authoritative gate             | Fail closed                                 |
| File tickets               | Short-lived binary access      | Fail closed; no raw Storage paths           |
