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

/** Best-effort clear of orphan emulator listeners before rules/integration suites (Windows-safe). */
function clearOrphanEmulatorPorts(ports = [8080, 9199, 4400, 4500]) {
  if (process.platform === 'win32') {
    for (const port of ports) {
      try {
        execSync(
          `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
          { stdio: 'ignore', cwd: root },
        );
      } catch {
        // ignore
      }
    }
  } else {
    for (const port of ports) {
      try {
        execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: 'ignore', cwd: root });
      } catch {
        // ignore
      }
    }
  }
  sleep(1500);
  waitForPortsFree(ports, 20000);
}

/**
 * Run an emulator-backed suite with port readiness + one infrastructure retry.
 * Assertion failures must not be retried as infrastructure failures.
 */
function tryRunEmulatorSuite(name, category, cmd, correction) {
  const ports = [8080, 9199, 4400, 4500];
  clearOrphanEmulatorPorts(ports);
  waitForPortsFree(ports, 45000);

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
  // Web package resolves @yuletide/firebase via apps/web/local_deps — sync before typecheck.
  tryRun(
    'sync-web-local-deps',
    'quality',
    'node apps/web/scripts/prepare-firebase-deps.mjs',
    'Sync workspace packages into apps/web/local_deps for Next/web typecheck',
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
auditPortalPhase2();
tryRun(
  'portal-permissions-audit',
  'security',
  'npm run audit:portal-permissions',
  'Restore canonical portal permission resolver and requirePortalAuthorized wiring',
);
tryRun(
  'portal-sessions-audit',
  'security',
  'npm run audit:portal-sessions',
  'Restore dedicated __portal_session and staff/portal procedure isolation',
);
tryRun(
  'portal-auth-security-audit',
  'security',
  'npm run audit:portal-auth-security',
  'Remove insecure portal secret generation, persistence, logging, or public claim authority',
);
tryRun(
  'portal-query-scope-audit',
  'security',
  'npm run audit:portal-query-scope',
  'Remove organization-wide portal read fallbacks and restore canonical customer-scoped queries',
);
tryRun(
  'portal-public-dto-audit',
  'security',
  'npm run audit:portal-public-dtos',
  'Replace raw portal document returns with explicit public DTO allowlists',
);
tryRun(
  'portal-routes-audit',
  'security',
  'npm run audit:portal-routes',
  'Wire PortalAuthedFrame + authorizeRoute and PORTAL_ROUTE_DEFINITIONS for all protected routes',
);
tryRun(
  'portal-files-audit',
  'security',
  'npm run audit:portal-files',
  'Use createPortalFileAccess tickets; ban arbitrary client Storage paths and permanent public ACLs',
);
tryRun(
  'portal-mutations-audit',
  'security',
  'npm run audit:portal-mutations',
  'Enforce portal mutation guards, state transitions, and server-authoritative payment amounts',
);
tryRun(
  'portal-idempotency-audit',
  'security',
  'npm run audit:portal-idempotency',
  'Ensure high-impact portal mutations have deterministic replay/idempotency behavior',
);
tryRun(
  'portal-token-security-audit',
  'security',
  'npm run audit:portal-token-security',
  'Enforce hash-only magic tokens, session-first routes, and no raw-token leakage',
);
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

function auditPortalPhase2() {
  const required = [
    'packages/types/src/portal-permissions.ts',
    'packages/firebase/src/portal-security.ts',
    'packages/firebase/src/portal-security-config.ts',
    'packages/firebase/src/portal-delivery.ts',
    'packages/firebase/src/portal-rate-limit.ts',
    'packages/firebase/src/portal-session.ts',
    'packages/firebase/src/portal-invitation.ts',
    'packages/firebase/src/portal-phase2-security.test.ts',
    'packages/firebase/src/portal-phase2-s3-security.test.ts',
    'scripts/audit-portal-query-scope.mjs',
    'scripts/audit-portal-public-dtos.mjs',
    'tests/integration/portal/portal-phase2.integration.test.ts',
    'tests/integration/portal/portal-phase2-s4.integration.test.ts',
    'apps/web/src/app/api/portal/session/route.ts',
    'apps/web/src/app/portal/invite/[token]/page.tsx',
    'docs/production-cleanup/portal-phase-2-baseline.md',
    'docs/production-cleanup/portal-phase-2-completion.md',
    'docs/production-cleanup/portal-phase-2-s3-baseline.md',
    'docs/production-cleanup/portal-phase-2-s3-invitation-map.md',
    'docs/production-cleanup/portal-phase-2-s3-otp-map.md',
    'docs/production-cleanup/portal-phase-2-s3-invitation-design.md',
    'docs/production-cleanup/portal-phase-2-s3-otp-design.md',
    'docs/production-cleanup/portal-phase-2-s3-rate-limit-design.md',
    'docs/production-cleanup/portal-phase-2-s3-test-plan.md',
    'docs/production-cleanup/portal-phase-2-s3-security-evidence.md',
    'docs/production-cleanup/portal-phase-2-s3-accessibility.md',
    'docs/production-cleanup/portal-phase-2-s3-rollback.md',
    'docs/production-cleanup/portal-phase-2-s3-completion.md',
    'docs/production-cleanup/portal-phase-2-s4-baseline.md',
    'docs/production-cleanup/portal-phase-2-s4-query-map.md',
    'docs/production-cleanup/portal-phase-2-s4-fallback-register.md',
    'docs/production-cleanup/portal-phase-2-s4-ownership-model.md',
    'docs/production-cleanup/portal-phase-2-s4-dto-map.md',
    'docs/production-cleanup/portal-phase-2-s4-query-evidence.md',
    'docs/production-cleanup/portal-phase-2-s4-isolation-evidence.md',
    'docs/production-cleanup/portal-phase-2-s4-dto-evidence.md',
    'docs/production-cleanup/portal-phase-2-s4-test-plan.md',
    'docs/production-cleanup/portal-phase-2-s4-rollback.md',
    'docs/production-cleanup/portal-phase-2-s4-completion.md',
    'docs/production-cleanup/portal-phase-2-s5-baseline.md',
    'docs/production-cleanup/portal-phase-2-s5-route-map.md',
    'docs/production-cleanup/portal-phase-2-s5-feature-route-matrix.md',
    'docs/production-cleanup/portal-phase-2-s5-route-authorization.md',
    'docs/production-cleanup/portal-phase-2-s5-file-map.md',
    'docs/production-cleanup/portal-phase-2-s5-file-security.md',
    'docs/production-cleanup/portal-phase-2-s5-storage-rules.md',
    'docs/production-cleanup/portal-phase-2-s5-cache-review.md',
    'docs/production-cleanup/portal-phase-2-s5-test-plan.md',
    'docs/production-cleanup/portal-phase-2-s5-security-evidence.md',
    'docs/production-cleanup/portal-phase-2-s5-accessibility.md',
    'docs/production-cleanup/portal-phase-2-s5-rollback.md',
    'docs/production-cleanup/portal-phase-2-s5-completion.md',
    'packages/firebase/src/portal-route-access.ts',
    'packages/firebase/src/portal-file-access.ts',
    'packages/firebase/src/portal-phase2-s5-security.test.ts',
    'scripts/audit-portal-routes.mjs',
    'scripts/audit-portal-files.mjs',
    'tests/integration/portal/portal-phase2-s5.integration.test.ts',
    'apps/web/src/app/api/portal/files/route.ts',
    'docs/production-cleanup/portal-token-hardening-plan.md',
    'packages/firebase/src/portal-magic-access.ts',
    'packages/firebase/src/portal-phase2-s7-magic-access.test.ts',
    'scripts/audit-portal-token-security.mjs',
    'scripts/portal-token-migration.mjs',
    'apps/web/src/app/portal/app/page.tsx',
    'apps/web/src/lib/portal-token-entry.tsx',
    'tests/integration/portal/portal-phase2-s7.integration.test.ts',
    'e2e/portal-phase2-s7-token-hardening.spec.ts',
    'docs/production-cleanup/portal-phase-2-s7-baseline.md',
    'docs/production-cleanup/portal-phase-2-s7-token-inventory.md',
    'docs/production-cleanup/portal-phase-2-s7-route-cutover-map.md',
    'docs/production-cleanup/portal-phase-2-s7-token-model.md',
    'docs/production-cleanup/portal-phase-2-s7-compatibility-model.md',
    'docs/production-cleanup/portal-token-production-migration-plan.md',
    'docs/production-cleanup/portal-phase-2-s7a-completion.md',
    'docs/production-cleanup/portal-phase-2-s7b-baseline.md',
    'docs/production-cleanup/portal-phase-2-s7b-workspace-resolution.md',
    'docs/production-cleanup/portal-phase-2-s7b-route-inventory.md',
    'packages/types/src/portal-legacy-path.ts',
  ];
  const missing = required.filter((f) => !fs.existsSync(path.join(root, f)));
  if (missing.length) {
    add({
      name: 'portal-phase2-artifacts',
      severity: 'security',
      category: 'security',
      status: 'FAIL',
      problem: `missing Portal Phase 2 artifacts: ${missing.join(', ')}`,
      correction: 'Restore portal permission resolver, session, invitation, tests, and docs',
      docs: 'docs/production-cleanup/portal-phase-2-completion.md',
    });
  } else {
    add({
      name: 'portal-phase2-artifacts',
      severity: 'info',
      category: 'security',
      status: 'PASS',
      problem: 'Portal Phase 2 core artifacts present',
      correction: 'n/a',
    });
  }

  const perm = fs.readFileSync(path.join(root, 'packages/types/src/portal-permissions.ts'), 'utf8');
  if (!perm.includes('resolvePortalPermission') || !perm.includes('fail')) {
    // soft check — resolver must exist
  }
  if (!perm.includes('resolvePortalPermission')) {
    add({
      name: 'portal-permission-resolver',
      severity: 'security',
      category: 'security',
      status: 'FAIL',
      problem: 'resolvePortalPermission missing',
      correction: 'Restore canonical portal permission resolver',
    });
  } else {
    add({
      name: 'portal-permission-resolver',
      severity: 'info',
      category: 'security',
      status: 'PASS',
      problem: 'canonical resolver present',
      correction: 'n/a',
    });
  }

  const unitTest = fs.readFileSync(
    path.join(root, 'packages/firebase/src/portal-phase2-security.test.ts'),
    'utf8',
  );
  const integrationTest = fs.readFileSync(
    path.join(root, 'tests/integration/portal/portal-phase2.integration.test.ts'),
    'utf8',
  );
  const checks = [
    {
      name: 'portal-permission-tests',
      ok:
        unitTest.includes('portal permission resolver') &&
        unitTest.includes('resolvePortalPermission') &&
        fs.existsSync(
          path.join(root, 'packages/firebase/src/portal-phase2-s1-permissions.test.ts'),
        ) &&
        fs
          .readFileSync(path.join(root, 'packages/firebase/src/portal360.ts'), 'utf8')
          .includes('requirePortalAuthorized'),
    },
    {
      name: 'portal-otp-security-tests',
      ok: unitTest.includes('rate limit') && unitTest.includes('redact'),
    },
    {
      name: 'portal-session-invalidation-tests',
      ok:
        integrationTest.includes('session version') ||
        integrationTest.includes('invalidatePortalSessions') ||
        integrationTest.includes('invalidates session'),
    },
    {
      name: 'portal-customer-isolation-tests',
      ok: integrationTest.includes('customer isolation'),
    },
    {
      name: 'portal-tenant-isolation-tests',
      ok: integrationTest.includes('tenant isolation'),
    },
    {
      name: 'portal-dto-security-tests',
      ok:
        integrationTest.includes('toPublicCustomer') ||
        unitTest.includes('redactPortalLogMetadata'),
    },
  ];
  for (const c of checks) {
    add({
      name: c.name,
      severity: c.ok ? 'info' : 'security',
      category: 'security',
      status: c.ok ? 'PASS' : 'FAIL',
      problem: c.ok ? 'coverage present' : `missing ${c.name}`,
      correction: c.ok ? 'n/a' : 'Add required Portal Phase 2 tests',
      docs: 'docs/production-cleanup/portal-phase-2-test-plan.md',
    });
  }

  // Anti-patterns in portal360 public path
  const portal360 = fs.readFileSync(path.join(root, 'packages/firebase/src/portal360.ts'), 'utf8');
  const sessionCookie = fs.readFileSync(
    path.join(root, 'apps/web/src/app/api/portal/session/route.ts'),
    'utf8',
  );
  if (sessionCookie.includes('AUTH_COOKIE_NAME') || sessionCookie.includes("'__session'")) {
    add({
      name: 'portal-session-cookie-separation',
      severity: 'security',
      category: 'security',
      status: 'FAIL',
      problem: 'Portal session route appears to reuse staff __session cookie',
      correction: 'Use dedicated __portal_session cookie only',
    });
  } else {
    add({
      name: 'portal-session-cookie-separation',
      severity: 'info',
      category: 'security',
      status: 'PASS',
      problem: 'dedicated portal session cookie path present',
      correction: 'n/a',
    });
  }

  if (/console\.(log|info|debug|warn|error)\([^)]*otp/i.test(portal360)) {
    add({
      name: 'portal-otp-logging',
      severity: 'security',
      category: 'security',
      status: 'FAIL',
      problem: 'Possible OTP logging in portal360',
      correction: 'Remove OTP values from logs',
    });
  } else {
    add({
      name: 'portal-otp-logging',
      severity: 'info',
      category: 'security',
      status: 'PASS',
      problem: 'no obvious OTP console logging in portal360',
      correction: 'n/a',
    });
  }

  const security = fs.readFileSync(
    path.join(root, 'packages/firebase/src/portal-security.ts'),
    'utf8',
  );
  if (!security.includes('redactPortalLogMetadata')) {
    add({
      name: 'portal-log-redaction',
      severity: 'security',
      category: 'security',
      status: 'FAIL',
      problem: 'redactPortalLogMetadata missing',
      correction: 'Restore portal log redaction helper',
    });
  } else {
    add({
      name: 'portal-log-redaction',
      severity: 'info',
      category: 'security',
      status: 'PASS',
      problem: 'redaction helper present',
      correction: 'n/a',
    });
  }
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
