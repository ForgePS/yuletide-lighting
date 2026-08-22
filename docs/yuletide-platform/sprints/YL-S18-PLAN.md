# YL-S18 Plan — Admin shell / nav harden

## Objective

EXTEND/HARDEN admin shell / nav (YL-S0 baseline YL-S18): fail-closed resolved nav for all org roles, nav registry consistency, null-safe labels, labelOverrides fence/wire—without production deploy and without full Sneat zip (BACKLOG-001).

## Authorization

User authorized YL-S18. No production deploy. YL-S17 (rebooking) remains unauthorized/skipped.

## Deliverables

1. **Fail-closed staff nav** — `resolvedNav` available to any authenticated org member; shell never falls back to unfiltered `DEFAULT_CRM_NAV_ITEMS`
2. **Nav registry consistency** — agreements `moduleKey`; sign-tracker icon; null-safe nav labels; safe section grouping
3. **`labelOverrides`** — apply in shell or hide dead settings UX
4. **Unit tests** for `resolveCrmNavItems` matrix (modules, permissions, labels)

## Out of Scope

- Full Sneat zip integration (BACKLOG-001)
- Production deploy
- Expanding PermissionResource for messages/automation/reviews
- Wiring `requireModule` across all 360 routers
- Portal/mobile shells, creator CMS chrome
