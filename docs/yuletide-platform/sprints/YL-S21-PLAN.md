# YL-S21 Plan — Automation harden

## Objective

EXTEND/HARDEN workflow automation (YL-S0 gap after S20; deferred from S14/S20): null-safe labels, `automation` module gate, stop dual/triple messaging+360 fire, fence dead Postgres automations—without production deploy or PermissionResource expansion.

## Authorization

User authorized YL-S21. Domain filled as **automation360** (undefined in baseline matrix between S20 and S22). No production deploy. YL-S17 remains skipped.

## Deliverables

1. **Null-safe automation labels** — trigger/action/run status helpers; wire AutomationHub
2. **Module + settings gates** — `requireModule('automation')` on automation360; UI create/toggle gated by `settings.edit`
3. **Stop dual-fire** — `fireAutomationTrigger` no longer always calls messaging `triggerAutomation`; callers that double-invoke cleaned
4. **Fence Postgres automations** — PRECONDITION_FAILED; prefer automation360 / messages360
5. **Unit tests** for labels, condition eval, legacy fallback predicate

## Out of Scope

- Production deploy, live REAL_EMAIL/REAL_SMS
- Full Day 1/3/7/14 cadence / OPTION A follow-up CRUD
- Expanding PermissionResource for messages/automation/reviews (still deferred)
- YL-S22 security/token harden
