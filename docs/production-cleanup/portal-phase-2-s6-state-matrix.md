# Portal Phase 2 S6 — Domain state matrix (customer portal)

**ENVIRONMENT:** EMULATOR  
**Rule:** Unknown / unrecognized status → **DENY** (fail closed). Do not invent transitions that are not implemented as portal mutations.  
**Sources:** `packages/types/src/{proposals,agreements,mockups,service-issues,rebooking,reviews360,portal}.ts`, `packages/firebase/src/portal360.ts` (`CUSTOMER_VISIBLE_MOCKUP_STATUSES`, signing hub filters), `rebooking360.ts`, `portal-invitation.ts`, `portal-qr360.ts`.

Legend for portal mutation column:

| Value              | Meaning                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| **—**              | No portal360 / REST portal mutation for this domain transition           |
| **view-only**      | Portal lists/links; transition happens elsewhere (staff or public token) |
| **create/request** | Portal mutation creates a new resource or soft request                   |
| **auth**           | Pre-session auth/activation mutation                                     |

---

## 1. Proposals (`ProposalStatus`)

Canonical statuses (`packages/types/src/proposals.ts`):

`draft` · `internal_review` · `ready_to_send` · `sent` · `viewed` · `customer_questions` · `approved` · `deposit_paid` · `scheduled` · `rejected` · `expired` · `superseded` · legacy `accepted` · legacy `declined`

| Status               | Portal list visibility                             | Signing hub (`e_sign`)                                                                | Portal mutation | Notes                                                                                                                                          |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `draft`              | Listed if customer-owned                           | Eligible if `publicToken` (hub includes non-terminal)                                 | — / view-only   | Hub skips only terminal-ish set below                                                                                                          |
| `internal_review`    | Listed                                             | Eligible if token                                                                     | —               |                                                                                                                                                |
| `ready_to_send`      | Listed                                             | Eligible if token                                                                     | —               |                                                                                                                                                |
| `sent`               | Listed                                             | Eligible if token                                                                     | —               | Sign via `/p/{publicToken}`                                                                                                                    |
| `viewed`             | Listed                                             | Eligible if token                                                                     | —               |                                                                                                                                                |
| `customer_questions` | Listed                                             | Eligible if token                                                                     | —               |                                                                                                                                                |
| `approved`           | Listed                                             | **Excluded** from hub                                                                 | —               |                                                                                                                                                |
| `deposit_paid`       | Listed                                             | **Excluded**                                                                          | —               |                                                                                                                                                |
| `scheduled`          | Listed                                             | **Excluded**                                                                          | —               |                                                                                                                                                |
| `rejected`           | Listed                                             | **Excluded** (via `declined` check; `rejected` not in exclude list — treat carefully) | —               | Hub exclude list: `approved,deposit_paid,scheduled,declined,expired,cancelled` — **`rejected` not listed** → may still appear if token present |
| `expired`            | Listed                                             | **Excluded**                                                                          | —               |                                                                                                                                                |
| `superseded`         | Listed                                             | May appear (not in exclude list)                                                      | —               |                                                                                                                                                |
| `accepted` (legacy)  | Listed                                             | May appear                                                                            | —               | Normalize maps to `approved` in helpers, not in portal list map                                                                                |
| `declined` (legacy)  | Listed                                             | **Excluded**                                                                          | —               |                                                                                                                                                |
| `cancelled`          | Not in type union; hub excludes if present         | **Excluded**                                                                          | —               |                                                                                                                                                |
| **unknown**          | Listed (string passthrough in `mapPortalProposal`) | Unknown → treat as **DENY** for mutation; hub may still link if token                 | **DENY**        | No portal status-transition mutation exists                                                                                                    |

**Portal mutations affecting proposals:** none directly. `submitRebook` may **create** a new proposal via `createProposal360` (side effect), defaulting to staff proposal create semantics (typically `draft`/pipeline), not a customer status transition on an existing proposal.

---

## 2. Agreements (`MultiYearAgreementStatus`)

Canonical (`packages/types/src/agreements.ts`):

`draft` · `awaiting_signature` · `signed` · `active` · `renewal_due` · `completed` · `cancelled`

| Status               | Portal list                       | Signing hub                   | Portal mutation | Notes                                   |
| -------------------- | --------------------------------- | ----------------------------- | --------------- | --------------------------------------- |
| `draft`              | Listed                            | Hub if `publicToken`          | — / view-only   | Sign `/a/{token}`                       |
| `awaiting_signature` | Listed                            | Hub if token                  | —               | Primary signable                        |
| `sent`               | Not in type; hub allows if stored | Hub if token                  | —               | Legacy/extra string in hub filter       |
| `signed`             | Listed                            | Not in hub filter             | —               | `isAgreementSignedStatus`               |
| `active`             | Listed                            | Not in hub                    | —               | Treated signed-ish                      |
| `renewal_due`        | Listed                            | Not in hub                    | —               |                                         |
| `completed`          | Listed                            | Not in hub                    | —               |                                         |
| `cancelled`          | Listed                            | Not in hub                    | —               |                                         |
| **unknown**          | Listed (passthrough)              | **DENY** for any portal write | **DENY**        | No agreement sign/mutation in portal360 |

