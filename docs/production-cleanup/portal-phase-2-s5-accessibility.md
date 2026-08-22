# Portal Phase 2 S5 — Accessibility

**ENVIRONMENT:** EMULATOR  
**Target:** WCAG 2.2 AA  
**Test results:** PENDING

## Feature-unavailable fallback

When `PortalAuthedFrame` detects a disabled feature:

- Fallback uses semantic heading (`h2`) and plain-language message.
- "Back to home" link is keyboard reachable with `min-h-11` touch target.
- No internal reason codes exposed to assistive tech.

## File download and preview

- Ticket links should use descriptive link text (document title), not raw ticket URL.
- Download via `disposition=attachment` should not trap focus; browser handles save dialog.
- Preview inline responses should not auto-play media; PDF/image handled by browser.

## Navigation

- Primary nav uses `aria-label="Portal"` / `aria-label="Primary"`.
- Active page: `aria-current="page"`.
- More menu: `role="dialog"`, `aria-modal="true"`, close control labeled.
- Badge counts exposed as text (not color-only).

## No-flash loading

- Loading state announced via existing `LoadingState`; avoid exposing protected headings before auth completes.

## Verification matrix

- Keyboard-only navigation through nav, fallback, and document links.
- Screen reader: feature unavailable message, loading, and error states.
- 200% zoom and mobile bottom nav reflow.
- axe + manual contrast on fallback and nav active states.

Evidence remains pending until emulator E2E/a11y commands are recorded.
