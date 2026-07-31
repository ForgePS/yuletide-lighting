#!/usr/bin/env node
/**
 * Format / check only files changed since the P0.1 baseline tag.
 * Does not fail on historical Prettier drift in untouched files.
 *
 * Usage:
 *   node scripts/format-changed.mjs           # write
 *   node scripts/format-changed.mjs --check   # validate only
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const baseline = process.env.FORMAT_BASELINE || 'p0.1-complete-with-limitations';

function run(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8' }).trim();
}

let files = [];
try {
  const diff = run(`git diff --name-only --diff-filter=ACMR ${baseline}...HEAD`);
  const unstaged = run('git diff --name-only --diff-filter=ACMR');
  const staged = run('git diff --name-only --cached --diff-filter=ACMR');
  const untracked = run('git ls-files --others --exclude-standard');
  files = [
    ...new Set([diff, unstaged, staged, untracked].join('\n').split(/\r?\n/).filter(Boolean)),
  ];
} catch (err) {
  console.error(`Unable to diff against ${baseline}. Ensure the tag exists.`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const supported = files.filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs|md|json)$/.test(f));
const ignored = supported.filter(
  (f) =>
    f.includes('node_modules/') ||
    f.includes('.next/') ||
    f.endsWith('package-lock.json') ||
    f.includes('tsconfig.tsbuildinfo'),
);
const targets = supported.filter((f) => !ignored.includes(f));

if (targets.length === 0) {
  console.log(`No changed Prettier-supported files since ${baseline}.`);
  process.exit(0);
}

console.log(
  `${checkOnly ? 'Checking' : 'Formatting'} ${targets.length} changed file(s) since ${baseline}…`,
);
const list = targets.map((f) => `"${f.replace(/"/g, '\\"')}"`).join(' ');
try {
  execSync(`npx prettier ${checkOnly ? '--check' : '--write'} ${list}`, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  console.log(checkOnly ? 'Changed-file format check passed.' : 'Changed files formatted.');
} catch {
  console.error('Changed-file format check failed.');
  process.exit(1);
}
