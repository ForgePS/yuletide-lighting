# YL-S18 Complete — Admin shell / nav harden

**STATUS:** COMPLETE  
**VERDICT:** PASS  
**Date:** 2026-08-13  

## Scope completed

1. **Fail-closed staff nav** — `resolvedNav` is `protectedProcedure` (any org staff); shell never falls back to unfiltered `DEFAULT_CRM_NAV_ITEMS`
2. **Nav registry consistency** — agreements `moduleKey: proposals`; settings permission-gated; sign-tracker icon; null-safe labels; safe section grouping
3. **`labelOverrides` wired** — `nav.{key}` applied in `resolveCrmNavItems`; settings copy documents the convention
4. **Unit tests** — module fail-closed, permission filter, agreements gate, label overrides, section grouping

## Verification

| Check | Result |
|-------|--------|
| Unit `npm test` | **PASS** 294/294 |
| Production deploy | **NONE** |

## Deferred

- Full Sneat zip integration (**YL-BACKLOG-001**)
- YL-S17 renewals/rebooking (skipped; not authorized)
- Expanding PermissionResource for messages/automation/reviews
- `requireModule` across all 360 routers

## Next sprint

**NOT AUTHORIZED.**
