/**
 * YL-S24 — print Node runtime policy status (exit 1 on mismatch when --strict).
 * Keep constants in sync with packages/types/src/runtime-policy.ts
 * Usage: node scripts/check-node-runtime.mjs [--strict]
 */

const FIREBASE_NODE_ENGINE_MAJOR = 22;
const FIREBASE_NODE_ENGINES_VALUE = '22';
const FIREBASE_FUNCTIONS_RUNTIME_ID = 'nodejs22';
const NODEJS20_DECOMMISSION_DATE = '2026-10-30';

function parseNodeMajorVersion(version) {
  if (typeof version !== 'string') return null;
  const trimmed = version.trim().replace(/^v/i, '');
  const major = Number(trimmed.split('.')[0]);
  return Number.isFinite(major) && major > 0 ? major : null;
}

function daysUntilNodejs20Decommission(now = new Date()) {
  const target = Date.UTC(2026, 9, 30);
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - start) / (24 * 60 * 60 * 1000));
}

const strict = process.argv.includes('--strict');
const version = process.version;
const major = parseNodeMajorVersion(version);
const satisfied = major === FIREBASE_NODE_ENGINE_MAJOR;

console.log(`Node observed: ${version}`);
console.log(`Policy engines: ${FIREBASE_NODE_ENGINES_VALUE} (runtime ${FIREBASE_FUNCTIONS_RUNTIME_ID})`);
console.log(
  `nodejs20 decommission: ${NODEJS20_DECOMMISSION_DATE} (${daysUntilNodejs20Decommission()} days)`,
);
console.log(`Satisfied: ${satisfied ? 'yes' : 'no'}`);

if (!satisfied) {
  console.warn(
    `Node ${version} detected. Yuletide Firebase Hosting SSR expects Node ${FIREBASE_NODE_ENGINE_MAJOR} ` +
      `(engines "${FIREBASE_NODE_ENGINES_VALUE}", runtime ${FIREBASE_FUNCTIONS_RUNTIME_ID}). ` +
      `nodejs20 decommissions ${NODEJS20_DECOMMISSION_DATE}.`,
  );
  if (strict) process.exit(1);
} else {
  console.log(`OK — matches Firebase Node ${FIREBASE_NODE_ENGINE_MAJOR} policy.`);
}
