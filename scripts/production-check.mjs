#!/usr/bin/env node
/**
 * Production-readiness gate for Yuletide Lighting CRM.
 * Exit nonzero when any launch blocker remains.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const args = new Set(process.argv.slice(2));
const skipBuild = args.has('--skip-build');
const skipLint = args.has('--skip-lint');
const auditsOnly = args.has('--audits-only');

/** @type {Array<{ name: string; severity: string; category: string; status: string; file?: string; line?: number; problem: string; correction: string; docs?: string }>} */
const findings = [];

function add(finding) {
  findings.push(finding);
  const icon = finding.status === 'PASS' ? '✓' : finding.status === 'WARN' ? '!' : '✗';
  console.log(
    `${icon} [${finding.severity}/${finding.status}] ${finding.name}` +
      (finding.file ? ` @ ${finding.file}${finding.line ? `:${finding.line}` : ''}` : '') +
      ` — ${finding.problem}`,
  );
  if (finding.status !== 'PASS') {
    console.log(`    Fix: ${finding.correction}`);
    if (finding.docs) console.log(`    Docs: ${finding.docs}`);
  }
}

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env });
}

function tryRun(name, category, cmd, correction) {
  try {
    run(cmd);
    add({
      name,
      severity: 'info',
      category,
      status: 'PASS',
      problem: 'passed',
      correction: 'n/a',
    });
    return true;
  } catch {
    add({
      name,
      severity: 'launch',
      category,
      status: 'FAIL',
      problem: `command failed: ${cmd}`,
      correction,
      docs: 'docs/production-cleanup/baseline.md',
    });
    return false;
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForPortsFree(ports, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    let busy = false;
    for (const port of ports) {
      try {
        execSync(
          `node -e "const n=require('net');const s=n.createServer();s.once('error',()=>process.exit(1));s.listen(${port},'127.0.0.1',()=>s.close(()=>process.exit(0)));"`,
          {
            stdio: 'ignore',
          },
        );
      } catch {
        busy = true;
        break;
      }
    }
    if (!busy) return true;
    sleep(1000);
  }
  return false;
}

/**
 * Run an emulator-backed suite with port readiness + one infrastructure retry.
 * Assertion failures must not be retried as infrastructure failures.
 */
function tryRunEmulatorSuite(name, category, cmd, correction) {
  const ports = [8080, 9199, 4400];
  waitForPortsFree(ports, 20000);

  const runOnce = () => {
    try {
      const result = execSync(cmd, {
        cwd: root,
        env: process.env,
        encoding: 'utf8',
        stdio: ['inherit', 'pipe', 'pipe'],
        maxBuffer: 20 * 1024 * 1024,
      });
      process.stdout.write(result);
      return { ok: true, output: result };
    } catch (err) {
      const stdout =
        err && typeof err === 'object' && 'stdout' in err ? String(err.stdout ?? '') : '';
      const stderr =
        err && typeof err === 'object' && 'stderr' in err ? String(err.stderr ?? '') : '';
      process.stdout.write(stdout);
      process.stderr.write(stderr);
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, output: `${message}\n${stdout}\n${stderr}` };
    }
  };

  let first = runOnce();
  if (first.ok) {
    add({
      name,
      severity: 'info',
      category,
      status: 'PASS',
      problem: 'passed',
      correction: 'n/a',
    });
    waitForPortsFree(ports, 15000);
    return true;
  }

  const infrastructureHints =
    /EADDRINUSE|port.*already|emulator.*fail|failed to start|Could not start|TIMEOUT|timed out|Java|ENOMEM|spawn/i;
  // Never treat vitest assertion failures as infrastructure — only retry start/port errors.
  const mayRetry = infrastructureHints.test(first.output);
  if (mayRetry) {
    console.warn(
      `[${name}] first attempt failed; evaluating one infrastructure retry. Original failure preserved below.`,
    );
    console.warn(first.output.slice(0, 500));
    waitForPortsFree(ports, 30000);
    sleep(2000);
    const second = runOnce();
    if (second.ok) {
      add({
        name,
        severity: 'warning',
        category,
        status: 'WARN',
        problem: 'passed after one infrastructure retry (original failure retained in logs)',
        correction: 'Investigate emulator startup flake; do not ignore assertion failures',
        docs: 'docs/production-cleanup/production-check-stability.md',
      });
      waitForPortsFree(ports, 15000);
      return true;
    }
  }

  add({
    name,
    severity: 'launch',
    category,
    status: 'FAIL',
    problem: `command failed: ${cmd}`,
    correction,
    docs: 'docs/production-cleanup/production-check-stability.md',
  });
  waitForPortsFree(ports, 15000);
  return false;
}

