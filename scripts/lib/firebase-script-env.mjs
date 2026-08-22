import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function loadEnv() {
  const envPath = path.join(repoRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

export function resolveProjectId(explicit) {
  if (explicit) return explicit;
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return (
      process.env.GCLOUD_PROJECT ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      'yuletide-rules-test'
    );
  }
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'yuletide-lighting'
  );
}

/**
 * @param {{ projectId?: string; emulator?: boolean }} opts
 */
export function initAdminFirestore(opts = {}) {
  loadEnv();
  if (opts.emulator) {
    process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  }
  const projectId = resolveProjectId(opts.projectId);
  if (!getApps().length) {
    const key = process.env.CLCRM_FIREBASE_ADMIN_KEY ?? process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (key) {
      initializeApp({ credential: cert(JSON.parse(key)), projectId });
    } else if (opts.emulator || process.env.FIRESTORE_EMULATOR_HOST) {
      initializeApp({ projectId });
    } else {
      initializeApp({ credential: applicationDefault(), projectId });
    }
  }
  return { db: getFirestore(), projectId, repoRoot };
}

export function parseArgs(argv = process.argv.slice(2)) {
  const flags = new Set();
  /** @type {Record<string, string>} */
  const values = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq > 0) {
        values[arg.slice(2, eq)] = arg.slice(eq + 1);
        flags.add(arg.slice(2, eq));
      } else {
        flags.add(arg.slice(2));
      }
    }
  }
  return { flags, values };
}
