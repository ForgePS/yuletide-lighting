# Portal Phase 2 S7B — Route Inventory

**ENVIRONMENT:** EMULATOR  
**DATE:** 2026-08-03  
**CHECKPOINT:** PORTAL-P2-S7B  
**S7A CHECKPOINT SHA:** `472c2479066a9591974588297059e7aec59f1b2e`  
**SOURCE:** `apps/web/src/app/portal/**` (Next App Router tree)

## Summary

| Class                | Namespace                                                          | Auth                                |
| -------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| PUBLIC_ENTRY         | `/portal`, `/portal/login`, `/portal/access/*`, `/portal/invite/*` | None / claim-specific               |
| LEGACY_SHIM          | `/portal/[token]`, `/portal/[token]/*`                             | Magic token → session exchange only |
| PORTAL_AUTHENTICATED | `/portal/app`, `/portal/app/**`                                    | `__portal_session` only             |

Mapper: `mapLegacyPortalPathToAppPath` / `translateLegacyPortalPathToSessionPath` in `packages/types/src/portal-legacy-path.ts`.  
Shim: `LegacyPortalEntryShim` → `POST /api/portal/session` → `router.replace` → `/portal/app/...`.

## Public / entry routes

| Route                    | Purpose                         | Auth source                         | Raw token required                 | Session accepted        | Deep-link | Target canonical                    | Compatibility          |
| ------------------------ | ------------------------------- | ----------------------------------- | ---------------------------------- | ----------------------- | --------- | ----------------------------------- | ---------------------- |
| `/portal`                | Portal landing / redirect entry | None                                | No                                 | Optional                | N/A       | `/portal/login` or app when session | Unchanged              |
| `/portal/login`          | Paste-token / login UI          | Magic → session                     | Entry only                         | Yes                     | N/A       | `/portal/app` after exchange        | Unchanged              |
| `/portal/invite/[token]` | Invitation claim                | Invitation hash + Firebase identity | Invitation token (separate system) | Sets `__portal_session` | N/A       | Session portal                      | Out of S7B magic scope |
| `/portal/access/[token]` | QR / OTP activation             | QR hashed token + OTP               | QR token (separate)                | May set session         | N/A       | Session portal where applicable     | Out of S7B magic scope |

## Legacy magic-token shims

File: `apps/web/src/app/portal/[token]/[[...segments]]/page.tsx` (+ `[token]/layout.tsx`).

| Current route                      | Purpose                 | Auth           | Raw token  | Session after exchange | Feature          | Resource | Deep-link | Target                         | Compatibility |
| ---------------------------------- | ----------------------- | -------------- | ---------- | ---------------------- | ---------------- | -------- | --------- | ------------------------------ | ------------- |
| `/portal/[token]`                  | Root entry shim         | Magic exchange | Yes (path) | Cookie only            | portal home      | —        | Yes       | `/portal/app`                  | ENTRY_SHIM    |
| `/portal/[token]/schedule`         | Deep-link shim          | Magic exchange | Yes        | Cookie                 | schedule         | —        | Yes       | `/portal/app/schedule`         | ENTRY_SHIM    |
| `/portal/[token]/schedule-request` | Deep-link shim          | Magic exchange | Yes        | Cookie                 | schedule-request | —        | Yes       | `/portal/app/schedule-request` | ENTRY_SHIM    |
| `/portal/[token]/service-request`  | Deep-link shim          | Magic exchange | Yes        | Cookie                 | service-request  | —        | Yes       | `/portal/app/service-request`  | ENTRY_SHIM    |
| `/portal/[token]/messages`         | Deep-link shim          | Magic exchange | Yes        | Cookie                 | messages         | —        | Yes       | `/portal/app/messages`         | ENTRY_SHIM    |
| `/portal/[token]/notifications`    | Deep-link shim          | Magic exchange | Yes        | Cookie                 | notifications    | —        | Yes       | `/portal/app/notifications`    | ENTRY_SHIM    |
| `/portal/[token]/contacts`         | Deep-link shim          | Magic exchange | Yes        | Cookie                 | contacts         | —        | Yes       | `/portal/app/contacts`         | ENTRY_SHIM    |
| `/portal/[token]/sign`             | Deep-link shim          | Magic exchange | Yes        | Cookie                 | sign             | —        | Yes       | `/portal/app/sign`             | ENTRY_SHIM    |
| `/portal/[token]/billing`          | Deep-link shim          | Magic exchange | Yes        | Cookie                 | billing          | —        | Yes       | `/portal/app/billing`          | ENTRY_SHIM    |
| `/portal/[token]/proposals`        | Deep-link shim          | Magic exchange | Yes        | Cookie                 | proposals        | —        | Yes       | `/portal/app/proposals`        | ENTRY_SHIM    |
| `/portal/[token]/agreements`       | Deep-link shim          | Magic exchange | Yes        | Cookie                 | agreements       | —        | Yes       | `/portal/app/agreements`       | ENTRY_SHIM    |
| `/portal/[token]/properties`       | Deep-link shim          | Magic exchange | Yes        | Cookie                 | properties       | —        | Yes       | `/portal/app/properties`       | ENTRY_SHIM    |
| `/portal/[token]/mockups`          | Deep-link shim          | Magic exchange | Yes        | Cookie                 | mockups          | —        | Yes       | `/portal/app/mockups`          | ENTRY_SHIM    |
| `/portal/[token]/documents`        | Deep-link shim          | Magic exchange | Yes        | Cookie                 | documents        | —        | Yes       | `/portal/app/documents`        | ENTRY_SHIM    |
| `/portal/[token]/jobs`             | Deep-link shim          | Magic exchange | Yes        | Cookie                 | jobs             | —        | Yes       | `/portal/app/jobs`             | ENTRY_SHIM    |
| `/portal/[token]/jobs/[jobId]`     | Resource deep-link shim | Magic exchange | Yes        | Cookie                 | jobs             | job      | Yes       | `/portal/app/jobs/[jobId]`     | ENTRY_SHIM    |
| `/portal/[token]/takedowns`        | Deep-link shim          | Magic exchange | Yes        | Cookie                 | takedowns        | —        | Yes       | `/portal/app/takedowns`        | ENTRY_SHIM    |
| `/portal/[token]/storage`          | Deep-link shim          | Magic exchange | Yes        | Cookie                 | storage          | —        | Yes       | `/portal/app/storage`          | ENTRY_SHIM    |
| `/portal/[token]/consultations`    | Deep-link shim          | Magic exchange | Yes        | Cookie                 | consultations    | —        | Yes       | `/portal/app/consultations`    | ENTRY_SHIM    |
| `/portal/[token]/reviews`          | Deep-link shim          | Magic exchange | Yes        | Cookie                 | reviews          | —        | Yes       | `/portal/app/reviews`          | ENTRY_SHIM    |
| `/portal/[token]/rebook`           | Deep-link shim          | Magic exchange | Yes        | Cookie                 | rebook           | —        | Yes       | `/portal/app/rebook`           | ENTRY_SHIM    |

