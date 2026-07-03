import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  execSync('node scripts/prepare-firebase-deps.mjs', { cwd: webRoot, stdio: 'inherit' });
  execSync('firebase deploy --only hosting --project yuletide-lighting', {
    cwd: webRoot,
    stdio: 'inherit',
  });
} finally {
  execSync('node scripts/prepare-firebase-deps.mjs --restore', { cwd: webRoot, stdio: 'inherit' });
}
