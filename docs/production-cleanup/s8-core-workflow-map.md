# S8 Core Workflow Map

**PHASE:** PORTAL-P2-S8  
**ENVIRONMENT:** EMULATOR (local evidence only)  
**RELEASE SHA (base):** `899b715` (`899b715d8c5067fce9fd345395c05025366a0a16`)  
**Worktree:** `C:\Users\jerem\Projects\christmas-light-crm-s8-go-live`  
**Production contact / deploy:** **NOT AUTHORIZED**  
**Sources:** `apps/web` routes, `packages/firebase` + `packages/api` routers, `docs/production-cleanup/portal-phase-2-implementation-plan.md`, `docs/production-launch-checklist.md`, module presets in `packages/types`

## Classification legend

| Status                     | Meaning                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| **WORKING**                | Routes + backend present; no clear launch-blocking defect in code        |
| **LAUNCH_BLOCKED**         | Clear code/config evidence that this workflow cannot ship                |
| **NONCRITICAL_LIMITATION** | Usable core path exists; optional/secondary gaps noted                   |
| **NOT_ENABLED_FOR_LAUNCH** | Deliberately gated (module/feature/`planned`) or provider not configured |

No defects invented. Prefer WORKING / NONCRITICAL unless blocking evidence exists at this SHA.

## Environment / payment modes (evidence)

| Mode                         | Status at S8 evidence                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Firestore / Auth / Storage   | **EMULATOR** for automated gates                                                                                            |
| Portal OTP / invite delivery | **Emulator-only** adapters (no production email/SMS from Phase 2 evidence)                                                  |
| Portal Stripe checkout       | **Payment safe mode** when emulator hosts set, `PORTAL_PAYMENT_SAFE_MODE=1`, missing key, or `sk_live` (blocks live charge) |
| Stripe secret key            | Treat local/nonprod as **test keys** (`sk_test_…`); never use `sk_live` in S8 evidence                                      |

---

## Core workflow table

| Workflow                      | Status                     | Evidence (routes / packages)                                                                                      | Notes                                                                                                  |
| ----------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Authentication (staff)        | **WORKING**                | `/sign-in`, `/sign-up`, middleware gates `/app`, `/api/auth/session`, app layout session                          | Unauth → redirect; `/access-denied` for inactive/pending                                               |
| Portal auth                   | **WORKING**                | `/portal/login`, `/portal/invite/[token]`, `/portal/access`, `/portal/app/**`, `/api/portal/session`, `portal360` | Session-first post S7B; magic-token shims remain; Phase 2 evidence = EMULATOR                          |
| Roles / permissions           | **WORKING**                | `/app/settings/roles`, `SettingsRole` + `requirePermission` / `permissionProcedure`, `settings360`                | Fail-closed permission middleware present                                                              |
| Creator / admin               | **WORKING**                | `/creator/**` (orgs, modules, users, billing, …), `creator360`                                                    | Platform console; allow-list via env (ops)                                                             |
| Customers                     | **WORKING**                | `/app/customers/**`, `customer360`                                                                                | Module key `customers` (CORE preset)                                                                   |
| Contacts                      | **WORKING**                | `/app/contacts`, `contacts360` / `contacts.ts`                                                                    | Staff contacts CRM                                                                                     |
| Leads                         | **WORKING**                | `/app/pipeline`, `customer360` / pipeline (`new_lead`), module `pipeline`                                         | Public site → lead is checklist smoke (ops), not a code absence                                        |
| Properties                    | **WORKING**                | `/app/customers/.../properties`, `/app/properties`, customer360 property paths                                    | Tied to customers domain                                                                               |
| Jobs                          | **WORKING**                | `/app/jobs/**`, `/app/crew/**`, `jobs360`, `schedule360`                                                          | Module `jobs`                                                                                          |
| Scheduling / Calendar         | **WORKING**                | `/app/schedule/**` (calendar, dispatch, crews, routes, …), `schedule360`                                          | Weather forecast returns `available: false` unless provider configured → see below                     |
| Field workflows               | **WORKING**                | `/app/crew`, `/app/field` → redirect to Sign Tracker, Expo crew app                                               | Field hub is legacy redirect (not broken)                                                              |
| Proposals                     | **WORKING**                | `/app/proposals/**`, public `/p/[token]`, `proposals360` / `proposals.ts`                                         | Module `proposals`                                                                                     |
| Agreements / Signatures       | **WORKING**                | `/app/agreements`, public `/a/[token]`, portal `/portal/app/sign`, `agreements360`                                | Token signing path present                                                                             |
| Invoices                      | **WORKING**                | `/app/invoices/**`, public invoice token APIs, `invoices360`                                                      | Module `invoices`                                                                                      |
| Payments                      | **WORKING**                | `/pay/[token]`, `/api/stripe/**`, `/api/webhooks/stripe`, portal billing + checkout                               | **S8 evidence: EMULATOR / payment safe mode / Stripe test keys.** Live Connect onboard = ops checklist |
| Receipts                      | **WORKING**                | `/p/[token]/receipt` (signed proposal receipt)                                                                    | Acceptance receipt surface                                                                             |
| Messaging                     | **WORKING**                | `/app/messages/**`, `messages360`                                                                                 | Module `messages`; live SMS needs Twilio config                                                        |
| Notifications                 | **WORKING**                | Portal `/portal/app/notifications`; staff `/app/settings/notifications` + schedule notifications UI               | In-app + rules config present; external channel delivery depends on integrations                       |
| Customer Portal               | **WORKING**                | `/portal/app/**` (billing, jobs, docs, messages, …), `portal360`, module `customer_portal`                        | Phase 2 S1–S7B complete at release SHA; still EMULATOR evidence for gates                              |
| Documents / Files / Uploads   | **WORKING**                | `/api/upload`, `/api/files`, portal `/api/portal/files` tickets, `documents360`, portal documents routes          | S5 ticketed portal file access                                                                         |
| Sign Tracker                  | **WORKING**                | `/app/marketing/sign-tracker/**`, `/app/field/signs/**` redirects, `signTracker360`, mobile signs tab             | Module `sign_tracker` (standard+ presets; not in trial CORE)                                           |
| Settings / org config         | **WORKING**                | `/app/settings/**` (company, branding, season, users, …), `settings360`                                           | Broad org admin surface                                                                                |
| Feature / module entitlements | **WORKING**                | Creator `/creator/modules`, `evaluateModuleEntitlement` fail-closed `requireModule`, `MODULE_PRESETS`             | Missing/empty `enabledModules` → deny                                                                  |
| Integrations                  | **NONCRITICAL_LIMITATION** | `/app/settings/integrations`, `DEFAULT_INTEGRATIONS`                                                              | Firebase/Stripe/Twilio/Resend/Mapbox/Inngest = **available**; others **planned** (see below)           |
| Mobile / tablet               | **WORKING**                | `apps/mobile` Expo (crew jobs + signs); responsive staff `/app`                                                   | Native app is crew-scoped, not full CRM                                                                |

