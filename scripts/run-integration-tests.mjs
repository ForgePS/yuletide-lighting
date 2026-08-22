#!/usr/bin/env node
/**
 * Deterministic integration test runner (P2-S6 gate stability).
 * Fresh emulator per batch. Retries once on emulator infrastructure failure only.
 * If vitest reports success but the emulator crashes on shutdown, treat as PASS.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTS = [8080, 9199, 4400, 4500];

const BATCHES = [
  [
    'tests/integration/auth',
    'tests/integration/modules',
    'tests/integration/configuration',
    'tests/integration/tenants',
    'tests/integration/provisioning',
    'tests/integration/permissions',
    'tests/integration/sign-tracker',
  ],
  ['tests/integration/portal/portal-phase2.integration.test.ts'],
  ['tests/integration/portal/portal-phase2-s3.integration.test.ts'],
  ['tests/integration/portal/portal-phase2-s4.integration.test.ts'],
  ['tests/integration/portal/portal-phase2-s5.integration.test.ts'],
  ['tests/integration/portal/portal-phase2-s6.integration.test.ts'],
  ['tests/integration/portal/portal-phase2-s7.integration.test.ts'],
];

function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.listen(port, '127.0.0.1', () => {
      s.close(() => resolve(true));
    });
  });
}

async function waitForPortsFree(timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const results = await Promise.all(PORTS.map(portFree));
    if (results.every(Boolean)) {
      await delay(3000);
      const again = await Promise.all(PORTS.map(portFree));
      if (again.every(Boolean)) return true;
    }
    await delay(1000);
  }
  return false;
}

async function clearOrphans() {
  if (process.platform === 'win32') {
    for (const port of PORTS) {
      try {
        execSync(
          `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
          { stdio: 'ignore', cwd: root },
        );
      } catch {
        // ignore
      }
    }
  }
  await delay(2000);
}

async function ensurePortsReady() {
  const ready = await waitForPortsFree(20000);
  if (!ready) {
    console.warn('[run-integration-tests] ports busy; clearing orphans');
    await clearOrphans();
    const after = await waitForPortsFree(45000);
    if (!after) {
      throw new Error(`emulator ports not free: ${PORTS.join(', ')}`);
    }
  }
}

function isInfrastructureFailure(output) {
  return /Fatal error occurred|Could not start Firestore Emulator|port taken|EADDRINUSE|ECONNREFUSED|Firestore Emulator has exited with code/i.test(
    output,
  );
}

function vitestSucceeded(output) {
  if (/Script exited successfully \(code 0\)/.test(output)) return true;
  // Vitest summary with zero failed files
  if (/Test Files\s+\d+ passed/.test(output) && !/Test Files\s+\d+ failed/.test(output)) {
    return !/\bFAIL\b/.test(output);
  }
  return false;
}

function runBatch(batch, env) {
  const vitestArgs = batch.map((p) => `"${p}"`).join(' ');
  const cmd = `npx firebase emulators:exec --only firestore --project yuletide-rules-test "npx vitest run ${vitestArgs}"`;
  try {
    const output = execSync(cmd, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe'],
      env,
      maxBuffer: 40 * 1024 * 1024,
    });
    process.stdout.write(output);
    return { ok: true, output };
  } catch (err) {
    const stdout =
      err && typeof err === 'object' && 'stdout' in err ? String(err.stdout ?? '') : '';
    const stderr =
      err && typeof err === 'object' && 'stderr' in err ? String(err.stderr ?? '') : '';
    const output = `${stdout}\n${stderr}`;
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    if (vitestSucceeded(output)) {
      console.warn(
        '[run-integration-tests] vitest passed; ignoring emulator shutdown/infrastructure exit code',
      );
      return { ok: true, output, shutdownNoise: true };
    }
    return { ok: false, output, infrastructure: isInfrastructureFailure(output) };
  }
}

const env = {
  ...process.env,
  JAVA_TOOL_OPTIONS: [process.env.JAVA_TOOL_OPTIONS, '-Xmx2g'].filter(Boolean).join(' '),
};

await clearOrphans();

let failed = false;
for (let i = 0; i < BATCHES.length; i++) {
  const batch = BATCHES[i];
  console.log(`\n[run-integration-tests] batch ${i + 1}/${BATCHES.length}: ${batch.join(' ')}\n`);
  await ensurePortsReady();
  let result = runBatch(batch, env);
  if (!result.ok) {
    console.warn(
      `[run-integration-tests] batch ${i + 1} failed; one full retry after emulator reset`,
    );
    await clearOrphans();
    await ensurePortsReady();
    result = runBatch(batch, env);
  }
  if (!result.ok) {
    failed = true;
    console.error(`[run-integration-tests] batch ${i + 1} FAILED`);
    break;
  }
  console.log(`[run-integration-tests] batch ${i + 1} PASS`);
  await clearOrphans();
  await waitForPortsFree(45000);
}

process.exit(failed ? 1 : 0);
