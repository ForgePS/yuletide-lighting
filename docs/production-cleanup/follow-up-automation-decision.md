# Follow-up automation decision (P0.2)

**Decision:** OPTION B — DISABLE  
**Date:** 2026-07-30  
**Status:** Deferred pending delivery-service readiness

## Rationale

P0.1 left a partial UI (enable + template edit only). Completing full rule CRUD, conditions, run history, and delivery actions safely requires operational Resend/Twilio task pipelines and audit trails. Shipping a half-functional production screen is not acceptable.

## Disabled scope (implemented)

- Feature flag / org `featureFlags.followUpAutomation` defaults to `false` on provision
- Settings catalog flag `follow_up_automation` defaults to **disabled**
- `FollowUpRulesTable` removed from customer overview (no partial production UI)
- `customer360.followUpRules.list` and `.update` throw `FOLLOW_UP_AUTOMATION_DISABLED` unless explicitly enabled
- Existing Firestore follow-up rule documents are **preserved** (no data deletion)

## Remaining work (future phase)

- Full OPTION A implementation: create/edit/duplicate/archive/restore, triggers, delays, conditions, actions, templates, assignees, order, validation, audit + run history, test rule
- Only enable action types backed by real delivery services

## Functional scope retained

- None in production UI while disabled
