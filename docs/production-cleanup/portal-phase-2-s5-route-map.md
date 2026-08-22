# Portal Phase 2 S5 — Route Map

**ENVIRONMENT:** EMULATOR  
**Source:** `packages/firebase/src/portal-route-access.ts`, `apps/web/src/app/portal/**`

## Classification legend

| Class                       | Meaning                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| `PUBLIC_ENTRY`              | No portal session required; entry, login, access, or invite flows             |
| `PORTAL_AUTHENTICATED`      | Valid portal token/session required; no feature gate beyond dashboard/account |
| `PORTAL_FEATURE_PROTECTED`  | Session + enabled feature + permitted action                                  |
| `PORTAL_RESOURCE_PROTECTED` | Feature gate + owned record validation                                        |

## Public entry routes

| Path                     | Class          | Notes                          |
| ------------------------ | -------------- | ------------------------------ |
| `/portal`                | `PUBLIC_ENTRY` | Portal landing                 |
| `/portal/login`          | `PUBLIC_ENTRY` | OTP / access request           |
| `/portal/access/[token]` | `PUBLIC_ENTRY` | Magic-link / QR access handoff |
| `/portal/invite/[token]` | `PUBLIC_ENTRY` | Invitation claim (S3)          |

## Authenticated portal routes (`/portal/[token]/…`)

| Segment            | Class                       | Feature            | Action                   |
| ------------------ | --------------------------- | ------------------ | ------------------------ |
| `` (home)          | `PORTAL_AUTHENTICATED`      | `dashboard`        | `view`                   |
| `notifications`    | `PORTAL_AUTHENTICATED`      | `dashboard`        | `view`                   |
| `contacts`         | `PORTAL_AUTHENTICATED`      | `dashboard`        | `view`                   |
| `schedule`         | `PORTAL_FEATURE_PROTECTED`  | `scheduling`       | `view`                   |
| `schedule-request` | `PORTAL_FEATURE_PROTECTED`  | `scheduling`       | `request`                |
| `service-request`  | `PORTAL_FEATURE_PROTECTED`  | `service_requests` | `view`                   |
| `messages`         | `PORTAL_FEATURE_PROTECTED`  | `messaging`        | `view`                   |
| `sign`             | `PORTAL_FEATURE_PROTECTED`  | `e_sign`           | `view`                   |
| `billing`          | `PORTAL_FEATURE_PROTECTED`  | `billing`          | `view`                   |
| `proposals`        | `PORTAL_FEATURE_PROTECTED`  | `proposals`        | `view`                   |
| `agreements`       | `PORTAL_FEATURE_PROTECTED`  | `agreements`       | `view`                   |
| `properties`       | `PORTAL_FEATURE_PROTECTED`  | `properties`       | `view`                   |
| `mockups`          | `PORTAL_FEATURE_PROTECTED`  | `mockups`          | `view`                   |
| `documents`        | `PORTAL_FEATURE_PROTECTED`  | `documents`        | `view`                   |
| `jobs`             | `PORTAL_FEATURE_PROTECTED`  | `install_tracking` | `view`                   |
| `jobs/[jobId]`     | `PORTAL_RESOURCE_PROTECTED` | `install_tracking` | `view` (resource: `job`) |
| `takedowns`        | `PORTAL_FEATURE_PROTECTED`  | `takedowns`        | `view`                   |
| `storage`          | `PORTAL_FEATURE_PROTECTED`  | `storage`          | `view`                   |
| `consultations`    | `PORTAL_FEATURE_PROTECTED`  | `consultations`    | `view`                   |
| `reviews`          | `PORTAL_FEATURE_PROTECTED`  | `reviews`          | `view`                   |
| `rebook`           | `PORTAL_FEATURE_PROTECTED`  | `rebooking`        | `view`                   |

## API routes (portal)

| Path                                | Class                    | Notes                                             |
| ----------------------------------- | ------------------------ | ------------------------------------------------- |
| `POST /api/portal/session`          | `PUBLIC_ENTRY` → session | Establishes `__portal_session` after valid access |
| `POST /api/portal/claim-invitation` | `PUBLIC_ENTRY`           | S3 invitation claim                               |
| `GET /api/portal/files?ticket=`     | Ticket-only              | No path parameter; ticket verified server-side    |

## Fail-closed behavior

- Unknown segments under `/portal/[token]/…` resolve to `null` in `resolvePortalRouteDefinition` and deny via `authorizePortalPath`.
- Public entry paths never call `requirePortalRouteAccess`.