function collectNavHrefs() {
  const navFile = path.join(root, 'packages/types/src/crm-ui-config.ts');
  const text = fs.readFileSync(navFile, 'utf8');
  return [...new Set([...text.matchAll(/href:\s*'([^']+)'/g)].map((m) => m[1]))];
}

function pageExistsForHref(href) {
  if (href.includes('[')) return true;
  const parts = (href.replace(/\/$/, '') || '/').split('/').filter(Boolean);
  return ['page.tsx', 'page.ts'].some((name) =>
    fs.existsSync(path.join(root, 'apps/web/src/app', ...parts, name)),
  );
}

function auditDeadRoutes() {
  const hrefs = collectNavHrefs();
  const missing = hrefs.filter((h) => !pageExistsForHref(h));
  const fieldSrc = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next') continue;
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      const rel = path.relative(root, full).replace(/\\/g, '/');
      if (
        rel.startsWith('docs/') ||
        rel.includes('production-check') ||
        rel.includes('tests/routes')
      )
        continue;
      if (rel.includes('/app/field/')) continue; // legacy redirect pages may mention paths in comments only
      const text = fs.readFileSync(full, 'utf8');
      // Flag non-redirect production links to /app/field that are not redirect() targets mapping away
      if (/href=["'`]\/app\/field["'`]/.test(text) || /push\(["'`]\/app\/field["'`]\)/.test(text)) {
        if (!/redirect\(\s*['"]\/app\/marketing\/sign-tracker/.test(text)) {
          fieldSrc.push(rel);
        }
      }
    }
  }
  walk(path.join(root, 'apps/web/src'));

  // Legacy field pages must redirect
  const legacy = [
    ['apps/web/src/app/app/field/page.tsx', '/app/marketing/sign-tracker'],
    ['apps/web/src/app/app/field/signs/page.tsx', '/app/marketing/sign-tracker'],
    ['apps/web/src/app/app/field/signs/add/page.tsx', '/app/marketing/sign-tracker/add'],
    ['apps/web/src/app/app/field/signs/pickup/page.tsx', '/app/marketing/sign-tracker/pickup'],
    ['apps/web/src/app/app/field/signs/report/page.tsx', '/app/marketing/sign-tracker/report'],
  ];
  const badLegacy = [];
  for (const [file, target] of legacy) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) {
      badLegacy.push(`${file} missing`);
      continue;
    }
    const text = fs.readFileSync(full, 'utf8');
    if (!text.includes('redirect(') || !text.includes(target)) {
      badLegacy.push(`${file} must redirect to ${target}`);
    }
  }

  if (missing.length || fieldSrc.length || badLegacy.length) {
    add({
      name: 'dead-route-validation',
      severity: 'launch',
      category: 'routes',
      status: 'FAIL',
      problem: [
        missing.length ? `nav hrefs missing pages: ${missing.join(', ')}` : null,
        fieldSrc.length ? `production links to /app/field: ${fieldSrc.join(', ')}` : null,
        badLegacy.length ? badLegacy.join('; ') : null,
      ]
        .filter(Boolean)
        .join(' | '),
      correction: 'Point navigation to canonical routes; keep legacy field URLs as redirects only.',
      docs: 'docs/production-cleanup/route-inventory.md',
    });
  } else {
    add({
      name: 'dead-route-validation',
      severity: 'info',
      category: 'routes',
      status: 'PASS',
      problem: `${hrefs.length} nav hrefs OK; legacy field redirects OK`,
      correction: 'n/a',
    });
  }
}

