# YL-S26 — Multi-tenant production blockers

EXTEND/HARDEN for multi-tenant go-live blockers (no production writes in sprint):

- Stripe portal checkout: live keys require `PORTAL_ALLOW_LIVE_PAYMENTS=1`
- Twilio inbound/org phone uniqueness fail-closed
- Staff invite claim end-to-end (token + Auth + users doc)
- Crew mobile Firebase Auth sign-in
- Messaging UI distinguishes recorded-only vs provider-sent

See `sprints/YL-S26-PLAN.md` and `sprints/YL-S26-COMPLETE.md`.
