import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Guard: with GYM_FORBID_REAL_DB=1, opening data/gym.db must fail; a temp GYM_DB_PATH must work.
 * Runs child processes so the guard is tested the same way the runner uses it. Never opens data/gym.db.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const realDb = path.join(root, 'data', 'gym.db');
const shaOf = (f) => (fs.existsSync(f) ? fs.statSync(f).size + ':' + fs.statSync(f).mtimeMs : 'absent');

console.log('====================================================');
console.log('🧪 Test: DB guard (tests cannot open data/gym.db)');
console.log('====================================================\n');

const baseEnv = { ...process.env };
delete baseEnv.GYM_DB_PATH;
const probe = 'require("./server/db.js"); console.log("opened")';

const realBefore = shaOf(realDb);

// 1. Forbidden: no GYM_DB_PATH and the flag set -> the step fails
console.log('▶ [1] Real database refused when GYM_FORBID_REAL_DB=1...');
const refused = spawnSync(process.execPath, ['-e', probe], {
  cwd: root,
  env: { ...baseEnv, GYM_FORBID_REAL_DB: '1' },
  encoding: 'utf8'
});
assert.notStrictEqual(refused.status, 0, 'step must fail when it would open the real DB');
assert.match(refused.stderr, /refusing to open data\/gym\.db/);
console.log('✓ Child exited non-zero with the refusal message.');

// 2. Forbidden path given explicitly as the real file -> also refused
console.log('▶ [2] Explicit real path refused...');
const explicit = spawnSync(process.execPath, ['-e', probe], {
  cwd: root,
  env: { ...baseEnv, GYM_FORBID_REAL_DB: '1', GYM_DB_PATH: realDb },
  encoding: 'utf8'
});
assert.notStrictEqual(explicit.status, 0, 'explicit real path must be refused');
console.log('✓ GYM_DB_PATH pointing at data/gym.db is refused too.');

// 3. Temp path works under the same flag
console.log('▶ [3] Temp path allowed under the flag...');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-guard-'));
const ok = spawnSync(process.execPath, ['-e', probe], {
  cwd: root,
  env: { ...baseEnv, GYM_FORBID_REAL_DB: '1', GYM_DB_PATH: path.join(tmp, 'g.db') },
  encoding: 'utf8'
});
assert.strictEqual(ok.status, 0, ok.stderr);
assert.match(ok.stdout, /opened/);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('✓ Temp database opens normally.');

// 4. The real database file was not changed by these checks
assert.strictEqual(shaOf(realDb), realBefore, 'data/gym.db must be unchanged by the guard test');
console.log('✓ data/gym.db unchanged by this test.');

console.log('\n====================================================');
console.log('🎉 DB GUARD TESTS PASSED!');
console.log('====================================================');