function auditEnv() {
  const envPath = path.join(root, '.env.example');
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_MAPBOX_TOKEN',
    'MAPBOX_TOKEN',
    'STRIPE_SECRET_KEY',
    'WEATHER_PROVIDER',
    'AI_PROVIDER',
  ];
  const text = fs.readFileSync(envPath, 'utf8');
  const missing = required.filter((k) => !text.includes(`${k}=`));
  if (missing.length) {
    add({
      name: 'environment-validation',
      severity: 'operational',
      category: 'ops',
      status: 'FAIL',
      file: '.env.example',
      problem: `missing keys: ${missing.join(', ')}`,
      correction: 'Declare required keys in .env.example',
    });
  } else {
    add({
      name: 'environment-validation',
      severity: 'info',
      category: 'ops',
      status: 'PASS',
      problem: 'required keys declared',
      correction: 'n/a',
    });
  }

  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';
  const localEnvPath = path.join(root, '.env');
  let mapboxEmpty = true;
  if (fs.existsSync(localEnvPath)) {
    const local = fs.readFileSync(localEnvPath, 'utf8');
    const m = local.match(/^NEXT_PUBLIC_MAPBOX_TOKEN=(.*)$/m);
    mapboxEmpty = !m || !m[1].trim();
  }
  const mapFeaturesEnabled = process.env.MAP_FEATURES_REQUIRED === '1';
  if (mapboxEmpty && (appEnv === 'production' || appEnv === 'staging' || mapFeaturesEnabled)) {
    add({
      name: 'environment-mapbox-token',
      severity: 'operational',
      category: 'ops',
      status: 'FAIL',
      problem: `Mapbox public token missing while APP_ENV=${appEnv}`,
      correction:
        'Set NEXT_PUBLIC_MAPBOX_TOKEN (pk.ey public token) for staging/production deploys',
      docs: 'docs/production-cleanup/integration-inventory.md',
    });
  } else if (mapboxEmpty) {
    add({
      name: 'environment-mapbox-token',
      severity: 'warning',
      category: 'ops',
      status: 'WARN',
      problem: 'NEXT_PUBLIC_MAPBOX_TOKEN empty locally — maps show unavailable state',
      correction: 'Optional for local; required when MAP_FEATURES_REQUIRED=1 or staging/production',
    });
  } else {
    add({
      name: 'environment-mapbox-token',
      severity: 'info',
      category: 'ops',
      status: 'PASS',
      problem: 'token present',
      correction: 'n/a',
    });
  }
}

function auditMocks() {
  const checks = [
    {
      file: 'packages/firebase/src/schedule360.ts',
      needle: 'mockWeatherForecast(',
      label: 'production weather still calls mockWeatherForecast',
    },
    {
      file: 'packages/firebase/src/mockups360.ts',
      needle: 'mockAiPropertyDetection',
      label: 'production AI still calls mockAiPropertyDetection',
    },
    {
      file: 'packages/api/src/trpc.ts',
      needle: 'fail open',
      label: 'requireModule fail-open comment/behavior present',
    },
    {
      file: 'apps/web/src/components/customers/follow-up-rules-table.tsx',
      needle: 'coming soon',
      label: 'follow-up automation placeholder copy',
    },
  ];
  const hits = [];
  for (const c of checks) {
    const full = path.join(root, c.file);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, 'utf8');
    if (text.toLowerCase().includes(c.needle.toLowerCase())) hits.push(`${c.label} (${c.file})`);
  }

  const integrationsFile = path.join(root, 'packages/types/src/settings.ts');
  const integrationsText = fs.readFileSync(integrationsFile, 'utf8');
  const plannedMisconfigured =
    /id: 'hubspot'[\s\S]{0,200}availability: 'available'/.test(integrationsText) ||
    /id: 'hubspot'[\s\S]{0,200}connectable: true/.test(integrationsText);
  if (plannedMisconfigured)
    hits.push('HubSpot (or similar) planned integration marked available/connectable');

  if (hits.length) {
    add({
      name: 'placeholder-mock-audit',
      severity: 'launch',
      category: 'mocks',
      status: 'FAIL',
      problem: hits.join('; '),
      correction: 'Remove production mocks; fail closed; mark planned integrations unavailable',
      docs: 'docs/production-cleanup/integration-inventory.md',
    });
  } else {
    add({
      name: 'placeholder-mock-audit',
      severity: 'info',
      category: 'mocks',
      status: 'PASS',
      problem: 'no production mock/placeholder hits',
      correction: 'n/a',
    });
  }
}

