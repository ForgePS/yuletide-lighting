import fs from 'fs';

import path from 'path';

import { execSync } from 'child_process';

import { fileURLToPath } from 'url';



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const webRoot = path.join(__dirname, '..');

const repoRoot = path.join(webRoot, '../..');

const localDepsDir = path.join(webRoot, 'local_deps');

const backupPath = path.join(webRoot, 'package.json.workspace-backup');

const webPkgPath = path.join(webRoot, 'package.json');
const webLockPath = path.join(webRoot, 'package-lock.json');

const firebaseCacheDir = path.join(webRoot, '.firebase');



const PACKAGES = [

  { name: '@clcrm/types', dir: 'packages/types' },

  { name: '@clcrm/validators', dir: 'packages/validators' },

  { name: '@clcrm/ui', dir: 'packages/ui' },

  { name: '@yuletide/firebase', dir: 'packages/firebase' },

  { name: '@clcrm/api', dir: 'packages/api' },

];



const internalDeps = ['@clcrm/types', '@clcrm/validators', '@yuletide/firebase', '@clcrm/api', '@clcrm/ui'];

const DEPLOY_ONLY_DEPS = {
  typescript: '6.0.3',
  '@types/react': '19.2.17',
  csstype: '3.2.3',
};



// Firebase Hosting resolves `next` from apps/web/node_modules only (depth 0).

const HOISTED_DEPS = ['next', 'react', 'react-dom'];

const hoistedLinksPath = path.join(webRoot, '.firebase-hoisted-links.json');



function copyPackage(pkg) {

  const src = path.join(repoRoot, pkg.dir);

  const folderName = pkg.name.replace('@', '').replace('/', '-');

  const dest = path.join(localDepsDir, folderName);

  fs.rmSync(dest, { recursive: true, force: true });

  fs.cpSync(src, dest, {

    recursive: true,

    filter: (srcPath) => !srcPath.split(path.sep).includes('node_modules'),

  });



  const pkgJsonPath = path.join(dest, 'package.json');

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

  if (pkgJson.dependencies) {

    for (const dep of internalDeps) {

      delete pkgJson.dependencies[dep];

    }

  }

  fs.writeFileSync(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`);



  return `file:${path.join('local_deps', folderName).replace(/\\/g, '/')}`;

}



function linkHoistedDeps() {

  const webNodeModules = path.join(webRoot, 'node_modules');

  const rootNodeModules = path.join(repoRoot, 'node_modules');

  fs.mkdirSync(webNodeModules, { recursive: true });



  const linked = [];

  for (const dep of HOISTED_DEPS) {

    const src = path.join(rootNodeModules, dep);

    const dest = path.join(webNodeModules, dep);

    if (!fs.existsSync(src)) {

      throw new Error(`Missing hoisted dependency "${dep}" at ${src}. Run npm install at repo root.`);

    }

    if (fs.existsSync(dest)) continue;

    fs.symlinkSync(src, dest, process.platform === 'win32' ? 'junction' : 'dir');

    linked.push(dep);

  }



  if (linked.length) {

    fs.writeFileSync(hoistedLinksPath, `${JSON.stringify(linked, null, 2)}\n`);

    console.log(`Linked hoisted deps for Firebase: ${linked.join(', ')}`);

  }

}



function unlinkHoistedDeps() {

  if (!fs.existsSync(hoistedLinksPath)) return;

  const linked = JSON.parse(fs.readFileSync(hoistedLinksPath, 'utf8'));

  for (const dep of linked) {

    const dest = path.join(webRoot, 'node_modules', dep);

    fs.rmSync(dest, { recursive: true, force: true });

  }

  fs.rmSync(hoistedLinksPath, { force: true });

}



function prepare() {

  fs.rmSync(localDepsDir, { recursive: true, force: true });

  fs.mkdirSync(localDepsDir, { recursive: true });

  fs.rmSync(firebaseCacheDir, { recursive: true, force: true });

  unlinkHoistedDeps();



  const fileRefs = {};

  for (const pkg of PACKAGES) {

    fileRefs[pkg.name] = copyPackage(pkg);

  }



  if (!fs.existsSync(backupPath)) {

    fs.copyFileSync(webPkgPath, backupPath);

  }



  const webPkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf8'));

  for (const [name, fileRef] of Object.entries(fileRefs)) {

    webPkg.dependencies[name] = fileRef;

  }

  for (const [name, version] of Object.entries(DEPLOY_ONLY_DEPS)) {

    webPkg.dependencies[name] = version;

  }

  // firebase-frameworks@0.11.x peer-optional sharp ^0.32 || ^0.33; Cloud Build runs npm ci strictly.
  webPkg.dependencies.sharp = '0.33.5';

  fs.writeFileSync(webPkgPath, `${JSON.stringify(webPkg, null, 2)}\n`);

  fs.writeFileSync(path.join(webRoot, '.npmrc'), 'legacy-peer-deps=true\n');



  if (fs.existsSync(webLockPath)) fs.rmSync(webLockPath);
  execSync('npm install --package-lock-only --ignore-scripts --no-audit --no-fund --workspaces=false', {
    cwd: webRoot,
    stdio: 'inherit',
    env: { ...process.env, npm_config_workspaces: 'false' },
  });

  if (!fs.existsSync(webLockPath)) {
    throw new Error('Failed to generate apps/web/package-lock.json for Firebase deploy.');
  }



  linkHoistedDeps();

  console.log('Copied workspace dependencies into local_deps for Firebase deploy.');

}



function restore() {

  unlinkHoistedDeps();

  if (fs.existsSync(backupPath)) {

    fs.copyFileSync(backupPath, webPkgPath);

    fs.rmSync(backupPath);

  }

  fs.rmSync(localDepsDir, { recursive: true, force: true });
  fs.rmSync(webLockPath, { force: true });

  console.log('Restored workspace package.json references.');

}



if (process.argv.includes('--restore')) {

  restore();

} else {

  prepare();

}


