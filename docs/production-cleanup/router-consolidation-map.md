# Router consolidation map (P0.2 draft)

**Active API export:** `packages/api/src/routers/firestore.ts` → `appRouter`

| Router                 | Domain                              | Canonical paths               | Auth         | Module               | Permission      | Status                                             |
| ---------------------- | ----------------------------------- | ----------------------------- | ------------ | -------------------- | --------------- | -------------------------------------------------- |
| customer360            | customers/properties/jobs/follow-up | org customers/properties/jobs | office+      | — / follow-up flag   | customers.\*    | Canonical; follow-up mutations disabled            |
| portal360              | portal                              | portalAccounts/Users/QR       | public+auth  | customer_portal      | —               | Canonical                                          |
| proposals360           | proposals                           | org proposals                 | protected    | proposals            | proposals.\*    | Canonical                                          |
| invoices360            | invoices                            | org invoices                  | protected    | invoices             | invoices.\*     | Canonical                                          |
| inventory360           | inventory                           | org inventory                 | protected    | inventory            | inventory.\*    | Canonical                                          |
| schedule360            | schedule/jobs/routes                | org jobs/events               | protected    | jobs/routes/schedule | jobs.\*         | Canonical                                          |
| messages360            | messaging                           | conversations                 | protected    | messages             | —               | Canonical                                          |
| mockups360             | mockups                             | org mockups                   | protected    | mockups              | mockups.\*      | Canonical                                          |
| reports360             | reports                             | derived                       | protected    | reports              | reports.\*      | Canonical                                          |
| settings360            | settings/roles                      | settings/\*                   | office/admin | —                    | settings.\*     | Canonical                                          |
| creator360             | platform                            | platform/\*                   | creator      | —                    | —               | Canonical                                          |
| signTracker360         | signs                               | signLocations                 | protected    | sign_tracker         | sign_tracker.\* | Canonical                                          |
| rebooking360           | rebooking                           | rebooking                     | protected    | rebooking            | —               | Canonical                                          |
| storage360             | storage                             | storage                       | protected    | storage              | —               | Canonical                                          |
| commercial360          | commercial                          | commercial                    | protected    | commercial           | —               | Canonical                                          |
| contacts360            | contacts                            | contacts                      | protected    | —                    | —               | Canonical                                          |
| agreements360          | agreements                          | agreements                    | protected    | —                    | —               | Canonical                                          |
| timeClock360           | time clock                          | timeEntries                   | protected    | time_clock           | —               | Canonical                                          |
| projectPrep360         | prep                                | prep                          | protected    | —                    | —               | Canonical                                          |
| serviceIssues360       | service                             | issues                        | protected    | —                    | —               | Canonical                                          |
| onboarding360          | onboarding                          | org onboarding fields         | protected    | —                    | —               | Canonical                                          |
| billing                | subscription                        | org stripe fields             | auth         | —                    | —               | Canonical                                          |
| import360              | CSV import                          | multi                         | office       | —                    | —               | Canonical                                          |
| reviews360             | reviews                             | reviews                       | protected    | reviews              | —               | Canonical                                          |
| automation360          | automation                          | automation                    | protected    | automation           | —               | Canonical                                          |
| websiteCms / siteCms   | marketing CMS                       | platform/website              | mixed        | —                    | —               | Canonical (non-overlapping ownership TBD)          |
| crmUiConfig            | nav config                          | settings/crmUi                | office       | —                    | settings        | Canonical                                          |
| Legacy non-360 routers | various                             | legacy                        | varies       | varies               | varies          | Compatibility — document call sites before removal |

## Compatibility adapter rules

- Clearly named
- Read-only where possible
- Write only to canonical paths
- Dev deprecation warnings + prod usage metrics (no sensitive payloads)
- Scheduled removal milestone + automated coverage

## Next actions

1. Script inventory of `trpc.<router>` call sites (web/mobile/public/inngest/functions)
2. Mark duplicate write paths per domain
3. Remove unrestricted legacy writes after migration
