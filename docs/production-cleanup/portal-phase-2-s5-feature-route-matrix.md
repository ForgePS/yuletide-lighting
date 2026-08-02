# Portal Phase 2 S5 — Feature ↔ Route Matrix

**ENVIRONMENT:** EMULATOR  
**Canonical keys:** `packages/types/src/portal.ts`, `PORTAL_ROUTE_DEFINITIONS`

| PortalFeatureKey   | UI nav key                          | Route segment(s)                | Action(s)                              | Nav visibility                                                           |
| ------------------ | ----------------------------------- | ------------------------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| `dashboard`        | `home`, `notifications`, `contacts` | ``, `notifications`, `contacts` | `view`                                 | Always (home/account); notifications/contacts ungated in nav             |
| `scheduling`       | `schedule`                          | `schedule`, `schedule-request`  | `view`, `request`                      | Hidden when disabled; schedule tab also shown if `consultations` enabled |
| `service_requests` | `service`                           | `service-request`               | `view` (+ `create` on API for uploads) | Hidden when disabled                                                     |
| `messaging`        | `messages`                          | `messages`                      | `view`                                 | Hidden when disabled                                                     |
| `e_sign`           | `sign`                              | `sign`                          | `view`                                 | Hidden when disabled                                                     |
| `billing`          | `billing`                           | `billing`                       | `view`                                 | Hidden when disabled                                                     |
| `proposals`        | `proposals`                         | `proposals`                     | `view`                                 | Hidden when disabled                                                     |
| `agreements`       | `agreements`                        | `agreements`                    | `view`                                 | Hidden when disabled                                                     |
| `properties`       | `properties`                        | `properties`                    | `view`                                 | Hidden when disabled                                                     |
| `mockups`          | `mockups`                           | `mockups`                       | `view`                                 | Hidden when disabled                                                     |
| `documents`        | `documents`                         | `documents`                     | `view`                                 | Hidden when disabled                                                     |
| `install_tracking` | `jobs`                              | `jobs`, `jobs/[jobId]`          | `view`                                 | Hidden when disabled                                                     |
| `takedowns`        | `takedowns`                         | `takedowns`                     | `view`                                 | Hidden when disabled                                                     |
| `storage`          | `storage`                           | `storage`                       | `view`                                 | Hidden when disabled                                                     |
| `consultations`    | `consultations`                     | `consultations`                 | `view`                                 | Hidden when disabled; also enables schedule nav slot                     |
| `reviews`          | `reviews`                           | `reviews`                       | `view`                                 | Hidden when disabled                                                     |
| `rebooking`        | `rebook`                            | `rebook`                        | `view`                                 | Hidden when disabled                                                     |

## Keys without dedicated S5 route segment

These feature keys exist in the type system but are not mapped to a standalone portal page in `PORTAL_ROUTE_DEFINITIONS`:

| Key               | Treatment                                                                         |
| ----------------- | --------------------------------------------------------------------------------- |
| `online_payments` | Billing/payment flows use billing feature and separate public pay tokens (`/pay`) |
| `referrals`       | No Phase 2 portal route; future feature                                           |

## Enforcement layers

1. **Nav:** `portal-shell.tsx` filters `NAV` by `enabledFeatures`.
2. **Route frame:** `PortalAuthedFrame` shows fallback when `feature` prop not in `enabledFeatures` (no-flash after dashboard load).
3. **API:** `requirePortalAuthorized` / `requirePortalRouteAccess` on tRPC and file ticket issuance.
