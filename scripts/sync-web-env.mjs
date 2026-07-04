import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootEnv = path.join(repoRoot, '.env');
const webEnv = path.join(repoRoot, 'apps/web/.env');

if (!fs.existsSync(rootEnv)) {
  console.warn('No root .env found — Tina may fall back to local mode.');
  process.exit(0);
}

const lines = fs.readFileSync(rootEnv, 'utf8').split(/\r?\n/);
const kept = lines.filter((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return true;
  const key = trimmed.split('=')[0]?.trim();
  if (!key) return true;
  if (key.startsWith('NEXT_PUBLIC_')) return true;
  if (key === 'TINA_TOKEN' || key === 'NEXT_PUBLIC_TINA_BRANCH') return true;
  return false;
});

fs.writeFileSync(webEnv, `${kept.join('\n')}\n`);
console.log('Synced Tina env from root .env to apps/web/.env');
