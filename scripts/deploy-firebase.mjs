import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(repoRoot, 'apps/web');
const rootEnvPath = path.join(repoRoot, '.env');
const stagingEnvPath = path.join(repoRoot, '.env.staging');
const webEnvPath = path.join(webRoot, '.env');
const webEnvBackupPath = path.join(webRoot, '.env.deploy-backup');
const firebaseJsonPath = path.join(repoRoot, 'firebase.json');
const firebaseJsonBackupPath = path.join(repoRoot, 'firebase.json.deploy-backup');
const only = process.argv.includes('--hosting-only') ? '--only hosting' : '';
const force =
  process.argv.includes('--force') || !process.argv.includes('--hosting-only') ? '--force' : '';

const projectArgIdx = process.argv.findIndex((a) => a === '--project');
const projectFromFlag = projectArgIdx >= 0 ? process.argv[projectArgIdx + 1] : null;
const projectAlias =
  process.env.FIREBASE_DEPLOY_PROJECT ||
  projectFromFlag ||
  (process.argv.includes('--staging') ? 'staging' : null) ||
  'production';

const PROJECT_BY_ALIAS = {
  production: 'yuletide-lighting',
  staging: 'yuletide-lighting-staging',
  default: 'yuletide-lighting',
};

/** Hosting frameworksBackend SA must live in the target project (S8-001). */
const SERVICE_ACCOUNT_BY_PROJECT = {
  'yuletide-lighting': 'firebase-adminsdk-fbsvc@yuletide-lighting.iam.gserviceaccount.com',
  'yuletide-lighting-staging':
    'firebase-adminsdk-fbsvc@yuletide-lighting-staging.iam.gserviceaccount.com',
};

const firebaseProject = PROJECT_BY_ALIAS[projectAlias] || projectAlias || 'yuletide-lighting';

const expectedServiceAccount = SERVICE_ACCOUNT_BY_PROJECT[firebaseProject];
if (!expectedServiceAccount) {
  throw new Error(
    `HARD FAIL: unknown Firebase deploy project "${firebaseProject}". ` +
      `Allowed: ${Object.keys(SERVICE_ACCOUNT_BY_PROJECT).join(', ')}`,
  );
}

const isStaging = firebaseProject === 'yuletide-lighting-staging';
if (firebaseProject === 'yuletide-lighting' && process.argv.includes('--staging')) {
  throw new Error('HARD FAIL: --staging resolved to production project');
}

const publicAppUrl = isStaging
  ? process.env.STAGING_APP_URL || 'https://yuletide-lighting-staging.web.app'
  : 'https://yuletide-lighting.web.app';
const envSourcePath = isStaging && fs.existsSync(stagingEnvPath) ? stagingEnvPath : rootEnvPath;

if (isStaging && !fs.existsSync(stagingEnvPath)) {
  throw new Error(
    'HARD FAIL: staging deploy requires .env.staging (gitignored). ' +
      'Copy .env.staging.example and fill NEXT_PUBLIC_FIREBASE_* from the staging web app.',
  );
}

if (!isStaging && !fs.existsSync(rootEnvPath)) {
  throw new Error(
    'HARD FAIL: production deploy requires .env (gitignored) with NEXT_PUBLIC_FIREBASE_* ' +
      'and PLATFORM_CREATOR_EMAILS (empty allowlist denies all /creator access in production).',
  );
}

const RESERVED_ENV_PREFIXES = ['X_GOOGLE_', 'FIREBASE_', 'EXT_'];

