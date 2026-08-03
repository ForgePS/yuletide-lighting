#!/usr/bin/env node
/**
 * PORTAL-P2-S7 — Emulator-only portal magic-token migration utility.
 * Modes: inventory | dry-run | backfill-hashes | verify | remove-plaintext | report
 *
 * PRODUCTION MUTATIONS ARE HARD-BLOCKED.
 * ENVIRONMENT=EMULATOR
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || 'inventory';
const outDir = path.join(root, 'docs/production-cleanup');

function assertEmulatorGuard() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) {
    console.error('PRODUCTION_PORTAL_TOKEN_MIGRATION_NOT_AUTHORIZED');
    console.error('Set FIRESTORE_EMULATOR_HOST (emulator only). No production bypass exists.');
    process.exit(2);
  }
  if (process.argv.includes('--force-production') || process.argv.includes('--allow-production')) {
    console.error('PRODUCTION_PORTAL_TOKEN_MIGRATION_NOT_AUTHORIZED');
    process.exit(2);
  }
}

function hashPortalAccessToken(raw) {
  const t = String(raw ?? '').trim();
  if (t.length < 16) throw new Error('INVALID_MAGIC_TOKEN');
  // Must match packages/firebase/src/portal-magic-access.ts PORTAL_ACCESS_SECRET_DOMAIN.
  const digest = createHash('sha256').update(`portal-magic-access:${t}`, 'utf8').digest('hex');
  return `v1:${digest}`;
}

async function loadAdmin() {
  const { initializeApp, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  if (!getApps().length) {
    initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'yuletide-rules-test' });
  }
  return getFirestore();
}

function classifyAccount(account, customer) {
  const plaintext =
    Boolean(account.accessToken && String(account.accessToken).length >= 16) ||
    Boolean(customer?.portalToken && String(customer.portalToken).length >= 16);
  const hash = Boolean(account.accessTokenHash && String(account.accessTokenHash).startsWith('v'));
  if (plaintext && hash) return 'dual-field';
  if (hash) return 'hash-only';
  if (plaintext) return 'plaintext-only';
  return 'missing-credential';
}

async function scan(db) {
  const orgs = await db.collection('organizations').get();
  const rows = [];
  const hashIndex = new Map();
  for (const orgDoc of orgs.docs) {
    const orgId = orgDoc.id;
    const accounts = await db.collection(`organizations/${orgId}/portalAccounts`).get();
    for (const accDoc of accounts.docs) {
      const account = { id: accDoc.id, ...accDoc.data() };
      const customer = account.customerId
        ? (await db.doc(`organizations/${orgId}/customers/${account.customerId}`).get()).data()
        : null;
      const kind = classifyAccount(account, customer);
      const hash = account.accessTokenHash ? String(account.accessTokenHash) : null;
      if (hash) {
        const list = hashIndex.get(hash) || [];
        list.push({ orgId, accountId: account.id, customerId: account.customerId });
        hashIndex.set(hash, list);
      }
      rows.push({
        orgId,
        accountId: account.id,
        customerId: account.customerId ?? null,
        kind,
        status: account.status ?? null,
        portalEnabled: Boolean(account.portalEnabled),
        revoked: Boolean(account.revokedAt),
        suspended: account.status === 'suspended',
        hasPlaintextAccessToken: Boolean(account.accessToken),
        hasCustomerPortalToken: Boolean(customer?.portalToken),
        hasHash: Boolean(hash),
      });
    }
  }
  const duplicateHashes = [...hashIndex.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([hash, accounts]) => ({
      hashFingerprint: String(hash).slice(0, 12),
      count: accounts.length,
      accounts,
    }));
  return { rows, duplicateHashes };
}

function summarize(rows, duplicateHashes) {
  const counts = {
    total: rows.length,
    plaintextOnly: rows.filter((r) => r.kind === 'plaintext-only').length,
    hashOnly: rows.filter((r) => r.kind === 'hash-only').length,
    dualField: rows.filter((r) => r.kind === 'dual-field').length,
    missing: rows.filter((r) => r.kind === 'missing-credential').length,
    revoked: rows.filter((r) => r.revoked).length,
    suspended: rows.filter((r) => r.suspended).length,
    duplicateHashAnomalies: duplicateHashes.length,
  };
  return counts;
}

async function main() {
  assertEmulatorGuard();
  const db = await loadAdmin();
  const { rows, duplicateHashes } = await scan(db);
  const summary = summarize(rows, duplicateHashes);
  mkdirSync(outDir, { recursive: true });

  if (mode === 'inventory' || mode === 'report') {
    const jsonPath = path.join(outDir, 'portal-phase-2-s7-migration-inventory.json');
    const mdPath = path.join(outDir, 'portal-phase-2-s7-migration-evidence.md');
    writeFileSync(
      jsonPath,
      JSON.stringify({ environment: 'EMULATOR', mode, summary, duplicateHashes, rows }, null, 2),
    );
    writeFileSync(
      mdPath,
      [
        '# Portal Phase 2 S7 — Migration Evidence',
        '',
        '**ENVIRONMENT:** EMULATOR',
        `**MODE:** ${mode}`,
        '',
        '## Summary',
        '',
        '```json',
        JSON.stringify(summary, null, 2),
        '```',
        '',
        '## Duplicate hash anomalies',
        '',
        duplicateHashes.length
          ? duplicateHashes.map((d) => `- ${d.hashFingerprint}… count=${d.count}`).join('\n')
          : '_None_',
        '',
        'Raw tokens are never written to this report.',
        '',
      ].join('\n'),
    );
    console.log(JSON.stringify({ ok: true, mode, summary, writes: 0 }, null, 2));
    return;
  }

  if (mode === 'dry-run' || mode === 'backfill-hashes') {
    const planned = [];
    let writes = 0;
    for (const row of rows) {
      if (row.kind !== 'plaintext-only' && row.kind !== 'dual-field') continue;
      const accRef = db.doc(`organizations/${row.orgId}/portalAccounts/${row.accountId}`);
      const snap = await accRef.get();
      const data = snap.data() || {};
      const custSnap = row.customerId
        ? await db.doc(`organizations/${row.orgId}/customers/${row.customerId}`).get()
        : null;
      const raw = data.accessToken || custSnap?.data()?.portalToken;
      if (!raw || String(raw).length < 16) continue;
      if (data.accessTokenHash && String(data.accessTokenHash).startsWith('v1:')) {
        planned.push({ ...row, action: 'skip-already-hashed' });
        continue;
      }
      const tokenHash = hashPortalAccessToken(String(raw));
      planned.push({
        orgId: row.orgId,
        accountId: row.accountId,
        customerId: row.customerId,
        action: 'backfill-hash',
        hashFingerprint: tokenHash.slice(0, 12),
      });
      if (mode === 'backfill-hashes') {
        await accRef.set(
          {
            accessTokenHash: tokenHash,
            accessTokenHashVersion: 1,
          },
          { merge: true },
        );
        writes += 1;
      }
    }
    writeFileSync(
      path.join(outDir, 'portal-phase-2-s7-migration-dry-run.json'),
      JSON.stringify({ environment: 'EMULATOR', mode, planned, writes }, null, 2),
    );
    console.log(JSON.stringify({ ok: true, mode, planned: planned.length, writes }, null, 2));
    return;
  }

  if (mode === 'verify') {
    const after = await scan(db);
    console.log(
      JSON.stringify(
        { ok: true, mode, summary: summarize(after.rows, after.duplicateHashes), writes: 0 },
        null,
        2,
      ),
    );
    return;
  }

  if (mode === 'remove-plaintext') {
    let writes = 0;
    let skipped = 0;
    for (const row of rows) {
      if (!row.hasHash) {
        console.error('Refusing plaintext removal: account missing hash', row.accountId);
        process.exit(1);
      }
      const accRef = db.doc(`organizations/${row.orgId}/portalAccounts/${row.accountId}`);
      if (row.hasPlaintextAccessToken) {
        await accRef.set({ accessToken: null }, { merge: true });
        writes += 1;
      } else {
        skipped += 1;
      }
      if (row.customerId && row.hasCustomerPortalToken) {
        await db
          .doc(`organizations/${row.orgId}/customers/${row.customerId}`)
          .set({ portalToken: null }, { merge: true });
        writes += 1;
      } else if (row.customerId) {
        skipped += 1;
      }
    }
    console.log(JSON.stringify({ ok: true, mode, writes, skipped }, null, 2));
    return;
  }

  console.error(`Unknown mode: ${mode}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
