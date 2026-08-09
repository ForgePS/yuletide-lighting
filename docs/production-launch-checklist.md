# Production Launch Checklist

Go-live gates for Yuletide CRM. Updated **2026-08-08** after production Hosting go-live (`1583f01` / evidence in `docs/production-cleanup/s8-production-go-live-evidence.md`).

## Security

- [x] Unauthenticated users cannot render `/app` content (middleware + server layout)
- [ ] Cross-organization access tests return zero unauthorized records (production verification still open)
- [x] Firestore and storage security rules deployed and tested
- [x] No service credentials in client bundles (`NEXT_PUBLIC_*` only for public config)
- [x] `/access-denied` shown for inactive/pending/no-org users

## Lifecycle smoke (staging / production)

_Full end-to-end lifecycle path not re-run as a single scripted suite on go-live day. Track remaining ops smokes below._

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

- [x] Staging project separate from production (`yuletide-lighting-staging` — rules, Storage, Auth, Hosting validated in S8)
- [ ] Backups enabled; restore drill documented
- [ ] Error monitoring (e.g. Sentry) receiving events
- [x] `OPERATING_ORGANIZATION_ID` set for public → CRM lead routing
- [ ] Season settings `seasonYear` matches active booking year
- [x] Org `enabledModules` migrated / stamped (professional pack applied 2026-08-08)
- [x] Creator allowlist configured (`PLATFORM_CREATOR_EMAILS` includes `info@yuletidelightingco.com`)

## UX gates

- [x] Primary modules show loading / empty / error / retry
- [x] Navigation sections persist collapse state
- [x] Mobile crew can open today’s jobs
- [x] Privacy Policy, Terms, subscription terms, accessibility pages published
- [x] `/api/health` returns `{ status: "ok" }`
- [x] `npm run test:e2e` smoke passes against production or staging

## Customer Portal

- [x] Portal Phase 2 S7A credential foundation COMPLETE (hash-only writes, session decoupling)
- [x] Portal Phase 2 S7B session-only authenticated routes COMPLETE (`2661de3` + closeout reconcile)
- [x] Staging portal session smoke PASS (`POST /api/portal/session` → `/portal/app`)
- [x] Production portal authenticated smoke (real customer / magic link) — `PORTAL_PASS` 2026-08-09 org `bdyeQorlWRWNU00fVpuN`
- [ ] Legacy magic-token production migration (tools exist; **not** applied — emulator-proven only)
- [ ] `PORTAL_MAGIC_TOKEN_MODE=HASH_ONLY` cutover (blocked until production migration evidence)

See `docs/production-cleanup/portal-phase-2-s7b-closeout-reconciliation.md` and S8 evidence docs.

## Rollback

1. Note current Firebase Hosting release ID before deploy
2. If critical failure: `firebase hosting:rollback --project yuletide-lighting`
3. Revert Firestore rules only if rules deploy caused the incident
4. Document incident in `deploy-log.txt`

## Post-deploy smoke (2026-08-08)

- [x] `/` marketing page loads
- [x] `/sign-in` works
- [x] `/api/health` OK on production Hosting
- [x] `/app` redirects unauthenticated users
- [x] Authenticated owner can open Dashboard, Customers, Proposals, Schedule
- [ ] Public proposal token page loads for a known token
- [x] Creator console reachable for allowlisted operator (`/creator`)
