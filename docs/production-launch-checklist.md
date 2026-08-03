# Production Launch Checklist

Go-live gates for Yuletide CRM against the Production Readiness blueprint.

## Security

- [x] Unauthenticated users cannot render `/app` content (middleware + server layout)
- [ ] Cross-organization access tests return zero unauthorized records
- [x] Firestore and storage security rules deployed and tested
- [x] No service credentials in client bundles (`NEXT_PUBLIC_*` only for public config)
- [x] `/access-denied` shown for inactive/pending/no-org users

## Lifecycle smoke (staging)

- [ ] Public website form creates CMS submission **and** CRM lead (`new_lead`)
- [ ] Consultation scheduled → completed with survey fields
- [ ] Proposal sent → viewed → accepted (records signer IP, terms version, signed snapshot)
- [ ] Accepted proposal cannot be edited without creating a revision
- [ ] Agreement sent for signature; customer signs at `/a/{token}`
- [ ] Acceptance creates: job, deposit invoice, agreement, prep rows, timeline event
- [ ] Deposit payment link works (`/pay/{token}`)
- [ ] Inventory reserve (or shortage → `to_be_ordered` prep)
- [ ] Job scheduled; routes optimize with lat/lng nearest-neighbor
- [ ] Crew mobile shows scope, mockups, materials; customer signoff works
- [ ] Install complete consumes materials + review request + job costing refresh
- [ ] Takedown complete creates storage record
- [ ] Rebooking campaign can create next-season proposal
- [ ] New signup lands on `/onboarding` checklist
- [ ] Public site season tokens resolve from org season settings

## Integrations

- [ ] Stripe Connect onboarded for operating org
- [ ] Stripe webhooks: checkout, subscription, invoice payment
- [ ] Twilio inbound SMS maps to org via To-number
- [ ] Email provider configured for automations
- [x] Firebase Admin credentials available to hosting/runtime

## Environments

- [ ] Staging project separate from production (project + Firestore ready; billing/Storage/Auth still needed for full hosting)
- [ ] Backups enabled; restore drill documented (backup bucket + first manual export started)
- [ ] Error monitoring (e.g. Sentry) receiving events
- [x] `OPERATING_ORGANIZATION_ID` set for public → CRM lead routing
- [ ] Season settings `seasonYear` matches active booking year

## UX gates

- [x] Primary modules show loading / empty / error / retry
- [x] Navigation sections persist collapse state
- [x] Mobile crew can open today’s jobs
- [x] Privacy Policy, Terms, subscription terms, accessibility pages published
- [x] `/api/health` returns `{ status: "ok" }`
- [x] `npm run test:e2e` smoke passes against production or staging

## Customer Portal Phase 2 S7A (emulator — credential foundation)

- [x] `audit:portal-token-security` PASS (S7A worktree)
- [x] S7A unit + integration tests PASS (hash-only writes, legacy modes, session decoupling, DTO sanitization)
- [ ] S7B tokenless route / plaintext-removal gates (separate checkpoint)
- [ ] Legacy magic-token production migration plan approved separately (docs only until authorized)
- [ ] `PORTAL_MAGIC_TOKEN_MODE=HASH_ONLY` cutover not applied until migration evidence complete

**Note:** See `docs/production-cleanup/portal-phase-2-s7a-completion.md`. Full S7 not complete until S7B.

## Rollback

1. Note current Firebase Hosting release ID before deploy
2. If critical failure: `firebase hosting:rollback --project yuletide-lighting`
3. Revert Firestore rules only if rules deploy caused the incident
4. Document incident in `deploy-log.txt`

## Post-deploy smoke

- [x] `/` marketing page loads
- [x] `/sign-in` works
- [x] `/app` redirects unauthenticated users
- [ ] Authenticated owner can open Dashboard, Customers, Proposals, Schedule
- [ ] Public proposal token page loads for a known token
