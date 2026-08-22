# Sneat theme integration (YL-BACKLOG-001)

Sneat Bootstrap Admin Template **v3.0.0** (free) is mapped onto the Yuletide platform via Tailwind + CSS tokens — not embedded Bootstrap/Django assets.

## Source

- Local zip: `sneat-bootstrap-html-django-admin-template-free-v3.0.0.zip`
- Extract (gitignored): `apps/web/vendor/_sneat-extract/`

## Implementation

| Layer | Path |
|-------|------|
| Design tokens | `apps/web/src/styles/sneat-theme.css` |
| Layout utilities, badges, cards | `apps/web/src/app/globals.css` |
| Tailwind semantic colors | `apps/web/tailwind.config.ts` |
| Staff CRM shell | `apps/web/src/components/app-shell.tsx` |
| Creator console shell | `apps/web/src/components/creator/creator-shell.tsx` |
| Auth pages | `apps/web/src/components/auth-layout.tsx` |

## Approach

- Sneat SCSS variables → CSS custom properties → Tailwind `primary`, `surface`, `sidebar-*`, etc.
- Shared classes: `.layout-wrapper`, `.layout-menu`, `.app-topbar`, `.app-canvas`, `.sidebar-nav-item-*`, `.badge-*`, `.card`, `.pill-tab-*`, `.list-item-*`
- Marketing/public pages keep holiday mesh background; admin/creator use Sneat canvas.

## Not in scope (by design)

- Full Bootstrap JS/CSS bundle
- Django template port
- Boxicons vendored copy (optional future: `public/vendor/sneat/fonts/boxicons`)

## Status

**PARTIAL (2026-08-19)** — Staff + Creator consoles aligned to Sneat v3 tokens. CMS sub-panels use shared Sneat utilities.
