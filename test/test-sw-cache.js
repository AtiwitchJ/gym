import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { swBuildIdPlugin, BUILD_ID_PLACEHOLDER } from '../vite.config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const swSource = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: Service worker cache versioning (blank-screen fix)');
console.log('====================================================\n');

// 1. Cache name must come from the build, never a fixed literal.
console.log('▶ [1] CACHE_NAME is per build, not fixed...');
assert.ok(
  swSource.includes(`const CACHE_NAME = 'atiwitch-log-${BUILD_ID_PLACEHOLDER}';`),
  'public/sw.js must use the build-id placeholder for CACHE_NAME'
);
assert.ok(!/atiwitch-log-v\d+/.test(swSource), 'public/sw.js must not contain a fixed cache version like v4/v6');
assert.ok(!fs.existsSync(path.join(root, 'sw.js')), 'stale root sw.js must not exist (it was a second, out-of-date copy)');
console.log('✓ Cache name is a build placeholder; no fixed version remains.');

// 2. The build plugin replaces the placeholder, and two builds get different names.
console.log('▶ [2] Build plugin writes a unique cache name per build...');
function buildOnce(buildId) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-build-'));
  fs.writeFileSync(path.join(dir, 'sw.js'), swSource);
  swBuildIdPlugin({ distDir: dir, buildId }).closeBundle();
  const out = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}
const buildA = buildOnce('build-aaa');
const buildB = buildOnce('build-bbb');
assert.ok(!buildA.includes(BUILD_ID_PLACEHOLDER), 'placeholder must be replaced in build output');
assert.ok(buildA.includes("const CACHE_NAME = 'atiwitch-log-build-aaa';"), 'build A must get its own cache name');
assert.ok(buildB.includes("const CACHE_NAME = 'atiwitch-log-build-bbb';"), 'build B must get its own cache name');
assert.notStrictEqual(buildA.match(/CACHE_NAME = '([^']+)'/)[1], buildB.match(/CACHE_NAME = '([^']+)'/)[1]);
console.log('✓ Each build gets a distinct cache name.');

// 3. Activate drops every cache that is not the current build's cache.
console.log('▶ [3] Activate deletes old caches...');
assert.ok(
  /keys\.filter\(\(key\) => key !== CACHE_NAME\)/.test(swSource) && /caches\.delete\(key\)/.test(swSource),
  'activate must delete all caches except CACHE_NAME'
);
console.log('✓ Old caches are removed on activate.');

// 4. Navigation (HTML) is network-first, not stale-first.
console.log('▶ [4] HTML navigation is network first...');
const navBranch = swSource.slice(swSource.indexOf('if (isNavigation(request))'), swSource.indexOf('// Static files'));
assert.ok(navBranch.includes('fetch(request)'), 'navigation must try the network first');
assert.ok(navBranch.indexOf('fetch(request)') < navBranch.indexOf('caches.match(request)'),
  'navigation must try the network before the cache');
assert.ok(navBranch.includes("caches.match('./index.html')"), 'offline fallback to cached index.html must remain');
console.log('✓ Navigation uses the network first; cache is an offline fallback only.');

console.log('\n====================================================');
console.log('🎉 ALL SERVICE WORKER CACHE TESTS PASSED!');
console.log('====================================================');
