# YL-S1 Organization / User Domain

## Membership model (authoritative)

```text
users/{firebaseUid}
  organizationId  ──►  organizations/{orgId}
  status            (user lifecycle)
  role / settingsRole
```

There is **no** `memberships` collection. A user’s membership is the presence of a matching `organizationId` on their user document. Platform Creators manage multiple orgs via `/creator`, not via end-user tenant switching.

## Organization lifecycle vs subscription

| Field | Meaning |
|-------|---------|
| `lifecycleStatus` | Operating lifecycle: `active` \| `inactive` \| `suspended` \| `archived` (YL-S1). Missing ⇒ active |
| `subscriptionStatus` | Stripe/SaaS billing state (`trialing`, `active`, `locked`, …) |
| `provisioningStatus` | Creator provisioning pipeline (`pending` \| `active` \| `failed`) |

Staff app access requires:
1. Valid Firebase Auth → user doc
2. User `status` not suspended/archived/pending
3. Org exists
4. Org `lifecycleStatus` active (YL-S1)
5. Module/permission checks (later sprints) / subscription lock (settings redirect)

## Application helpers

- `@clcrm/types` — `OrganizationLifecycleStatus`, `assertSameOrganization`, `isOrganizationLifecycleActive`
- `@yuletide/firebase` — `evaluateOrganizationAccess`, `membershipFromUser`, `assertUserBelongsToOrganization`
- Wired in `apps/web/src/lib/auth.ts` → denial reason `org_inactive`

## Firestore rules

Unchanged in YL-S1. Rules still use user `status` + `belongsToOrg`. Org `lifecycleStatus` enforcement is **application-layer** this sprint; rules mirror deferred to YL-S4 if required.

## Tests

- `packages/firebase/src/organization-access.test.ts`
- `tests/integration/tenants/organization-domain.integration.test.ts`
- Existing auth session + tenant isolation suites remain authoritative for inactive user + cross-org
