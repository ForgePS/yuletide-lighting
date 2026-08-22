# Portal Phase 2 S6 — Skipped E2E Test Review

**ENVIRONMENT:** EMULATOR  
**Branch:** `production/yuletide-cleanup-launch-readiness`  
**S5 checkpoint SHA:** `d9d8242ad6df0f9e6f58af27baa96bcf16135a3d`  
**Review date:** 2026-08-02  
**Scope:** Document and classify all skipped Playwright E2E tests from the S5 full-suite run. No S6 code changes.

## How skips work in this repo

Playwright configs do **not** declare static skips. Skipping is **runtime-only** via `test.skip(condition, reason)` inside `authenticateViaUi()` in `e2e/fixtures/auth.ts`:

```typescript
test.skip(!creds, `Missing secrets credential for ${role}`);
test.skip(!creds!.authProvisioned, `Firebase Auth not provisioned for ${role} on staging`);
```

Credentials are loaded from gitignored `secrets/staging-verification-credentials.json`. If the file is absent or a role entry has `authProvisioned: false`, every test that calls `authenticateViaUi()` skips immediately.

| Config                                 | Purpose                                                    | Skip mechanism                            |
| -------------------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `playwright.config.ts`                 | Default E2E (`E2E_BASE_URL` → production host or override) | Runtime auth fixture skip                 |
| `playwright.portal-emulator.config.ts` | Portal specs only against local Next + emulators           | No auth fixture; portal specs do not skip |
| `playwright.staging.config.ts`         | Staging authenticated runs                                 | Same runtime auth fixture skip            |

There are **no** `describe.skip`, `test.fixme`, or `describe.fixme` usages under `e2e/`.

## S5 full-suite reconciliation

| Metric                                         |        Count | Notes                                                        |
| ---------------------------------------------- | -----------: | ------------------------------------------------------------ |
| Total test executions (`playwright.config.ts`) |           61 | 56 chromium + 5 mobile-chrome (`portal-mobile.spec.ts` only) |
| Passed                                         |           48 | Includes smoke, P0.1, all portal specs, mobile-chrome portal |
| Skipped                                        |           13 | All P0.2C authenticated Sign Tracker / unavailable specs     |
| Failed                                         |            0 | S5 gate run (`e2e-full-run-latest.txt`)                      |
| Portal spec executions                         | 39/39 passed | 34 chromium portal + 5 mobile-chrome portal-mobile           |

**Accounting:** 48 passed + 13 skipped = 61 total. All 13 skips are non-portal P0.2C tests. Portal coverage (`portal-mobile`, `portal-phase2-security`, `portal-phase2-s5-security`) is complete at 39/39 with zero skips.

**Evidence sources:** `e2e-full-run-latest.txt`, `e2e-run-output.txt`, `playwright-full-e2e-run.txt` (lines prefixed `-` mark skipped tests).

---

## Skipped test register

### P0.2C Sign Tracker responsive (`e2e/p0.2c-responsive.spec.ts`)

| #   | Test name                                                                                               | Domain                   | Reason skipped                                                                        | Portal | Launch critical                         | Environment dependency                                                                                                  | Required before launch                                | Classification    |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------- | ------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------- |
| 1   | P0.2C Sign Tracker responsive — mobile-phone › critical workflow usable without horizontal overflow     | Sign Tracker / Marketing | `authenticateViaUi('sign_manager')` → missing credentials or `authProvisioned: false` | NO     | NO (portal) / YES (Sign Tracker module) | `secrets/staging-verification-credentials.json` with provisioned `sign_manager`; staging Firebase Auth (Email/Password) | NO (portal launch) / YES (full Sign Tracker E2E gate) | NON_PORTAL_NOT_S6 |
| 2   | P0.2C Sign Tracker responsive — tablet-portrait › critical workflow usable without horizontal overflow  | Sign Tracker / Marketing | Same                                                                                  | NO     | NO / YES                                | Same                                                                                                                    | NO / YES                                              | NON_PORTAL_NOT_S6 |
| 3   | P0.2C Sign Tracker responsive — tablet-landscape › critical workflow usable without horizontal overflow | Sign Tracker / Marketing | Same                                                                                  | NO     | NO / YES                                | Same                                                                                                                    | NO / YES                                              | NON_PORTAL_NOT_S6 |
| 4   | P0.2C Sign Tracker responsive — desktop › critical workflow usable without horizontal overflow          | Sign Tracker / Marketing | Same                                                                                  | NO     | NO / YES                                | Same                                                                                                                    | NO / YES                                              | NON_PORTAL_NOT_S6 |

### P0.2C authenticated Sign Tracker (`e2e/p0.2c-sign-tracker-auth.spec.ts`)

