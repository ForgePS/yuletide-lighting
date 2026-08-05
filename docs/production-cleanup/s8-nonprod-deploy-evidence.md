# S8 Nonprod Deploy Evidence

**PHASE:** PORTAL-P2-S8  
**DATE:** 2026-08-05  
**IDENTITY:** `admin@forgepublicsafety.com`  
**TARGET:** `yuletide-lighting-staging` (VERIFIED_NONPRODUCTION)  
**RC / STATUS SHA (rules pass):** `414dbf90e527ab1886a76c44b791f4f4d6569c69`  
**HOSTING DEPLOY SHA:** `d98669ba51de200ccceb826357f4631773047129`  
**PRODUCTION PROJECT CONTACTED FOR DEPLOY:** **NO**

## Hard gates (all PASS)

1. Identity recorded: `admin@forgepublicsafety.com`
2. Target ID: `yuletide-lighting-staging`
3. Target ≠ `yuletide-lighting`
4. Deploy used `scripts/deploy-firebase.mjs` SA rewrite (S8-001)

## Deploy log

| Step | Command scope | Result | Notes |
| ---- | ------------- | ------ | ----- |
| 1 | `firestore:rules,firestore:indexes,storage` | **FAIL** | Storage not set up (0 buckets) |
| 2 | `firestore:rules,firestore:indexes` | **PASS** | Rules released; indexes deployed for `(default)` |
| 3 | `storage` (retry before Get Started) | **FAIL** | API enabled, still 0 buckets |
| 4 | `storage` (after console Get Started) | **PASS** | Bucket `yuletide-lighting-staging.firebasestorage.app`; storage rules released |
| 5 | Hosting `--hosting-only` (first) | **FAIL** | Cloud Functions API not enabled |
| 6 | Hosting `--hosting-only` (after API enable) | **PARTIAL** | Hosting+SSR function created; CLI exited on Artifact Registry cleanup policy |
| 7 | Hosting `--hosting-only --force` | **PASS** | Deploy complete; Hosting URL live |

## Staging Hosting

- URL: https://yuletide-lighting-staging.web.app
- Web app ID: `1:636852862858:web:004bc578eb8aa7a2ecd273`
- SSR function: `ssryuletidelightingstag` (us-central1)
- frameworksBackend SA at deploy: staging adminsdk (rewritten; checked-in `firebase.json` restored to production SA)

## Anonymous smoke (2026-08-05)

| Check | Result |
| ----- | ------ |
| `/api/health` | **200** `status=ok` (Stripe/Twilio unset as intended) |
| `/` | **200** |
| Function direct health | **200** before Hosting finalize |
| Staff auth / portal session | **NOT RUN** (Auth users / provision not confirmed) |
| REAL_CHARGES / EMAIL / SMS | **0** |

```text
SMOKE_ENV=yuletide-lighting-staging
SMOKE_SHA=d98669ba51de200ccceb826357f4631773047129
SMOKE_RESULT=PARTIAL_PASS
REAL_CHARGES=0
REAL_EMAIL=0
REAL_SMS=0
```

## Not done on production

- Hosting / Functions / rules / storage deploy: **NO**
- Firestore/Auth data reads/writes: **0**

## Remaining for READY_FOR_GO_LIVE_AUTHORIZATION

1. Enable Email/Password Auth on staging if needed
2. Provision/seed staging verification tenant + staff login
3. Complete authenticated smoke (staff + portal session/tokenless)
4. Keep Stripe/Twilio empty or test-mode only
