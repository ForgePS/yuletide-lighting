# Production organization module migration review (sanitized)

| Field                | Value                                                 |
| -------------------- | ----------------------------------------------------- |
| **Date**             | 2026-07-31                                            |
| **Branch**           | `production/yuletide-cleanup-launch-readiness`        |
| **Source audit**     | `production-organization-module-audit.md` (read-only) |
| **Writes performed** | **0**                                                 |
| **`--apply` run**    | **No**                                                |

## Scope and restrictions

- Review only. No production writes. No `--allow-production-apply`.
- Organization display names and customer data omitted.
- Anonymous IDs: `ORG-001`, `ORG-002`.
- Empty staging is **not** evidence that production migration is safe.

## Summary

| Metric                              | Count |
| ----------------------------------- | ----: |
| Organizations reviewed              |     2 |
| Automatically safe (with caveats)   |   1\* |
| Manual review required              |     1 |
| Blocked (unknown/unverifiable plan) |     0 |
| Writes performed                    |     0 |

\*Automatically safe means the dry-run patch is mechanical (stamp schema/tier or apply preset) **if** trusted billing/config data confirms the plan. Neither org has been applied.

---

## ORG-001 — missing modules

| Field                        | Value                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Anonymous ID                 | ORG-001                                                                                                             |
| Production doc ID (ops only) | `bdyeQorlWRWNU00fVpuN`                                                                                              |
| Current subscription tier    | missing / null                                                                                                      |
| Current subscription status  | null / unset                                                                                                        |
| Current enabledModules       | **missing**                                                                                                         |
| Current schema version       | missing                                                                                                             |
| Custom entitlements observed | No evidence of custom `enabledModules` list                                                                         |
| Proposed module preset       | Infer from trusted billing/plan when available; otherwise **block until plan proven**                               |
| Explicit disabled modules    | none recorded                                                                                                       |
| Proposed fields changed      | `enabledModules`, `subscriptionTier`, `configurationSchemaVersion`, possibly `subscriptionStatus`                   |
| Expected write count         | 1 organization document update (+ optional audit log)                                                               |
| Automatic migration safety   | **Conditional** — safe only after plan is proven from Stripe/subscription records or creator config                 |
| Manual review requirement    | **Yes** — status/tier unknown; do not invent a plan                                                                 |
| Rollback record requirements | Pre-image JSON of org doc; migration identity; timestamp; actor                                                     |
| Recommended action           | **HOLD** until billing/config proves tier; then dry-run scoped `--organization=` and human approve before any apply |

**Classification:** One organization **missing modules**.

---

## ORG-002 — schema / tier stamp

| Field                        | Value                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Anonymous ID                 | ORG-002                                                                                                                           |
| Production doc ID (ops only) | `uxPSUKdvZyX8A5LgZo8C`                                                                                                            |
| Current subscription tier    | missing (has modules already)                                                                                                     |
| Current subscription status  | `trialing`                                                                                                                        |
| Current enabledModules       | 18 keys present                                                                                                                   |
| Current schema version       | missing                                                                                                                           |
| Custom entitlements observed | Possible — existing non-empty `enabledModules` should be **preserved**, not overwritten by preset                                 |
| Proposed module preset       | Preserve current modules; stamp `configurationSchemaVersion=1` and infer/stamp `subscriptionTier` (likely `trial` while trialing) |
| Explicit disabled modules    | none flagged in audit                                                                                                             |
| Proposed fields changed      | `configurationSchemaVersion`, `subscriptionTier` (modules unchanged)                                                              |
| Expected write count         | 1 organization document update                                                                                                    |
| Automatic migration safety   | **Higher** if migration preserves existing modules and only stamps metadata                                                       |
| Manual review requirement    | Spot-check that preserved modules match intended entitlements                                                                     |
| Rollback record requirements | Pre-image JSON; confirm modules array unchanged after apply                                                                       |
| Recommended action           | Dry-run first; apply only under separate production authorization with rollback artifact                                          |

**Classification:** One organization **requiring schema/tier stamping** (modules already present).

---

## Distinctions required by P0.2C

| Question                                                 | Answer                                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| One org missing modules?                                 | Yes — ORG-001                                                                         |
| One org requiring schema/tier stamp?                     | Yes — ORG-002                                                                         |
| Either has custom entitlements?                          | ORG-002 may effectively be custom via preserved modules; ORG-001 has none to preserve |
| Can proposed plan be proven from trusted billing/config? | **Not verified in this review** — treat ORG-001 as blocked until proven               |
| Unknown/unverifiable plans                               | Remain blocked                                                                        |

## Recommended next gate (not authorized here)

1. Export sanitized dry-run patches for ORG-001/ORG-002.
2. Prove ORG-001 plan from Stripe/customer subscription or creator notes.
3. Human approval checklist + rollback files.
4. Separate authorization for `--apply --allow-production-apply`.
