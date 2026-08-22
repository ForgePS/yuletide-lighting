# Production Go-Live Evidence

**DATE:** 2026-08-08  
**IDENTITY:** `admin@forgepublicsafety.com`  
**TARGET:** `yuletide-lighting` (PRODUCTION)  
**SHA:** `1583f01aa2ba6b1ea1961bcec9bd8e33ef69b95a`  
**BRANCH:** `release/yuletide-go-live-readiness`

## Deploy

```text
firebase deploy --only firestore:rules,firestore:indexes,storage,hosting --project yuletide-lighting --force
FUNCTIONS_DISCOVERY_TIMEOUT=120
Node: v20.20.2
DEPLOY_EXIT=0
```

| Service | Result |
| ------- | ------ |
| Firestore rules | released |
| Firestore indexes | deployed |
| Storage rules | released |
| Hosting | release complete — https://yuletide-lighting.web.app |
| SSR function | `ssryuletidelighting` updated (us-central1) |

First attempt failed on Functions discovery timeout; succeeded after Node 20 + `FUNCTIONS_DISCOVERY_TIMEOUT=120`.

## Post-deploy anonymous smoke

| URL | Result |
| --- | ------ |
| `https://yuletide-lighting.web.app/api/health` | **200** |
| `https://yuletide-lighting.web.app/` | **200** |
| `https://yuletide-lighting.web.app/sign-in` | **200** |

Staff/portal authenticated smoke on production: run manually with real accounts (do not use staging verification users).

## Side effects intentionally not done

- Portal token migration: **NO**
- Seed/cleanup scripts against production: **NO**
