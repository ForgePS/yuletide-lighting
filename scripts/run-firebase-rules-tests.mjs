#!/usr/bin/env node
/**
 * Deterministic Firebase rules test runner (P2-S6 gate stability).
 * Waits for emulator ports to be free before/after emulators:exec.
 * Does not retry assertion failures — only ensures clean port ownership at start.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTS = [8080, 9199, 4400, 4500];

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
      await delay(2500);
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
  await delay(1500);
}

const ready = await waitForPortsFree(20000);
if (!ready) {
  console.warn('[run-firebase-rules-tests] ports still busy; attempting orphan clear');
  await clearOrphans();
  const after = await waitForPortsFree(45000);
  if (!after) {
    console.error('[run-firebase-rules-tests] emulator ports not free:', PORTS.join(', '));
    process.exit(1);
  }
}

const cmd =
  'npx firebase emulators:exec --only firestore,storage --project yuletide-rules-test "vitest run tests/firebase"';

try {
  execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env });
  await waitForPortsFree(30000);
  process.exit(0);
} catch (err) {
  await waitForPortsFree(30000);
  const code =
    err && typeof err === 'object' && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 1;
  process.exit(code || 1);
}