Unknown/unsupported legacy suffixes: mapper returns `null` → fail safe (no invent destinations).  
Scope conflict (`portalSessionTokenScopeConflict`): HTTP **409** — no identity switch.

## Canonical session-only routes (`/portal/app/*`)

| Route                          | File                            | Auth               | Raw token allowed | Feature          |
| ------------------------------ | ------------------------------- | ------------------ | ----------------- | ---------------- |
| `/portal/app`                  | `app/page.tsx`                  | `__portal_session` | No                | home             |
| `/portal/app/schedule`         | `app/schedule/page.tsx`         | session            | No                | schedule         |
| `/portal/app/schedule-request` | `app/schedule-request/page.tsx` | session            | No                | schedule-request |
| `/portal/app/service-request`  | `app/service-request/page.tsx`  | session            | No                | service-request  |
| `/portal/app/messages`         | `app/messages/page.tsx`         | session            | No                | messages         |
| `/portal/app/notifications`    | `app/notifications/page.tsx`    | session            | No                | notifications    |
| `/portal/app/contacts`         | `app/contacts/page.tsx`         | session            | No                | contacts         |
| `/portal/app/sign`             | `app/sign/page.tsx`             | session            | No                | sign             |
| `/portal/app/billing`          | `app/billing/page.tsx`          | session            | No                | billing          |
| `/portal/app/proposals`        | `app/proposals/page.tsx`        | session            | No                | proposals        |
| `/portal/app/agreements`       | `app/agreements/page.tsx`       | session            | No                | agreements       |
| `/portal/app/properties`       | `app/properties/page.tsx`       | session            | No                | properties       |
| `/portal/app/mockups`          | `app/mockups/page.tsx`          | session            | No                | mockups          |
| `/portal/app/documents`        | `app/documents/page.tsx`        | session            | No                | documents        |
| `/portal/app/jobs`             | `app/jobs/page.tsx`             | session            | No                | jobs             |
| `/portal/app/jobs/[jobId]`     | `app/jobs/[jobId]/page.tsx`     | session            | No                | jobs / resource  |
| `/portal/app/takedowns`        | `app/takedowns/page.tsx`        | session            | No                | takedowns        |
| `/portal/app/storage`          | `app/storage/page.tsx`          | session            | No                | storage          |
| `/portal/app/consultations`    | `app/consultations/page.tsx`    | session            | No                | consultations    |
| `/portal/app/reviews`          | `app/reviews/page.tsx`          | session            | No                | reviews          |
| `/portal/app/rebook`           | `app/rebook/page.tsx`           | session            | No                | rebook           |

Thin pages re-export session-first bodies under `apps/web/src/components/portal/pages/*` via `apps/web/src/app/portal/app/layout.tsx`.

## Out of scope (unchanged)

Public proposal/agreement/invoice/mockup tokens (`/p/`, `/a/`, `/pay/`, `/m/`) — separate systems.

**NO PRODUCTION FIREBASE. NO DEPLOY.**