function auditHardcoded() {
  const allowlistPath = path.join(root, 'docs/production-cleanup/hardcoded-value-allowlist.md');
  const reportPath = path.join(root, 'docs/production-cleanup/hardcoded-value-report.md');
  if (!fs.existsSync(allowlistPath)) {
    add({
      name: 'hardcoded-value-audit',
      severity: 'launch',
      category: 'config',
      status: 'FAIL',
      problem: 'hardcoded-value-allowlist.md missing',
      correction: 'Classify all findings in docs/production-cleanup/hardcoded-value-allowlist.md',
    });
    return;
  }
  const allowlist = fs.readFileSync(allowlistPath, 'utf8');
  const unreviewed = /classification:\s*Invalid hardcoded business value/i.test(allowlist);
  const incomplete = !/Reviewer:/i.test(allowlist) || !/Review date:/i.test(allowlist);
  if (unreviewed) {
    add({
      name: 'hardcoded-value-audit',
      severity: 'launch',
      category: 'config',
      status: 'FAIL',
      file: 'docs/production-cleanup/hardcoded-value-allowlist.md',
      problem: 'Unresolved invalid hardcoded business values remain',
      correction: 'Move business values into editable configuration',
      docs: allowlistPath,
    });
  } else if (incomplete) {
    add({
      name: 'hardcoded-value-audit',
      severity: 'warning',
      category: 'config',
      status: 'WARN',
      problem: 'Allowlist present but missing reviewer metadata',
      correction: 'Complete reviewer/date fields',
      docs: allowlistPath,
    });
  } else {
    add({
      name: 'hardcoded-value-audit',
      severity: 'warning',
      category: 'config',
      status: 'WARN',
      problem: 'All findings classified; remaining items are reviewed non-blockers',
      correction: 'Continue migrating editable defaults in Phase 2',
      docs: reportPath,
    });
  }
}

function auditFirebaseRulesTests() {
  const files = ['tests/firebase/firestore.rules.test.ts', 'tests/firebase/storage.rules.test.ts'];
  const missing = files.filter((f) => !fs.existsSync(path.join(root, f)));
  if (missing.length) {
    add({
      name: 'firebase-rule-tests',
      severity: 'security',
      category: 'security',
      status: 'FAIL',
      problem: `missing test files: ${missing.join(', ')}`,
      correction: 'Add emulator-based rules tests and wire npm run test:firebase-rules',
    });
    return;
  }
  tryRunEmulatorSuite(
    'firebase-rule-tests',
    'security',
    'npm run test:firebase-rules',
    'Fix failing Firestore/Storage rules tests; ensure emulators start and ports 8080/9199 are free',
  );
}

function auditLegacyPostgres() {
  const apiIndex = fs.readFileSync(path.join(root, 'packages/api/src/index.ts'), 'utf8');
  if (apiIndex.includes('routers/firestore')) {
    add({
      name: 'legacy-postgres-isolation',
      severity: 'info',
      category: 'data',
      status: 'PASS',
      problem: 'active export is routers/firestore',
      correction: 'n/a',
    });
  } else {
    add({
      name: 'legacy-postgres-isolation',
      severity: 'data-integrity',
      category: 'data',
      status: 'FAIL',
      problem: 'unexpected API export',
      correction: 'Export only firestore appRouter',
    });
  }
}

console.log('\n=== Yuletide production:check ===\n');

if (!auditsOnly) {
  tryRun(
    'format-changed',
    'quality',
    'npm run format:changed:check',
    'Run npm run format:changed on files touched since p0.1-complete-with-limitations',
  );
  tryRun(
    'legacy-write-path-audit',
    'data-integrity',
    'node scripts/audit-legacy-writes.mjs',
    'Redirect legacy property/job/message writes to canonical org paths',
  );
  tryRun('typecheck', 'quality', 'npm run typecheck', 'Fix TypeScript errors');
  if (!skipLint) tryRun('lint', 'quality', 'npm run lint', 'Fix lint errors');
  else
    add({
      name: 'lint',
      severity: 'warning',
      category: 'quality',
      status: 'WARN',
      problem: 'skipped via --skip-lint',
      correction: 'Run full lint before launch',
    });
  tryRun('unit-tests', 'quality', 'npm test', 'Fix unit test failures');
  // Emulator suites run serially with port readiness: rules before integration.
  auditFirebaseRulesTests();
  tryRunEmulatorSuite(
    'integration-tests',
    'quality',
    'npm run test:integration',
    'Add/fix tests under tests/integration — missing or failing suite is a launch blocker',
  );
  tryRun('route-tests', 'routes', 'npm run test:routes', 'Fix route validation tests');
  if (!skipBuild)
    tryRun(
      'production-web-build',
      'quality',
      'npm run build --workspace=@clcrm/web',
      'Fix production build',
    );
  else
    add({
      name: 'production-web-build',
      severity: 'warning',
      category: 'quality',
      status: 'WARN',
      problem: 'skipped via --skip-build',
      correction: 'Run full build before launch',
    });
}

