# Integration Inventory (Phase 0)

**Date:** 2026-07-30

## Production-required integrations

| Integration | Code status | Config | Launch readiness |
|-------------|-------------|--------|------------------|
| Firebase Auth / Firestore / Storage / Hosting | Implemented | `NEXT_PUBLIC_FIREBASE_*`, Admin key/path/ADC | Core — ops validation still required |
| Stripe (Connect + SaaS + webhooks) | Implemented | `STRIPE_*`, price IDs | Secrets + webhook lifecycle verification open |
| Twilio SMS | Implemented | `TWILIO_*` | Secrets + inbound To-number org mapping |
| Resend email | Implemented | `RESEND_*` | Secrets; template content still partly hardcoded |
| Mapbox | Implemented | `NEXT_PUBLIC_MAPBOX_TOKEN`, `MAPBOX_TOKEN` | Often empty → blank maps |
| Inngest | Partial (2 crons) | `INNGEST_*` | Limited coverage; proposal follow-up weak |

## Mocked / heuristic (must not present as live in production)

| Feature | Evidence | Directive handling |
|---------|----------|--------------------|
| Weather forecast | `mockWeatherForecast` in schedule types/firebase | Disable or replace before launch |
| AI property detection | `mockAiPropertyDetection` | Disable behind flag / remove from prod nav |
| AI design / assist / report query | Heuristic generators in mockups/messages/reports/proposals | Disable until real provider |

## Stub integrations (`DEFAULT_INTEGRATIONS`)

UI toggles only — **no backends**:

HubSpot, Salesforce, QuickBooks, Xero, Square, SendGrid, Google Maps (settings toggle), Google Drive, Dropbox.

Stripe appears in this list as a toggle but real Stripe is env-driven separately — confusing dual surface.

**Directive:** Disable / label unavailable in production; do not imply connected.

## Missing operational integrations

| Item | Status |
|------|--------|
| Sentry (or equivalent) | Not implemented |
| Automated Firestore export / restore drills | Incomplete per staging/backup docs |
| Expanded health checks for all providers | `/api/health` exists; not full dependency matrix |

## Environment variable requirements (declared)

See `.env.example` and `.env.staging.example`. Critical empties commonly observed locally: Mapbox tokens, Stripe, Twilio, Resend, Inngest, Platform creator lists, Firebase Admin key.
