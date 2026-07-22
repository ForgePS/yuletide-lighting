# Blueprint completion status

Tracked against `Yuletide CRM Production Readiness and Workflow Rebuild.pdf`.

## Complete for connected production use

- Phase 0: auth gates, tenant isolation, roles/permissions, loading/error hygiene, relationship freeze, sectioned nav
- Phase 1: Customer 360 tabs, consultations, lead stages, proposal acceptance automation, e-sign audit, agreement signing
- Phase 2: project prep, inventory reserve/shortages, scheduling, geo routes + map deep links, crew packet + offline queue, service, takedown→storage
- Phase 3: payments/receivables paths, job costing, portal, communications, reviews, rebooking
- Phase 4: onboarding wizard, trials, module gates, import, reports using actuals, public season tokens, legal pages, health check, Playwright smoke, staging scaffold docs

## Operator follow-ups (cannot be finished in code alone)

1. Create Firebase project `yuletide-lighting-staging` and run `firebase use staging` + first staging deploy
2. Set `OPERATING_ORGANIZATION_ID` in production env for website→CRM leads
3. Enable Firestore scheduled exports + complete one restore drill
4. Configure Stripe/Twilio/Resend production secrets if not already
5. Run `npm run test:e2e` in CI after each release

Production: https://yuletide-lighting.web.app
