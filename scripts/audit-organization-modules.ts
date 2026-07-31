/**
 * Read-only audit of organization module configuration.
 *
 * Usage:
 *   npx tsx scripts/audit-organization-modules.ts
 *   npx tsx scripts/audit-organization-modules.ts --project=yuletide-lighting-staging
 *   npx tsx scripts/audit-organization-modules.ts --emulator --redact
 *
 * Never mutates records. Prefer --redact before committing summary docs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  KNOWN_MODULE_KEYS,
  organizationNeedsModuleMigration,
  unknownModuleKeys,
  type OrgModuleSnapshot,
} from '../packages/types/src/module-presets.ts';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
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

function parseArgs(argv: string[]) {
  const flags = new Set<string>();
  const values: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq > 0) {
      values[arg.slice(2, eq)] = arg.slice(eq + 1);
      flags.add(arg.slice(2, eq));
    } else {
      flags.add(arg.slice(2));
    }
  }
  return { flags, values };
}

function initDb(projectId: string, emulator: boolean) {
  if (emulator) process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  if (!getApps().length) {
    const key = process.env.CLCRM_FIREBASE_ADMIN_KEY ?? process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (key) initializeApp({ credential: cert(JSON.parse(key)), projectId });
    else if (emulator || process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId });
    else initializeApp({ credential: applicationDefault(), projectId });
  }
  return getFirestore();
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (
    typeof value === 'object' &&
    value &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

type AuditRow = {
  organizationId: string;
  organizationName: string;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  subscriptionTier: string | null;
  enabledModules: string[] | null;
  missingEnabledModules: boolean;
  emptyEnabledModules: boolean;
  unknownModuleKeys: string[];
  disabledModules: string[];
  portalEnabledFeatures: string[] | null;
  createdAt: string | null;
  updatedAt: string | null;
  configurationSchemaVersion: number | null;
  migrationRequired: boolean;
};

async function main() {
  loadEnv();
  const { flags, values } = parseArgs(process.argv.slice(2));
  const emulator = flags.has('emulator');
  // Always redact org names for non-emulator runs (safe for commit summaries).
  const redact = flags.has('redact') || !emulator;
  const staging = flags.has('staging');
  const projectId =
    values.project ||
    (staging ? 'yuletide-lighting-staging' : undefined) ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'yuletide-lighting';

  if (!emulator && process.env.FIRESTORE_EMULATOR_HOST) {
    console.error(
      `Refusing non-emulator audit: FIRESTORE_EMULATOR_HOST=${process.env.FIRESTORE_EMULATOR_HOST}. Unset it for staging/production.`,
    );
    process.exit(1);
  }
  if (flags.has('apply')) {
    console.error('Audit script is read-only. --apply is not supported.');
    process.exit(1);
  }

  console.log(`Audit project confirmation: ${projectId}`);
  console.log(`Emulator mode: ${emulator}`);
  console.log(`FIRESTORE_EMULATOR_HOST: ${process.env.FIRESTORE_EMULATOR_HOST || '(unset)'}`);
  console.log('Writes: NONE (read-only)');

  const db = initDb(projectId, emulator);
  const snap = await db.collection('organizations').get();
  const rows: AuditRow[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const enabled = Array.isArray(data.enabledModules)
      ? (data.enabledModules as string[])
      : data.enabledModules == null
        ? null
        : [];
    const portalSnap = await db.doc(`organizations/${doc.id}/settings/portal`).get();
    const portalFeatures = portalSnap.exists
      ? ((portalSnap.data()?.enabledFeatures as string[] | undefined) ?? null)
      : null;

    const snapshot: OrgModuleSnapshot = {
      enabledModules: enabled,
      disabledModules: data.disabledModules,
      subscriptionStatus: data.subscriptionStatus,
      subscriptionPlan: data.subscriptionPlan,
      subscriptionTier: data.subscriptionTier,
      configurationSchemaVersion: data.configurationSchemaVersion,
    };

    rows.push({
      organizationId: doc.id,
      organizationName: redact
        ? `[redacted:${doc.id.slice(0, 6)}]`
        : String(data.companyName ?? ''),
      subscriptionStatus: data.subscriptionStatus ?? null,
      subscriptionPlan: data.subscriptionPlan ?? null,
      subscriptionTier: data.subscriptionTier ?? null,
      enabledModules: enabled,
      missingEnabledModules: enabled == null,
      emptyEnabledModules: Array.isArray(enabled) && enabled.length === 0,
      unknownModuleKeys: unknownModuleKeys(enabled ?? []),
      disabledModules: Array.isArray(data.disabledModules) ? data.disabledModules : [],
      portalEnabledFeatures: portalFeatures,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
      configurationSchemaVersion:
        typeof data.configurationSchemaVersion === 'number'
          ? data.configurationSchemaVersion
          : null,
      migrationRequired: organizationNeedsModuleMigration(snapshot),
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    projectId,
    emulator,
    redact,
    organizationsScanned: rows.length,
    missingModuleConfiguration: rows.filter((r) => r.missingEnabledModules).length,
    emptyModuleConfiguration: rows.filter((r) => r.emptyEnabledModules).length,
    unknownKeys: rows.reduce((n, r) => n + r.unknownModuleKeys.length, 0),
    migrationRequired: rows.filter((r) => r.migrationRequired).length,
    knownModuleKeyCount: KNOWN_MODULE_KEYS.size,
  };

  const outDir = path.join(repoRoot, 'docs/production-cleanup');
  const privateDir = path.join(outDir, '.audit-private');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(privateDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(privateDir, `organization-module-audit-${projectId}-${stamp}.json`);
  const mdPath = path.join(outDir, 'organization-module-audit.md');
  const csvPath = path.join(privateDir, `organization-module-audit-${projectId}-${stamp}.csv`);

  fs.writeFileSync(jsonPath, JSON.stringify({ summary, organizations: rows }, null, 2));

  const csvHeader = [
    'organizationId',
    'organizationName',
    'subscriptionStatus',
    'subscriptionPlan',
    'subscriptionTier',
    'missingEnabledModules',
    'emptyEnabledModules',
    'unknownModuleKeys',
    'migrationRequired',
    'enabledModulesCount',
  ].join(',');
  const csvBody = rows
    .map((r) =>
      [
        r.organizationId,
        JSON.stringify(r.organizationName),
        r.subscriptionStatus ?? '',
        r.subscriptionPlan ?? '',
        r.subscriptionTier ?? '',
        r.missingEnabledModules,
        r.emptyEnabledModules,
        r.unknownModuleKeys.join('|'),
        r.migrationRequired,
        r.enabledModules?.length ?? 0,
      ].join(','),
    )
    .join('\n');
  fs.writeFileSync(csvPath, `${csvHeader}\n${csvBody}\n`);

  const migrationLines = rows
    .filter((r) => r.migrationRequired)
    .slice(0, 100)
    .map(
      (r) =>
        `- \`${r.organizationId}\` status=${r.subscriptionStatus ?? 'n/a'} missing=${r.missingEnabledModules} empty=${r.emptyEnabledModules} unknown=${r.unknownModuleKeys.length}`,
    )
    .join('\n');

  const md = `# Organization module audit

Generated: ${summary.generatedAt}  
Project: \`${summary.projectId}\`  
Emulator: ${summary.emulator}  
Redacted: ${summary.redact}

## Summary

| Metric | Count |
|--------|------:|
| Organizations scanned | ${summary.organizationsScanned} |
| Missing enabledModules | ${summary.missingModuleConfiguration} |
| Empty enabledModules | ${summary.emptyModuleConfiguration} |
| Unknown module key occurrences | ${summary.unknownKeys} |
| Migration required | ${summary.migrationRequired} |

## Notes

- This audit is **read-only**.
- Do not commit unredacted organization names or customer-identifying values.
- JSON/CSV outputs are gitignored; commit only redacted summaries when needed.

## Organizations requiring migration

${migrationLines || '_No migrations required._'}
`;
  fs.writeFileSync(mdPath, md);

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${csvPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