function isAllowedDeployEnvKey(key) {
  if (key.startsWith('NEXT_PUBLIC_')) return true;
  // Must ship with Hosting SSR — production denies /creator when both lists are empty.
  if (key === 'PLATFORM_CREATOR_EMAILS' || key === 'PLATFORM_CREATOR_UIDS') return true;
  return !RESERVED_ENV_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function parseEnvValue(lines, key) {
  const prefix = `${key}=`;
  const line = lines.find((entry) => entry.trim().startsWith(prefix));
  if (!line) return null;
  return line.slice(line.indexOf('=') + 1).trim();
}

function prepareEnv() {
  if (!fs.existsSync(envSourcePath)) {
    console.warn(`No env file at ${envSourcePath}; continuing without copied secrets.`);
    return;
  }
  if (fs.existsSync(webEnvPath) && !fs.existsSync(webEnvBackupPath)) {
    fs.copyFileSync(webEnvPath, webEnvBackupPath);
  }
  const lines = fs.readFileSync(envSourcePath, 'utf8').split(/\r?\n/);
  const droppedReserved = [];
  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return true;
    const key = trimmed.split('=')[0]?.trim();
    if (!key) return true;
    if (!isAllowedDeployEnvKey(key)) {
      droppedReserved.push(key);
      return false;
    }
    return true;
  });
  if (droppedReserved.length) {
    console.warn(
      `Stripped reserved Hosting env keys (${droppedReserved.length}): ${droppedReserved.join(', ')}`,
    );
  }
  const adminKey =
    parseEnvValue(lines, 'CLCRM_FIREBASE_ADMIN_KEY') ??
    parseEnvValue(lines, 'FIREBASE_SERVICE_ACCOUNT_KEY');
  if (adminKey) {
    kept.push(`CLCRM_FIREBASE_ADMIN_KEY=${adminKey}`);
  }
  let env = kept.join('\n');
  if (!/^NEXT_PUBLIC_APP_URL=/m.test(env)) {
    env += `\nNEXT_PUBLIC_APP_URL=${publicAppUrl}\n`;
  } else {
    env = env.replace(/^NEXT_PUBLIC_APP_URL=.*/m, `NEXT_PUBLIC_APP_URL=${publicAppUrl}`);
  }
  if (isStaging) {
    env = env.replace(
      /^NEXT_PUBLIC_FIREBASE_PROJECT_ID=.*/m,
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID=yuletide-lighting-staging',
    );
    if (!/^NEXT_PUBLIC_FIREBASE_PROJECT_ID=/m.test(env)) {
      env += '\nNEXT_PUBLIC_FIREBASE_PROJECT_ID=yuletide-lighting-staging\n';
    }
  }

  const creatorEmails = parseEnvValue(lines, 'PLATFORM_CREATOR_EMAILS');
  const creatorUids = parseEnvValue(lines, 'PLATFORM_CREATOR_UIDS');
  if (
    !isStaging &&
    !(creatorEmails && creatorEmails.trim()) &&
    !(creatorUids && creatorUids.trim())
  ) {
    throw new Error(
      'HARD FAIL: production Hosting deploy requires PLATFORM_CREATOR_EMAILS or PLATFORM_CREATOR_UIDS. ' +
        'Empty allowlist denies all Creator Console access in production.',
    );
  }

  fs.writeFileSync(webEnvPath, env.endsWith('\n') ? env : `${env}\n`);
  console.log(
    `Copied ${path.basename(envSourcePath)} to apps/web for Firebase build (project=${firebaseProject}).`,
  );
}

function restoreEnv() {
  if (fs.existsSync(webEnvBackupPath)) {
    fs.copyFileSync(webEnvBackupPath, webEnvPath);
    fs.rmSync(webEnvBackupPath);
  } else if (fs.existsSync(webEnvPath)) {
    fs.rmSync(webEnvPath);
  }
}

function applyHostingServiceAccount() {
  if (!fs.existsSync(firebaseJsonBackupPath)) {
    fs.copyFileSync(firebaseJsonPath, firebaseJsonBackupPath);
  }
  const config = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
  if (!config.hosting) config.hosting = {};
  if (!config.hosting.frameworksBackend) config.hosting.frameworksBackend = {};
  config.hosting.frameworksBackend.serviceAccount = expectedServiceAccount;

  const applied = config.hosting.frameworksBackend.serviceAccount;
  if (applied !== expectedServiceAccount) {
    throw new Error(
      `HARD FAIL: frameworksBackend.serviceAccount mismatch (got ${applied}, want ${expectedServiceAccount})`,
    );
  }
  if (isStaging && applied.includes('@yuletide-lighting.iam.gserviceaccount.com')) {
    throw new Error(
      'HARD FAIL: staging Hosting deploy would bind production service account (S8-001)',
    );
  }

  fs.writeFileSync(firebaseJsonPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`frameworksBackend.serviceAccount → ${applied} (project=${firebaseProject})`);
}

function restoreFirebaseJson() {
  if (fs.existsSync(firebaseJsonBackupPath)) {
    fs.copyFileSync(firebaseJsonBackupPath, firebaseJsonPath);
    fs.rmSync(firebaseJsonBackupPath);
  }
}

const nodeMajor = Number(process.version.slice(1).split('.')[0]);
// YL-S24 — keep in sync with packages/types/src/runtime-policy.ts (FIREBASE_NODE_ENGINE_MAJOR).
const FIREBASE_NODE_ENGINE_MAJOR = 22;
if (nodeMajor !== FIREBASE_NODE_ENGINE_MAJOR) {
  console.warn(
    `\n⚠️  Node ${process.version} detected. Yuletide Firebase Hosting SSR expects Node ${FIREBASE_NODE_ENGINE_MAJOR} ` +
      `(engines "22", runtime nodejs22; nodejs20 decommissions 2026-10-30).\n` +
      `   On Windows: winget install OpenJS.NodeJS.22\n` +
      `   Or: nvm install 22 && nvm use 22\n`,
  );
}

try {
  console.log(
    `Deploy target project=${firebaseProject} identity-check SA=${expectedServiceAccount}`,
  );
  // Next.js frameworks Hosting loads Cloud Functions source; cold analysis often exceeds 10s.
  if (!process.env.FUNCTIONS_DISCOVERY_TIMEOUT) {
    process.env.FUNCTIONS_DISCOVERY_TIMEOUT = '120';
  }
  applyHostingServiceAccount();
  prepareEnv();
  execSync('node scripts/prepare-firebase-deps.mjs', { cwd: webRoot, stdio: 'inherit' });
  execSync(
    `firebase deploy ${only} ${force} --project ${firebaseProject}`.replace(/\s+/g, ' ').trim(),
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    },
  );
} finally {
  execSync('node scripts/prepare-firebase-deps.mjs --restore', { cwd: webRoot, stdio: 'inherit' });
  restoreEnv();
  restoreFirebaseJson();
}
