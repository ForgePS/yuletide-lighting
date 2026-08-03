# Portal Phase 2 S7B — Logging / Analytics Redaction

**ENVIRONMENT:** EMULATOR  
**DATE:** 2026-08-03  
**S7A CHECKPOINT SHA:** `472c2479066a9591974588297059e7aec59f1b2e`

| Channel                        | Raw token exposure | Redaction                                                           | Limitations                                 |
| ------------------------------ | ------------------ | ------------------------------------------------------------------- | ------------------------------------------- |
| Middleware request logs        | None               | N/A — middleware does not log pathname                              | —                                           |
| Application / API logs         | Mitigated          | `redactPortalLogMetadata`; session route logs only generic messages | Do not log req URL with token               |
| Portal magic telemetry         | Paths not logged   | Counters + redacted metadata; never token/hash/cookie               | —                                           |
| Path normalizer                | Helper available   | `redactPortalMagicTokenPath` → `/portal/[token]/…`                  | Must be used wherever pathname is persisted |
| Audit events                   | Sanitized DTOs     | Staff views omit secrets                                            | —                                           |
| Analytics                      | NOT APPLICABLE     | No portal pathname analytics vendor wired                           | —                                           |
| Error monitoring (Sentry etc.) | NOT APPLICABLE     | No portal Sentry DSN wiring found for this surface                  | Do not add a vendor solely for S7B          |

## P0 rule

Application-controlled persistent logging of raw magic-token paths is a P0. Current middleware does not log paths. Prefer `redactPortalMagicTokenPath` for any future request tracing.
