# Customer Portal Phase 2 role/permission matrix

**ENVIRONMENT=EMULATOR**

The canonical, fail-closed implementation is `packages/types/src/portal-permissions.ts`. This document summarizes it; code wins if this summary drifts. Access also requires an active account, active user, and enabled feature.

| Role                 | Feature/action access                                                                                                                                                                                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `account_owner`      | All portal features; `view`, `request`, `create`, `edit`, `sign`, `pay`, `download`, `message`, `manage_users`, and `manage_contacts`                                                                                                                                                                                                          |
| `authorized_contact` | Dashboard/properties/mockups/install tracking/takedowns/storage/referrals view; consultations/scheduling/rebooking view+request; proposals/agreements/e-sign view+sign; billing view+pay+download; online payments view+pay; service requests view+create+request; messaging view+message+create; documents view+download; reviews view+create |
| `billing_contact`    | Dashboard view; billing view+pay+download; online payments view+pay; proposals/agreements/documents view+download; messaging view+message                                                                                                                                                                                                      |
| `property_contact`   | Dashboard/properties/install tracking/takedowns/storage/mockups/consultations view; scheduling view+request; service requests view+create+request; documents view+download; messaging view+message                                                                                                                                             |
| `view_only`          | Every configured portal feature: `view` and `download` only                                                                                                                                                                                                                                                                                    |

Unspecified role/feature/action combinations deny access. Unknown roles, features, and actions deny access. Suspended, archived, locked, not-invited, invitation-pending, or feature-disabled states deny as applicable.

## Phase 2 enforcement status

The resolver and coverage tests are implemented. Public `portal360` procedures still primarily trust the magic-token customer scope and do not consistently invoke this role/action resolver. Backend integration is therefore **PARTIAL**; navigation visibility is not a security boundary.

**NO DEPLOYMENT:** no production rules, data, or role assignments were changed.