---

## 3. Mockups

**Type union** (`MockupStatus`): `draft` · `in_review` · `approved` · `revision_requested` · `archived`

**Customer-visible set in portal list** (`CUSTOMER_VISIBLE_MOCKUP_STATUSES` in `portal360.ts`):

`published` · `approved` · `pending_approval` · `sent` · `customer_review` · `in_review` · `revision_requested`

| Status                                                        | Portal list                         | Signing hub (approve)                 | Portal mutation | Notes                                            |
| ------------------------------------------------------------- | ----------------------------------- | ------------------------------------- | --------------- | ------------------------------------------------ |
| `draft`                                                       | **Hidden** (explicit deny)          | No                                    | —               |                                                  |
| `internal`                                                    | **Hidden**                          | No                                    | —               | String check, not in type                        |
| `in_review`                                                   | Visible                             | Hub if `approvalToken` → `/m/{token}` | — / view-only   | Only hub-actionable mockup status                |
| `approved`                                                    | Visible                             | No (hub requires `in_review`)         | —               |                                                  |
| `revision_requested`                                          | Visible                             | No                                    | —               |                                                  |
| `archived`                                                    | **Hidden** (unknown to visible set) | No                                    | —               | Fail closed                                      |
| `published` / `pending_approval` / `sent` / `customer_review` | Visible (compat strings)            | No                                    | —               | Not in `MockupStatus` union but allowed for list |
| empty status                                                  | Visible (legacy empty allowed)      | No                                    | —               |                                                  |
| staff_only / internal / system **visibility**                 | **Hidden**                          | No                                    | —               | Visibility deny before status                    |
| **unknown non-empty**                                         | **Hidden / DENY**                   | **DENY**                              | **DENY**        | Explicit comment: do not infer visibility        |

No portal360 mockup approve/reject mutation.

---

## 4. Service requests (`ServiceIssueStatus`)

Canonical: `reported` · `triaged` · `scheduled` · `in_progress` · `resolved` · `closed` · `cancelled`

| From → To                   | Portal mutation                                                 | Allowed?          | Notes                                                   |
| --------------------------- | --------------------------------------------------------------- | ----------------- | ------------------------------------------------------- |
| _(none)_ → `reported`       | `submitServiceRequest` / `uploadServicePhoto` (attachment only) | **ALLOW** create  | Always creates new issue at `reported`, `source=portal` |
| `reported` → later statuses | —                                                               | **DENY** (portal) | Staff/service workflows only                            |
| Any → any other             | —                                                               | **DENY**          |                                                         |
| **unknown**                 | —                                                               | **DENY**          |                                                         |

Portal list shows customer-scoped issues with stored status passthrough; customers cannot transition status via portal.

---

## 5. Schedule requests

**No persisted `scheduleRequest.status` enum in types.** Portal returns synthetic:

```ts
{ status: 'requested' as const, ... }
```

| State                             | Meaning                                                           | Portal mutation                 | Notes                                                                         |
| --------------------------------- | ----------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `requested`                       | Soft request recorded (communication + timeline event)            | `submitScheduleRequest` creates | Not a calendar booking                                                        |
| Confirmed / scheduled appointment | Calendar `dispatchStatus` on events (view via dashboard/schedule) | —                               | Separate domain                                                               |
| **unknown**                       | —                                                                 | **DENY**                        | Do not invent statuses (`confirmed`, `cancelled`, etc.) as portal transitions |

Duplicate `submitScheduleRequest` calls each create a new soft request (no state machine).

---

## 6. Reviews (`ReviewRequest360Status`)

Canonical: `pending` · `sent` · `clicked` · `submitted` · `internal_feedback`

| Status              | Portal list         | Portal mutation | Notes                                                                        |
| ------------------- | ------------------- | --------------- | ---------------------------------------------------------------------------- |
| `pending`           | Shown               | —               | view-only                                                                    |
| `sent`              | Shown               | —               |                                                                              |
| `clicked`           | Shown               | —               |                                                                              |
| `submitted`         | Shown               | —               | Submission is **not** a portal360 mutation (public review token flow if any) |
| `internal_feedback` | Shown               | —               |                                                                              |
| **unknown**         | Passthrough in list | **DENY**        | No `submitReview` on portal360                                               |

Referrals (`ReferralStatus`: `issued` · `used` · `rewarded` · `expired`) — list/ensure-code on **query** path only; no portal redeem mutation.

---

## 7. Rebooking

**Campaign:** `draft` · `active` · `paused` · `completed`  
**Record:** `not_sent` · `sent` · `opened` · `rebooked` · `upgrade_requested` · `declined` · `no_response`

