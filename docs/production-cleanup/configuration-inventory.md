# Configuration Inventory (Phase 0)

**Date:** 2026-07-30

## Hierarchy today (actual vs desired)

Desired directive hierarchy: Platform → Subscription/modules → Tenant → Location → User.

**Current state (partial):**

| Layer | Exists? | Notes |
|-------|---------|-------|
| Platform defaults | Yes | `DEFAULT_PLATFORM_SETTINGS`, Creator console |
| Module entitlements | Yes | Org `enabledModules`; nav-gated; sparse API |
| Tenant settings docs | Yes | `organizations/{org}/settings/{section}` via settings360 |
| Location overrides | Partial | Locations/warehouses settings exist; not a full override cascade |
| User preferences | Partial | Limited (e.g. UI); no unified preference store |

**Gap:** No single typed configuration registry with precedence resolution, versioning, import/export, or validated workflow-state definitions as specified in Phase 2 of the directive.

## Tenant settings sections (settings360)

Stored under `organizations/{orgId}/settings/{section}`:

`company`, `branding`, `notifications`, `automation`, `proposals`, `agreements`, `invoices`, `jobs`, `season`, `inventory`, `portal`, `integrations`, `ai`, `security`, `system`, `reports`

Plus collections: `roles`, `userInvites`, `featureFlags`, `auditLogs`, `backups`.

## Settings UI (`apps/web` settings nav)

28 destinations including company, locations, warehouses, vendors, numbering, audit, users, roles, branding, ui, templates, agreements, season, notifications, automation, proposals, invoices, jobs, inventory, customer-portal, portal-qr, integrations, import, subscription, ai, security, reports, system.

## Defaults in code (`packages/types`)

| Constant | Purpose |
|----------|---------|
| `DEFAULT_CRM_NAV_ITEMS` / `DEFAULT_CRM_UI_CONFIG` | Navigation & UI |
| `DEFAULT_FEATURE_FLAGS` | Feature flags |
| `DEFAULT_INTEGRATIONS` | Integration catalog (mostly stubs) |
| `DEFAULT_AUTOMATION_RULES` | Automation timing defaults |
| `SYSTEM_ROLES` / permission matrices | Role templates |
| `DEFAULT_PORTAL_FEATURES` / `PHASE1_ACTIVE_PORTAL_FEATURES` | Portal |
| `DEFAULT_PLATFORM_SETTINGS` | Creator platform |
| Domain enums/status unions | Workflow keys (labels often hardcoded in UI) |

## Duplication / fragmentation

- Legacy `role` + `settingsRole` on users
- Settings branding vs Website CMS globals
- Message templates in messages360 vs settings automation
- Integration toggles in settings vs real env-driven Stripe/Twilio/Resend
- Feature flags stored but weakly enforced at runtime

## Missing for Phase 2

- Unified `ConfigurableDefinition` / `WorkflowStateDefinition` registry
- Precedence engine with fail-closed defaults
- Config mutation validation (transitions, keys, deps)
- Config version history + rollback
- Secret-safe import/export
- Location-level override cascade
- Separation of stub integrations from production registry
