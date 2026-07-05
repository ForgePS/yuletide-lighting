import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(repoRoot, 'apps/web');
const rootEnvPath = path.join(repoRoot, '.env');

function parseEnvValue(lines, key) {
  const prefix = `${key}=`;
  const line = lines.find((entry) => entry.trim().startsWith(prefix));
  if (!line) return null;
  return line.slice(line.indexOf('=') + 1).trim();
}

function hasValidTinaCredentials() {
  if (!fs.existsSync(rootEnvPath)) return false;
  const lines = fs.readFileSync(rootEnvPath, 'utf8').split(/\r?\n/);
  const clientId = parseEnvValue(lines, 'NEXT_PUBLIC_TINA_CLIENT_ID');
  const token = parseEnvValue(lines, 'TINA_TOKEN');
  return Boolean(
    clientId &&
      token &&
      clientId !== 'local' &&
      token !== 'local' &&
      !clientId.startsWith('your_') &&
      !token.startsWith('your_'),
  );
}

execSync('node scripts/sync-web-env.mjs', { cwd: repoRoot, stdio: 'inherit' });

if (hasValidTinaCredentials()) {
  console.log('Building Tina admin...');
  execSync('npx tinacms build --skip-cloud-checks --datalayer-port 9001', {
    cwd: webRoot,
    stdio: 'inherit',
  });
} else {
  console.log('Skipping Tina admin build — no valid Tina Cloud credentials in .env');
}

execSync('npx next build', { cwd: webRoot, stdio: 'inherit' });