---

## Gated / secondary items

| Item                                                                          | Status                                       | Basis                                                                                                                          |
| ----------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Weather forecast                                                              | **NOT_ENABLED_FOR_LAUNCH**                   | `getWeatherForecast` requires `WEATHER_PROVIDER` + `WEATHER_API_KEY`; otherwise `{ available: false }` (no fabricated weather) |
| Planned integrations                                                          | **NOT_ENABLED_FOR_LAUNCH**                   | HubSpot, Salesforce, QuickBooks, Xero, Square, SendGrid, Google Maps/Drive, Dropbox (`availability: 'planned'`)                |
| AI mockup generation                                                          | **NONCRITICAL_LIMITATION**                   | Mockups module + UI exist; AI path requires provider/entitlements (flag `ai_features`)                                         |
| Time clock                                                                    | **WORKING** when enabled                     | `/app/time-clock`, `timeClock360`, module `time_clock` (standard+)                                                             |
| Automation / commercial / rebooking / reviews / storage / inventory / reports | **WORKING** when enabled                     | Present under `/app/*` + `*360` packages; plan/preset gated                                                                    |
| Portal live email/SMS OTP                                                     | **NOT_ENABLED_FOR_LAUNCH** (for S8 evidence) | Phase 2 delivery adapters are emulator-only; production providers not used in this phase                                       |
| Legacy plaintext portal tokens (prod migration)                               | **NONCRITICAL_LIMITATION**                   | Hash-only new writes + session-first URLs; production token migration explicitly deferred                                      |

---

## Module entitlement snapshot (code presets)

| Tier / preset | Includes (high level)                                                               |
| ------------- | ----------------------------------------------------------------------------------- |
| Trial / CORE  | customers, pipeline, proposals, invoices, jobs, schedule, messages, customer_portal |
| Starter+      | + mockups, inventory, reports, crew                                                 |
| Standard+     | + storage, rebooking, reviews, routes, sign_tracker, time_clock                     |
| Professional+ | + automation, commercial                                                            |

Fail-closed: `packages/api` `requireModule` → `evaluateModuleEntitlement` (empty/missing → `MODULE_NOT_ENABLED`).

---

## Portal Phase 2 placement (context)

| Checkpoint | Plan status (docs)                               | Relevance to workflows                                                 |
| ---------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| S1–S6      | Complete (per plan/completion docs)              | Permissions, session, invite/OTP, DTOs, files, mutations/safe payments |
| S7 / S7B   | Complete at release baseline SHA                 | Session-first `/portal/app/**`, token hardening                        |
| S8         | This phase — gates + prepare-only; **no deploy** | Workflow map + local readiness                                         |
| S9         | Pending                                          | READY / RETURN report                                                  |

---

## Launch checklist cross-check (ops, not code defects)

Unchecked items in `docs/production-launch-checklist.md` (Stripe Connect onboard, Twilio mapping, staging smoke, backups, Sentry, season year) are **ops/environment gates**. They do **not** by themselves reclassify the product workflows above as LAUNCH_BLOCKED in code at `899b715`.

---

## Summary counts

| Status                 | Count (primary table rows)                       |
| ---------------------- | ------------------------------------------------ |
| WORKING                | 24                                               |
| NONCRITICAL_LIMITATION | 1 (Integrations row; plus gated secondary notes) |
| LAUNCH_BLOCKED         | **0**                                            |
| NOT_ENABLED_FOR_LAUNCH | (secondary/gated only)                           |

**Verdict:** Core staff CRM + portal surfaces are **present and classified WORKING** under EMULATOR evidence. No workflow in the minimum set is **LAUNCH_BLOCKED** from clear code absence at base SHA `899b715`. Mark live Stripe, live messaging providers, and portal OTP delivery as **emulator / test / safe-mode** for S8 — not production contact.
