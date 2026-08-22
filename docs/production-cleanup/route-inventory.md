# Route Inventory (Phase 0)

**Date:** 2026-07-30  
**Source:** `apps/web/src/app/**/page.tsx`, nav configs, mobile app.

## Summary

| Category | Count / status |
|----------|----------------|
| Total `page.tsx` | **202** |
| Redirect indexes | 7 |
| Hidden (reachable, not primary nav) | Multiple — see below |
| Placeholder | `/app/field/signs/report` + follow-up “coming soon” UI |
| Missing linked route | `/app/field` (**not implemented**) |
| Mobile Expo screens | 3 (+ layout) |

## Auth surfaces

| Prefix | Gate |
|--------|------|
| Marketing / legal / auth / public tokens / portal prefixes | Public (middleware skip list) |
| `/app/*` | `__session` + `requireAppSession` |
| `/creator/*` | Session + `isPlatformCreator` |
| Portal token pages | Public + portal token/OTP |

## Redirects

| From | To |
|------|-----|
| `/portal` | `/portal/login` |
| `/app/schedule` | `/app/schedule/dashboard` |
| `/app/mockups` | `/app/mockups/dashboard` |
| `/app/reports` | `/app/reports/dashboard` |
| `/app/messages` | `/app/messages/dashboard` |
| `/app/inventory/items` | `/app/inventory` |
| `/app/routes` | `/app/schedule/routes` (legacy stub) |

## Hidden routes

- `/app/field/signs` (+ add, pickup, report)
- `/app/customers/portal-qr`
- `/app/website` (creator-gated CMS duplicate of `/creator/website`)
- `/app/routes` (nav alias → redirect)
- `/portal/[token]/schedule-request`
- `/portal/[token]/jobs/[jobId]`
- `/creator/billing`, `/creator/audit` (aliases → operations)

## Placeholder / broken

| Route | Issue |
|-------|-------|
| `/app/field/signs/report` | Placeholder shell; links to missing `/app/field` |
| `/app/field` | Linked; **no page** |

## Primary CRM nav (`DEFAULT_CRM_NAV_ITEMS`)

See `packages/types/src/crm-ui-config.ts`. Groups: home, sales, operations, inventory, finance, marketing, administration.

Notable gap: Sign Tracker href present **without** `moduleKey: 'sign_tracker'`.

## Module section navs (secondary)

Schedule, invoices, messages, inventory, mockups, reports, sign tracker, settings — each has dedicated submenu utilities under `apps/web/src/lib/*-utils.ts` / components.

## Mobile (`apps/mobile`)

| Route | Purpose | Status |
|-------|---------|--------|
| `index` | Crew schedule home | implemented |
| `job/[id]` | Job detail | implemented |
| `(tabs)/signs` | Sign pickup | implemented |

Scope is **partial** vs full CRM.

## Dead-route gate

`npm run production:check` includes `dead-route-validation` against default nav hrefs and the known `/app/field` break.