| Record status           | `submitRebook` (S6)                 | Transition result                            | Notes                                   |
| ----------------------- | ----------------------------------- | -------------------------------------------- | --------------------------------------- |
| `not_sent`              | ALLOW                               | → `rebooked` / `upgrade_requested`           | `canPortalTransition` + process         |
| `sent`                  | ALLOW                               | → terminal status                            |                                         |
| `opened`                | ALLOW                               | → terminal status                            |                                         |
| `no_response`           | ALLOW                               | → terminal status                            |                                         |
| `rebooked`              | **DENY** (terminal replay)          | Returns `{ replayed: true }`, same proposal  | S6: `processRebookRecord` short-circuit |
| `upgrade_requested`     | **DENY** (terminal replay)          | Idempotent return                            | S6 implemented                          |
| `declined`              | **DENY** (terminal replay)          | Idempotent return                            | S6 implemented                          |
| **unknown**             | **DENY**                            | Fail closed                                  |                                         |
| No record / no campaign | May auto-create campaign + populate | Guard + DENY if still missing after populate | Throws `No prior season record found`   |

Campaign selection: prefers `status === 'active'`, else `campaigns[0]` (any status) — unknown/inactive campaign handling needs hardening.

---

## 8. Auth / invitation / QR (mutation-relevant)

### Portal user invitation (`invitationStatus`)

`none` · `pending` · `consumed` · `revoked` · `expired` · `replaced`

| Status                                                   | `claimInvitation` | Result                      |
| -------------------------------------------------------- | ----------------- | --------------------------- |
| `pending` (unexpired)                                    | ALLOW             | → `consumed`, user `active` |
| `pending` (expired)                                      | DENY              | → `expired`                 |
| `consumed` / `revoked` / `expired` / `replaced` / `none` | DENY              |                             |
| **unknown**                                              | DENY              |                             |

### Portal account (`PortalAccountStatus`)

`not_invited` · `invitation_pending` · `active` · `locked` · `suspended` · `archived`

Claim requires account not `suspended`/`archived`/`locked`. Authorized feature mutations require account/user status via permission matrix (fail closed).

### QR (`PortalQrCodeStatus`)

`draft` · `active` · `used_for_activation` · `reusable` · `expired` · `revoked` · `replaced` · `suspended` · `invalid`

| Status                                                                 | `qrSendCode` / `qrVerify` (S6)   | Notes                         |
| ---------------------------------------------------------------------- | -------------------------------- | ----------------------------- |
| `active`                                                               | ALLOW (if not time-expired)      | Primary activation path       |
| `reusable`                                                             | ALLOW                            | OTP re-auth permitted         |
| `used_for_activation`                                                  | **DENY** (in `isInactiveStatus`) | S6 terminal — no OTP re-cycle |
| `draft` / `expired` / `revoked` / `replaced` / `suspended` / `invalid` | DENY (inactive)                  |                               |
| **unknown**                                                            | DENY                             | Fail closed                   |

OTP verification row: unconsumed + unexpired + attempts &lt; max → consume on success.

---

## 9. Notifications / messages (supporting)

| Domain                     | States               | Portal mutation effect                                               |
| -------------------------- | -------------------- | -------------------------------------------------------------------- |
| Notification               | `readAt` null vs set | `markNotificationRead` / `markAllNotificationsRead` set `readAt`     |
| Message                    | created `delivered`  | `sendMessage` → inbound `delivered`; conversation `waiting_on_staff` |
| **unknown message status** | —                    | **DENY** client-driven transitions (none exist)                      |

---

## 10. Cross-cutting DENY rules

1. If status string is not in the canonical union **and** not in an explicit compatibility allowlist (mockup visible set, agreement hub `sent`), treat as **unknown → DENY** for writes and for customer visibility where code already fail-closes (mockups).
2. Portal must not transition proposal/agreement/mockup/review/payment statuses — those paths are public-token or staff.
3. Schedule “status” is synthetic `requested` only until a real entity exists.
4. Rebook and QR activation state machines hardened in S6 (terminal replay + `used_for_activation` deny).
5. Payment checkout is server-authoritative with safe mode (see `portal-phase-2-s6-provider-safety.md`).

---

## Matrix vs mutation map linkage

| Domain            | Portal mutating procedures                   | Primary state risk                                    |
| ----------------- | -------------------------------------------- | ----------------------------------------------------- |
| Proposals         | Indirect via `submitRebook` create           | Duplicate proposals                                   |
| Agreements        | None                                         | N/A (view/sign-out-of-band)                           |
| Mockups           | None                                         | Visibility unknown-status DENY already in list        |
| Service requests  | `submitServiceRequest`, `uploadServicePhoto` | Create-only; no status machine                        |
| Schedule requests | `submitScheduleRequest`                      | Soft create-only                                      |
| Reviews           | None                                         | View-only                                             |
| Rebooking         | `submitRebook`                               | Terminal replay + idempotency (S6)                    |
| Auth              | claim / session / QR OTP                     | Invitation OK; QR `used_for_activation` terminal (S6) |