| #   | Test name                                                           | Domain                     | Reason skipped                                                        | Portal | Launch critical | Environment dependency                           | Required before launch | Classification    |
| --- | ------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------- | ------ | --------------- | ------------------------------------------------ | ---------------------- | ----------------- |
| 5   | authorized user opens canonical Sign Tracker with summary + filters | Sign Tracker / RBAC        | `authenticateViaUi('sign_manager')` skip                              | NO     | NO / YES        | `sign_manager` creds + staging Auth              | NO / YES               | NON_PORTAL_NOT_S6 |
| 6   | legacy field routes redirect to canonical destinations              | Sign Tracker / Routing     | `authenticateViaUi('owner')` skip                                     | NO     | NO / YES        | `owner` creds + staging Auth                     | NO / YES               | NON_PORTAL_NOT_S6 |
| 7   | create sign with required-field validation and list appearance      | Sign Tracker / CRUD        | `authenticateViaUi('sign_manager')` skip                              | NO     | NO / YES        | `sign_manager` creds + staging Auth              | NO / YES               | NON_PORTAL_NOT_S6 |
| 8   | export denied without permission; allowed with permission           | Sign Tracker / Permissions | `authenticateViaUi('no_export')` then `sign_manager` skip             | NO     | NO / YES        | `no_export`, `sign_manager` creds + staging Auth | NO / YES               | NON_PORTAL_NOT_S6 |
| 9   | viewer cannot create; read-only cannot mutate; suspended denied     | Sign Tracker / RBAC        | `authenticateViaUi('sign_viewer' \| 'read_only' \| 'suspended')` skip | NO     | NO / YES        | Multiple role creds + staging Auth               | NO / YES               | NON_PORTAL_NOT_S6 |
| 10  | module denial for warehouse role without sign_tracker               | Sign Tracker / Module gate | `authenticateViaUi('no_sign_module')` skip                            | NO     | NO / YES        | `no_sign_module` creds + staging Auth            | NO / YES               | NON_PORTAL_NOT_S6 |

### P0.2C unavailable features (`e2e/p0.2c-unavailable.spec.ts`)

| #   | Test name                                                                | Domain                   | Reason skipped                            | Portal | Launch critical | Environment dependency                                                             | Required before launch | Classification           |
| --- | ------------------------------------------------------------------------ | ------------------------ | ----------------------------------------- | ------ | --------------- | ---------------------------------------------------------------------------------- | ---------------------- | ------------------------ |
| 11  | map unavailable state is intentional when token missing                  | Platform / Mapbox        | `authenticateViaUi('owner')` skip         | NO     | NO              | `owner` creds + staging Auth; Mapbox token optional (test tolerates missing token) | NO                     | LEGITIMATE_PLATFORM_SKIP |
| 12  | follow-up automation is not in production navigation and API is disabled | Platform / Feature flags | `authenticateViaUi('owner')` skip         | NO     | NO              | `owner` creds + staging Auth                                                       | NO                     | LEGITIMATE_PLATFORM_SKIP |
| 13  | planned integrations are not connectable                                 | Platform / Integrations  | `authenticateViaUi('administrator')` skip | NO     | NO              | `administrator` creds + staging Auth                                               | NO                     | LEGITIMATE_PLATFORM_SKIP |

**Root cause (all 13):** S5 E2E ran with `E2E_BASE_URL=http://127.0.0.1:3000` (EMULATOR). Staging verification credentials are gitignored and not loaded in CI/emulator runs. Documented blocker **P0.2C-AUTH-001**: Firebase Auth Identity Toolkit not enabled on `yuletide-lighting-staging` (`auth/configuration-not-found`). See `docs/production-cleanup/p0.2-manual-verification.md`.

**Integration coverage note:** Sign Tracker permission, export denial, and module gates are partially covered by integration tests per P0.2C manual verification. UI E2E remains blocked until Auth is provisioned.

---

## Summary by classification

| Classification               | Count | Description                                                                                            |
| ---------------------------- | ----: | ------------------------------------------------------------------------------------------------------ |
| NON_PORTAL_NOT_S6            |    10 | P0.2C Sign Tracker responsive + auth specs; outside Portal P2-S6 scope; unblock via P0.2C staging Auth |
| LEGITIMATE_PLATFORM_SKIP     |     3 | P0.2C unavailable-feature specs; intentionally auth-gated; low portal-launch impact                    |
| PORTAL_REQUIRED_FIX_NOW      |     0 | —                                                                                                      |
| PORTAL_REQUIRES_REAL_STAGING |     0 | —                                                                                                      |
| OBSOLETE_TEST_REMOVE         |     0 | —                                                                                                      |

## PORTAL_REQUIRED_FIX_NOW items

**None.** All portal spec executions (39/39) passed in the S5 emulator run. No portal test uses `authenticateViaUi()` or runtime skip.

## S6 disposition

1. **Portal launch:** No action required on these 13 skips; portal E2E gate is green.
2. **P0.2C track (non-S6):** Enable Firebase Auth on staging, re-run `npm run provision:staging-verification -- --apply --project=yuletide-lighting-staging`, regenerate credentials with `authProvisioned: true`, then run `npm run test:e2e:staging` to unskip the 13 tests.
3. **Do not remove or quarantine** the skipped specs; skip behavior is correct for EMULATOR runs without staging secrets.

## Config reference

| File                                   | `testDir` | `testMatch` / projects                                   | Skip relevance                              |
| -------------------------------------- | --------- | -------------------------------------------------------- | ------------------------------------------- |
| `playwright.config.ts`                 | `./e2e`   | chromium (all) + mobile-chrome (`portal-mobile.spec.ts`) | Full 61-test suite; 13 auth-dependent skips |
| `playwright.portal-emulator.config.ts` | `./e2e`   | `portal-phase2*.spec.ts`, `portal-mobile.spec.ts`        | 39 portal tests; zero skips                 |
| `playwright.staging.config.ts`         | `./e2e`   | chromium (all) + mobile (`p0.2c-responsive.spec.ts`)     | Intended to unskip P0.2C when creds present |
