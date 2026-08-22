# Portal Phase 2 S3 — Accessibility

**ENVIRONMENT:** EMULATOR  
**Target:** WCAG 2.2 AA  
**Test results:** PENDING

## Invitation flow

- One descriptive `h1`; concise instructions do not reveal account state.
- Continue action is a native button with at least 48px height and visible disabled/busy state.
- Errors use `role="alert"`; success uses `role="status"`.
- Text remains meaningful without color; foreground/background combinations require AA contrast verification.
- Keyboard order follows content order, and the return link is keyboard reachable.

## OTP flow

- Associate channel/contact/code fields with visible labels and instructions.
- Use appropriate autocomplete/input mode without forcing a segmented control.
- Announce send, cooldown, verification, and generic error states without moving focus unexpectedly.
- Keep resend available as an explicit control; expose cooldown text, not color alone.
- Preserve entered values when safe, identify errors in text, and avoid timing-only completion requirements.

## Verification matrix

- Keyboard-only and 200% zoom.
- Screen reader announcement for loading, errors, cooldown, and success.
- Reduced motion and high-contrast/forced-colors review.
- Phone/tablet/desktop reflow with no two-dimensional scrolling.
- Automated axe plus manual focus, name/role/value, contrast, and target-size review.

Evidence remains pending until emulator E2E/a11y commands are recorded.
