# YL-S23 — Full lifecycle smoke (BACKLOG-006)

**Status:** COMPLETE (in-repo unit smoke)  
**Constraint:** No production deploy / no production Firestore writes

## Intent

Close **YL-BACKLOG-006** in-repo: pure helpers + cohesive Vitest smoke for lead → proposal → pay → job → removal → renewal without Admin SDK.

Live staging/production browser UAT remains an **ops checklist**.

## Chain covered (unit)

```text
lead → proposal (/p/{token}) → pay (deposit payable) → job (schedule/install)
  → removal (takedown → removed) → renewal (rebooking-eligible stages)
```

## Deferred ops checklist

1. Staging: auth smoke + portal magic smoke (existing scripts; need secrets)
2. Staging: synthetic lead → accept → Stripe **test** deposit → schedule → complete → takedown → rebook
3. Production: only after explicit prod write auth; nondestructive reads first
4. Record `SMOKE_ENV` / `SMOKE_SHA` / `REAL_CHARGES=0`

See `docs/yuletide-platform/sprints/YL-S23-COMPLETE.md`.
