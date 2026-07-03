# Yuletide Lighting

Multi-tenant Christmas light installer CRM — **Firebase-first** on project `yuletide-lighting`.

## Firebase services

| Service | Purpose |
|---------|---------|
| **Hosting** | Next.js web app (marketing + admin + customer portal) |
| **Authentication** | Email/password sign-in for installers and crew |
| **Firestore** | All CRM data (customers, proposals, jobs, inventory, messages) |
| **Storage** | Property photos, mockups, job photos, PDFs |

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Web: http://localhost:3000

## Firebase setup (already done)

- Project: **Yuletide Lighting** (`yuletide-lighting`)
- Web app registered with SDK config in `.env.example`
- Firestore database + security rules deployed

### One-time console steps

1. **Enable Email/Password auth**: [Firebase Console → Authentication](https://console.firebase.google.com/project/yuletide-lighting/authentication) → Sign-in method → Email/Password → Enable
2. **Enable Storage**: [Firebase Console → Storage](https://console.firebase.google.com/project/yuletide-lighting/storage) → Get started → then run:

```bash
npm run deploy:rules
```

3. **Service account** (local dev): Project Settings → Service accounts → Generate key → set `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env` as JSON string. On Firebase Hosting, Application Default Credentials work automatically.

## Deploy

One-time (already done on this machine):

```bash
firebase experiments:enable webframeworks
```

**Important:** This is an npm workspaces monorepo. Do not run bare `firebase deploy` — workspace packages (`@clcrm/api`, etc.) are not on npm. Always use:

```bash
npm run deploy:hosting    # web app only
npm run deploy:firebase   # hosting + firestore + storage rules
```

These scripts pack local packages into `apps/web/local_deps/` before deploy and restore `package.json` afterward.

Use **Node 20** for deploy (Firebase does not support Node 24 yet).

**Windows — you don't have `nvm`. Pick one:**

Option A — **nvm-windows** (recommended if you switch Node versions often):
```powershell
winget install CoreyButler.NVMforWindows --accept-package-agreements --accept-source-agreements
```
Close and reopen PowerShell, then:
```powershell
nvm install 20
nvm use 20
node --version   # should show v20.x
```

Option B — **Install Node 20 directly** (replaces your current Node):
```powershell
winget install OpenJS.NodeJS.20 --accept-package-agreements --accept-source-agreements
```
Restart the terminal, then `node --version`.

Then deploy:
npm run deploy:hosting     # web only
npm run deploy:rules       # firestore + storage rules
```

## Stack

- Turborepo monorepo
- Next.js 15 + tRPC + Tailwind
- `@yuletide/firebase` package (Admin + Client SDK)
- Expo crew mobile app
- Stripe Billing + Connect
- Twilio + Resend for messaging
- Inngest for automations

## Data model (Firestore)

```
users/{firebaseUid}
organizations/{orgId}
organizations/{orgId}/customers/{id}
organizations/{orgId}/properties/{id}
organizations/{orgId}/proposals/{id}
organizations/{orgId}/jobs/{id}
organizations/{orgId}/invoices/{id}
organizations/{orgId}/inventoryItems/{id}
organizations/{orgId}/messages/{id}
organizations/{orgId}/mockups/{id}
```

Storage paths: `organizations/{orgId}/{folder}/{filename}`

## Rename local folder (optional)

If the repo is still named `christmas-light-crm`, close Cursor and rename:

```powershell
Rename-Item ~\Projects\christmas-light-crm yuletide-lighting
```
