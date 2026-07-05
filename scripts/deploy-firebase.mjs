import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(repoRoot, 'apps/web');
const rootEnvPath = path.join(repoRoot, '.env');
const webEnvPath = path.join(webRoot, '.env');
const webEnvBackupPath = path.join(webRoot, '.env.deploy-backup');
const only = process.argv.includes('--hosting-only') ? '--only hosting' : '';

const RESERVED_ENV_PREFIXES = ['X_GOOGLE_', 'FIREBASE_', 'EXT_'];

function isAllowedDeployEnvKey(key) {
  if (key.startsWith('NEXT_PUBLIC_')) return true;
  return !RESERVED_ENV_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function parseEnvValue(lines, key) {
  const prefix = `${key}=`;
  const line = lines.find((entry) => entry.trim().startsWith(prefix));
  if (!line) return null;
  return line.slice(line.indexOf('=') + 1).trim();
}

function prepareEnv() {
  if (!fs.existsSync(rootEnvPath)) return;
  if (fs.existsSync(webEnvPath) && !fs.existsSync(webEnvBackupPath)) {
    fs.copyFileSync(webEnvPath, webEnvBackupPath);
  }
  const lines = fs.readFileSync(rootEnvPath, 'utf8').split(/\r?\n/);
  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return true;
    const key = trimmed.split('=')[0]?.trim();
    return key ? isAllowedDeployEnvKey(key) : true;
  });
  const adminKey = parseEnvValue(lines, 'CLCRM_FIREBASE_ADMIN_KEY') ?? parseEnvValue(lines, 'FIREBASE_SERVICE_ACCOUNT_KEY');
  if (adminKey) {
    kept.push(`CLCRM_FIREBASE_ADMIN_KEY=${adminKey}`);
  }
  let env = kept.join('\n');
  if (!/^NEXT_PUBLIC_APP_URL=/m.test(env)) {
    env += '\nNEXT_PUBLIC_APP_URL=https://yuletide-lighting.web.app\n';
  } else {
    env = env.replace(
      /^NEXT_PUBLIC_APP_URL=.*/m,
      'NEXT_PUBLIC_APP_URL=https://yuletide-lighting.web.app',
    );
  }
  fs.writeFileSync(webEnvPath, env.endsWith('\n') ? env : `${env}\n`);
  console.log('Copied root .env to apps/web for Firebase build (server secrets filtered).');
}

function isValidTinaCredentials(lines) {
  const clientId = parseEnvValue(lines, 'NEXT_PUBLIC_TINA_CLIENT_ID');
  const token = parseEnvValue(lines, 'TINA_TOKEN');
  return Boolean(
    clientId &&
      token &&
      clientId !== 'local' &&
      token !== 'local' &&
      !clientId.startsWith('your_') &&
      !token.startsWith('your_'),
  );
}

function buildTinaAdmin() {
  if (!fs.existsSync(rootEnvPath)) return;
  const lines = fs.readFileSync(rootEnvPath, 'utf8').split(/\r?\n/);
  if (!isValidTinaCredentials(lines)) {
    console.log('Skipping Tina admin build — set NEXT_PUBLIC_TINA_CLIENT_ID and TINA_TOKEN in .env');
    return;
  }
  const tinaEnv = Object.fromEntries(
    ['NEXT_PUBLIC_TINA_CLIENT_ID', 'TINA_TOKEN', 'NEXT_PUBLIC_TINA_BRANCH', 'GITHUB_BRANCH']
      .map((key) => [key, parseEnvValue(lines, key)])
      .filter(([, value]) => value),
  );
  console.log('Building Tina CMS admin for production...');
  execSync('npx tinacms build --skip-cloud-checks --datalayer-port 9001', {
    cwd: webRoot,
    stdio: 'inherit',
    env: { ...process.env, ...tinaEnv },
  });
  const adminDir = path.join(webRoot, 'public/admin/assets');
  const assets = fs.existsSync(adminDir)
    ? fs.readdirSync(adminDir).filter((name) => name.endsWith('.js'))
    : [];
  for (const file of assets) {
    const js = fs.readFileSync(path.join(adminDir, file), 'utf8');
    if (js.includes('clientId:"local"') || js.includes("clientId:'local'")) {
      throw new Error(`Tina admin bundle ${file} still uses clientId=local. Check .env credentials.`);
    }
  }
  console.log('Tina admin verified — Cloud client ID embedded.');
}

function restoreEnv() {
  if (fs.existsSync(webEnvBackupPath)) {
    fs.copyFileSync(webEnvBackupPath, webEnvPath);
    fs.rmSync(webEnvBackupPath);
  } else if (fs.existsSync(webEnvPath)) {
    fs.rmSync(webEnvPath);
  }
}

function configureFirebaseAuth() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('Using GOOGLE_APPLICATION_CREDENTIALS for Firebase deploy.');
    return;
  }

  const serviceAccountJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_YULETIDE_LIGHTING ??
    process.env.FIREBASE_SERVICE_ACCOUNT ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (serviceAccountJson?.trim()) {
    const credPath = path.join(repoRoot, '.firebase-deploy-sa.json');
    fs.writeFileSync(credPath, serviceAccountJson.trim());
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    console.log('Using service account JSON for Firebase deploy (no FIREBASE_TOKEN needed).');
    return;
  }

  if (process.env.FIREBASE_TOKEN) {
    console.log('Using FIREBASE_TOKEN for Firebase deploy.');
    return;
  }

  throw new Error(
    'No Firebase deploy credentials found.\n' +
      'Option A (recommended): run `firebase login` then `firebase init hosting:github` — Firebase uploads the GitHub secret for you.\n' +
      'Option B (local only): run `firebase login` then `npm run deploy:hosting`.\n' +
      'Option C: add FIREBASE_TOKEN or FIREBASE_SERVICE_ACCOUNT_YULETIDE_LIGHTING to GitHub secrets.',
  );
}

function cleanupFirebaseAuth() {
  const credPath = path.join(repoRoot, '.firebase-deploy-sa.json');
  if (fs.existsSync(credPath)) fs.rmSync(credPath);
}

function ensureWebFrameworksExperiment() {
  console.log('Enabling Firebase webframeworks experiment (required for Next.js hosting)...');
  try {
    execSync('npx firebase-tools experiments:enable webframeworks --project yuletide-lighting', {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    });
  } catch {
    console.log('webframeworks experiment already enabled or enable skipped.');
  }
}

const nodeMajor = Number(process.version.slice(1).split('.')[0]);
if (nodeMajor > 20) {
  console.warn(
    `\n⚠️  Node ${process.version} detected. Firebase recommends Node 20 for deploy.\n` +
      `   On Windows without nvm: winget install OpenJS.NodeJS.20\n` +
      `   Or: winget install CoreyButler.NVMforWindows  then  nvm install 20 && nvm use 20\n`,
  );
}

try {
  prepareEnv();
  buildTinaAdmin();
  configureFirebaseAuth();
  ensureWebFrameworksExperiment();
  execSync('node scripts/prepare-firebase-deps.mjs', { cwd: webRoot, stdio: 'inherit' });
  execSync(`npx firebase-tools deploy ${only} --project yuletide-lighting`.trim(), {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
} finally {
  execSync('node scripts/prepare-firebase-deps.mjs --restore', { cwd: webRoot, stdio: 'inherit' });
  cleanupFirebaseAuth();
  restoreEnv();
}
