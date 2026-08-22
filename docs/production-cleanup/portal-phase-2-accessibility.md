# Customer Portal Phase 2 accessibility

**ENVIRONMENT=EMULATOR**  
**Target:** WCAG 2.2 Level AA  
**Status:** INCOMPLETE — a full automated and manual run is not recorded.

## Automated targets

- Run Playwright accessibility checks (for example, axe) on login/access, dashboard, billing, documents, messages, service request, scheduling, signing, and invitation/QR states.
- Require no serious/critical violations; triage moderate findings.
- Check semantic landmarks, heading order, accessible names, form labels/errors, dialog focus, color contrast, and zoom/reflow.

## Manual targets

- Keyboard-only operation, visible focus, logical focus order, skip/navigation behavior, and no traps.
- Screen-reader smoke checks for identity, errors, notifications, tables/lists, uploads, signing, and status changes.
- 200% and 400% zoom/reflow; text spacing; reduced motion; high contrast.
- Touch target size, orientation, timeout/session messaging, error prevention, and consistent help.

Record route, viewport, assistive technology/browser, result, defect ID, and retest outcome. Do not include customer data or access credentials.

**NO DEPLOYMENT / NO PRODUCTION TESTING.**
