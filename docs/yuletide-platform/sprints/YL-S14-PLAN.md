# YL-S14 Plan — Messaging / notifications harden

## Objective

EXTEND/HARDEN messaging (YL-S0 baseline YL-S14): null-safe conversation/template labels, honest send/record delivery status, safe-mode delivery contract, inbound SMS fail-closed hooks—without production Twilio/Resend.

## Authorization

User authorized YL-S14. No production deploy. No live Twilio/Resend cutover.

## Deliverables

1. **Null-safe shared labels** — `formatMessageLabel` (status/category/trigger/channel) in types; wire inbox, SMS center, managers; harden template/classify helpers against null body
2. **Send/record consistency** — real notification `trigger`; no duplicate automation notification; status `recorded`/`queued` when no provider; gate single SMS on `smsOptIn`; clear `unreadCount` on mark-read
3. **Safe-mode delivery contract** — helper for record-only vs provider send; fence dead SQL `messagesRouter` provider calls
4. **Public inbound SMS harden** — signature validation hook rejects when auth token absent (emulator-safe tests)
5. **Unit tests** for labels, delivery status, opt-in gate, unread clear, Twilio signature fail-closed

## Out of Scope

- Production Twilio/Resend / `REAL_SMS`/`REAL_EMAIL` cutover
- Inngest proposal follow-up send (YL-S20)
- Invoice reminder → real email/SMS
- Campaign audience engine, automation360 merge, messaging RBAC module
- Production deploy
