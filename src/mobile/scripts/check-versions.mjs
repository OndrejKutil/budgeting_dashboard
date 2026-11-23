// The web app (src/frontend) ships the JavaScript side of Capacitor and its plugins; this package
// (src/mobile) ships the native side. They must be the exact same versions, or the bridge can break
// in ways that only show up on the phone. Run in CI before every iOS build.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path) => JSON.parse(readFileSync(join(here, path), 'utf8'));

const mobile = read('../package.json');
const frontend = read('../../frontend/package.json');

const deps = (pkg) => ({ ...pkg.dependencies, ...pkg.devDependencies });
const mobileDeps = deps(mobile);
const frontendDeps = deps(frontend);

// Native-only packages that the web app never imports.
const NATIVE_ONLY = new Set(['@capacitor/ios', '@capacitor/cli']);

const problems = [];
for (const [name, version] of Object.entries(mobileDeps)) {
  if (!name.startsWith('@capacitor/') || NATIVE_ONLY.has(name)) continue;
  if (!/^\d+\.\d+\.\d+$/.test(version)) problems.push(`${name}: pin an exact version in src/mobile (found "${version}")`);
  if (!(name in frontendDeps)) problems.push(`${name}: missing from src/frontend/package.json`);
  else if (frontendDeps[name] !== version) {
    problems.push(`${name}: src/mobile has ${version}, src/frontend has ${frontendDeps[name]}`);
  }
}
for (const name of Object.keys(frontendDeps)) {
  if (name.startsWith('@capacitor/') && !(name in mobileDeps)) {
    problems.push(`${name}: used by src/frontend but missing from src/mobile/package.json`);
  }
}
const iosVersion = mobileDeps['@capacitor/ios'];
if (iosVersion !== mobileDeps['@capacitor/core'] || iosVersion !== mobileDeps['@capacitor/cli']) {
  problems.push('@capacitor/core, @capacitor/ios and @capacitor/cli must have the same version in src/mobile');
}

if (problems.length) {
  console.error('Capacitor versions are out of sync:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log('Capacitor versions match between src/mobile and src/frontend.');
