# Blueprint completion status

Tracked against `Yuletide CRM Production Readiness and Workflow Rebuild.pdf`.

## Complete for connected production use

- Phase 0: auth gates, tenant isolation, roles/permissions, loading/error hygiene, relationship freeze, sectioned nav
- Phase 1: Customer 360 tabs, consultations, lead stages, proposal acceptance automation, e-sign audit, agreement signing
- Phase 2: project prep, inventory reserve/shortages, scheduling, geo routes + map deep links, crew packet + offline queue, service, takedown→storage
- Phase 3: payments/receivables paths, job costing, portal, communications, reviews, rebooking
- Phase 4: onboarding wizard, trials, module gates, import, reports using actuals, public season tokens, legal pages, health check, Playwright smoke (+ CI), staging deploy script, CMS seed path

## Operator follow-ups (cannot be finished in code alone)

1. Link billing on `yuletide-lighting-staging`, enable Storage + Auth, add web app config to `.env.staging`, then `npm run deploy:staging`
2. Confirm `OPERATING_ORGANIZATION_ID` (set to Yuletide Lighting Co. in `.env` at last deploy)
3. Schedule recurring Firestore exports (backup bucket + first manual export: `gs://yuletide-lighting-firestore-backups`)
4. Configure Stripe/Twilio/Resend production secrets if not already
5. Keep CI green (`build` + `e2e-smoke` against production)

Production: https://yuletide-lighting.web.app
CMS: home/pricing defaults seeded and live via Website CMS
