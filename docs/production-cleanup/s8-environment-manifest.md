# S8 Environment Manifest

**PHASE:** PORTAL-P2-S8  
**DATE:** 2026-08-03  
**ENVIRONMENT:** Documentation only — **no secret values recorded**  
**RELEASE SHA (base):** `899b715d8c5067fce9fd345395c05025366a0a16`

Sources: `.env.example`, `.env.staging.example`, `apps/web` / Firebase Hosting frameworksBackend, portal/Stripe usage.

| Name                                                                                              | Required              | Service             | Secret?          | Source                      | Local                 | Nonprod                      | Production                         | Validation                     | Class                                 |
| ------------------------------------------------------------------------------------------------- | --------------------- | ------------------- | ---------------- | --------------------------- | --------------------- | ---------------------------- | ---------------------------------- | ------------------------------ | ------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_*` (apiKey, authDomain, projectId, appId, storageBucket, messagingSenderId) | YES                   | Web client          | non-secret       | Firebase console            | READY if set          | READY if staging             | READY if prod                      | app boots / auth               | READY\*                               |
| `FIREBASE_ADMIN_*` / ADC / service account                                                        | YES server            | Admin SDK           | secret           | Secret Manager / Hosting SA | EMULATOR              | NEED VERIFY staging SA       | NEED VERIFY                        | emulator + Hosting             | MISSING until nonprod config verified |
| `PORTAL_SESSION_SECRET` (or equivalent)                                                           | YES                   | Portal session HMAC | secret           | Env                         | READY\*               | NEED VERIFY                  | NEED VERIFY                        | session mint/verify            | READY\*                               |
| Stripe publishable key                                                                            | YES if billing launch | Stripe              | non-secret       | Stripe dashboard            | READY\*               | NEED VERIFY                  | NEED VERIFY                        | checkout UI                    | READY\*                               |
| Stripe secret key                                                                                 | YES if billing        | Stripe              | secret           | Stripe                      | TEST only             | NEED VERIFY test mode        | NEED AUTH                          | no live charge in S8           | READY\* (test)                        |
| Stripe webhook secret                                                                             | YES if webhooks       | Stripe              | secret           | Stripe                      | READY\*               | NEED VERIFY                  | NEED VERIFY                        | webhook signature              | READY\*                               |
| Mapbox / maps token                                                                               | if maps used          | Maps                | non-secret/token | Mapbox                      | READY\*               | NEED VERIFY                  | NEED VERIFY                        | map load                       | NOT_REQUIRED if feature off           |
| Twilio / SMS                                                                                      | if SMS launch         | Twilio              | secret           | Twilio                      | OFF                   | NEED VERIFY                  | NEED AUTH                          | adapter must no-op             | NOT_REQUIRED until SMS authorized     |
| SMTP / email provider                                                                             | if email launch       | Email               | secret           | Provider                    | OFF                   | NEED VERIFY                  | NEED AUTH                          | adapter must no-op             | NOT_REQUIRED until email authorized   |
| `PORTAL_MAGIC_TOKEN_MODE`                                                                         | optional              | Portal              | non-secret       | Env                         | COMPATIBILITY default | COMPATIBILITY for go-live OK | COMPATIBILITY until migration auth | HASH_ONLY only after migration | READY                                 |
| `FIRESTORE_EMULATOR_HOST`                                                                         | local tests only      | Emulator            | n/a              | Local                       | READY                 | n/a                          | FORBIDDEN                          | integration                    | READY                                 |

\*Confirm presence on Hosting/Functions config before go-live; values not listed here.

## Launch notes

- Missing launch-critical **production** secrets → P1 before production deploy authorization.
- S8 does **not** require production secret values to be pasted into docs.
- Twilio/SMTP: keep **REAL EMAIL = 0 / REAL SMS = 0** until separately authorized.
- Stripe: **REAL CHARGES = 0** until production payment authorization.
