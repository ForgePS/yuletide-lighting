# Yuletide Go-Live Checklist

**PHASE:** PORTAL-P2-S8 / production go-live day  
**Applies to:** Separately authorized production deployment  
**RC branch:** `release/yuletide-go-live-readiness`

## PRE-DEPLOY

- [ ] RC SHA frozen and recorded
- [ ] P0 open = 0; launch-critical P1 waived or fixed
- [ ] Workspace provenance PASS on RC
- [ ] `production:check` ×3 PASS on RC
- [ ] Environment manifest complete for production
- [ ] Stripe = test or explicitly authorized live
- [ ] Email/SMS = off or authorized
- [ ] Portal mode COMPATIBILITY acceptable for day-1
- [ ] Rollback runbook reviewed (`s8-production-rollback.md`)
- [ ] Post-deploy smoke printed (`s8-post-deploy-smoke-plan.md`)
- [ ] Dual-control: identity + project ID `yuletide-lighting` confirmed

## DEPLOY

- [ ] Authenticate intentional production identity
- [ ] `firebase use production` / project `yuletide-lighting` confirmed verbally
- [ ] Deploy rules (if authorized)
- [ ] Deploy indexes (if authorized; wait for build)
- [ ] Deploy Hosting / frameworksBackend (if authorized)
- [ ] Record deploy version IDs / release labels
- [ ] **No** portal token migration
- [ ] **No** unexpected writes scripts

## POST-DEPLOY

- [ ] Run smoke plan (<20 min)
- [ ] Staff login OK
- [ ] Portal test account OK
- [ ] No P0 in first checks
- [ ] Monitoring/logs watched

## ROLLBACK TRIGGERS

- Auth outage
- Cross-tenant/customer exposure
- Payment charging incorrectly
- Data loss / mass write failure
- Hosting 5xx spike

## 30-MINUTE CHECK

- [ ] Homepage / health
- [ ] Staff session
- [ ] One customer lookup
- [ ] Portal session

## 2-HOUR CHECK

- [ ] Scheduling path
- [ ] Proposal path
- [ ] Invoice read path (no charge)
- [ ] Error logs clean of new P0

## NEXT-DAY CHECK

- [ ] Overnight jobs/Inngest (if any)
- [ ] Backup/export posture
- [ ] Open P2 backlog triage
