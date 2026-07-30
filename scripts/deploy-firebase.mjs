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
const only = process.argv.includes('--hosting-only') ? '--only hosting' : '';
const force = process.argv.includes('--force') || !process.argv.includes('--hosting-only')
  ? '--force'
  : '';

const projectArgIdx = process.argv.findIndex((a) => a === '--project');
const projectFromFlag =
  projectArgIdx >= 0 ? process.argv[projectArgIdx + 1] : null;
const projectAlias = process.env.FIREBASE_DEPLOY_PROJECT
  || projectFromFlag
  || (process.argv.includes('--staging') ? 'staging' : null)
  || 'production';

const PROJECT_BY_ALIAS = {
  production: 'yuletide-lighting',
  staging: 'yuletide-lighting-staging',
  default: 'yuletide-lighting',
};

const firebaseProject =
  PROJECT_BY_ALIAS[projectAlias] || projectAlias || 'yuletide-lighting';

const isStaging = firebaseProject === 'yuletide-lighting-staging';
const publicAppUrl = isStaging
  ? (process.env.STAGING_APP_URL || 'https://yuletide-lighting-staging.web.app')
  : 'https://yuletide-lighting.web.app';
const envSourcePath = isStaging && fs.existsSync(stagingEnvPath)
  ? stagingEnvPath
  : rootEnvPath;

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
  if (!fs.existsSync(envSourcePath)) {
    console.warn(`No env file at ${envSourcePath}; continuing without copied secrets.`);
    return;
  }
  if (fs.existsSync(webEnvPath) && !fs.existsSync(webEnvBackupPath)) {
    fs.copyFileSync(webEnvPath, webEnvBackupPath);
  }
  const lines = fs.readFileSync(envSourcePath, 'utf8').split(/\r?\n/);
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
    env += `\nNEXT_PUBLIC_APP_URL=${publicAppUrl}\n`;
  } else {
    env = env.replace(
      /^NEXT_PUBLIC_APP_URL=.*/m,
      `NEXT_PUBLIC_APP_URL=${publicAppUrl}`,
    );
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
  fs.writeFileSync(webEnvPath, env.endsWith('\n') ? env : `${env}\n`);
  console.log(`Copied ${path.basename(envSourcePath)} to apps/web for Firebase build (project=${firebaseProject}).`);
}

function restoreEnv() {
  if (fs.existsSync(webEnvBackupPath)) {
    fs.copyFileSync(webEnvBackupPath, webEnvPath);
    fs.rmSync(webEnvBackupPath);
  } else if (fs.existsSync(webEnvPath)) {
    fs.rmSync(webEnvPath);
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
  execSync('node scripts/prepare-firebase-deps.mjs', { cwd: webRoot, stdio: 'inherit' });
  execSync(`firebase deploy ${only} ${force} --project ${firebaseProject}`.replace(/\s+/g, ' ').trim(), {
    cwd: repoRoot,
    stdio: 'inherit',
  });
} finally {
  execSync('node scripts/prepare-firebase-deps.mjs --restore', { cwd: webRoot, stdio: 'inherit' });
  restoreEnv();
}