function auditModulePresets() {
  const presets = path.join(root, 'packages/types/src/module-presets.ts');
  const provisioning = path.join(root, 'packages/firebase/src/org-provisioning.ts');
  const auditScript = path.join(root, 'scripts/audit-organization-modules.ts');
  const migrateScript = path.join(root, 'scripts/migrate-organization-modules.ts');
  const missing = [presets, provisioning, auditScript, migrateScript].filter(
    (f) => !fs.existsSync(f),
  );
  if (missing.length) {
    add({
      name: 'module-presets-and-migration',
      severity: 'deployment',
      category: 'tenants',
      status: 'FAIL',
      problem: `missing: ${missing.map((f) => path.relative(root, f)).join(', ')}`,
      correction: 'Restore module presets, org provisioning helper, and audit/migration scripts',
      docs: 'docs/production-cleanup/module-migration-dry-run-review.md',
    });
    return;
  }
  const text = fs.readFileSync(presets, 'utf8');
  const hasTiers =
    text.includes('trial') &&
    text.includes('starter') &&
    text.includes('standard') &&
    text.includes('professional') &&
    text.includes('enterprise') &&
    text.includes('custom');
  if (!hasTiers) {
    add({
      name: 'module-presets-and-migration',
      severity: 'deployment',
      category: 'tenants',
      status: 'FAIL',
      problem: 'MODULE_PRESETS missing required subscription tiers',
      correction: 'Define trial/starter/standard/professional/enterprise/custom presets',
    });
    return;
  }
  add({
    name: 'module-presets-and-migration',
    severity: 'info',
    category: 'tenants',
    status: 'PASS',
    problem: 'presets + audit/migration scripts present',
    correction: 'n/a',
  });
}

auditDeadRoutes();
auditEnv();
auditMocks();
auditHardcoded();
auditLegacyPostgres();
auditModulePresets();
if (auditsOnly) {
  const files = ['tests/firebase/firestore.rules.test.ts', 'tests/firebase/storage.rules.test.ts'];
  const ok = files.every((f) => fs.existsSync(path.join(root, f)));
  add({
    name: 'firebase-rule-tests',
    severity: ok ? 'info' : 'security',
    category: 'security',
    status: ok ? 'PASS' : 'FAIL',
    problem: ok ? 'test files present (skipped execution in --audits-only)' : 'missing rules tests',
    correction: ok ? 'Run full production:check to execute emulators' : 'Add rules tests',
  });
}

const blockers = findings.filter((f) => f.status === 'FAIL');
const warnings = findings.filter((f) => f.status === 'WARN');

console.log('\n=== Summary ===');
console.log(`Launch blockers: ${blockers.filter((b) => b.severity === 'launch').length}`);
console.log(`Security blockers: ${blockers.filter((b) => b.severity === 'security').length}`);
console.log(
  `Tenant-isolation blockers: ${blockers.filter((b) => b.severity === 'tenant-isolation').length}`,
);
console.log(
  `Data-integrity blockers: ${blockers.filter((b) => b.severity === 'data-integrity').length}`,
);
console.log(`Deployment blockers: ${blockers.filter((b) => b.severity === 'deployment').length}`);
console.log(`Functional blockers: ${blockers.filter((b) => b.severity === 'functional').length}`);
console.log(`Operational blockers: ${blockers.filter((b) => b.severity === 'operational').length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Informational: ${findings.filter((f) => f.status === 'PASS').length}`);

if (blockers.length) {
  console.error(`\nproduction:check failed with ${blockers.length} blocker(s).`);
  process.exit(1);
}
console.log('\nproduction:check passed (warnings may remain).');
process.exit(0);
