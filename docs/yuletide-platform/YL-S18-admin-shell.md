# YL-S18 — Admin shell / nav

## Problem

`resolvedNav` required `settings.view`, so most roles never received filtered nav and the shell fell back to unfiltered `DEFAULT_CRM_NAV_ITEMS` (fail-open on modules/permissions). Agreements lacked a module gate; sign-tracker had no icon; `labelOverrides` were saved but unused.

## Changes

- `resolvedNav` for all authenticated staff; shell fail-closed (empty nav on load/error)
- Agreements → `proposals` module; settings → `settings` permission; sign-tracker icon
- `nav.*` label overrides + null-safe label helpers

## Verification

Unit suite **294/294**. Full Sneat zip remains BACKLOG-001. No production deploy.
