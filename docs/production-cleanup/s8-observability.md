# S8 Observability Minimum

**PHASE:** PORTAL-P2-S8  
**DATE:** 2026-08-03

## Available without premium APM

| Signal                       | How                                                                         |
| ---------------------------- | --------------------------------------------------------------------------- |
| Hosting / Cloud Run errors   | Firebase / Cloud Logging                                                    |
| Function / frameworksBackend | Cloud Logging for Hosting backend                                           |
| Auth failures                | Firebase Auth + app logs                                                    |
| Client errors                | Browser console; optional future Sentry (NOT required to launch)            |
| Payments                     | Stripe Dashboard + webhook logs                                             |
| Portal magic telemetry       | Redacted `console.info` events (emulator-proven); ensure prod log scrubbing |

## Launch sufficiency

**ACCEPTABLE FOR LAUNCH** with Cloud Logging + Stripe dashboard + Firebase console, if on-call watches first 2 hours.

## Limitations

- No dedicated Sentry/Datadog wire-up required for S8
- Portal analytics path redaction documented in S7B; do not log raw magic tokens

## P0 if

Production logging would print raw magic tokens or session cookies (not observed as required behavior; continue to forbid).
