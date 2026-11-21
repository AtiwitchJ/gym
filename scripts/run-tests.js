// Runs the guarded test steps listed in package.json "test:chain-steps", one at a time.
// Guards:
//  - every step gets GYM_DB_PATH pointing at a temporary database;
//  - every step gets GYM_FORBID_REAL_DB=1, so server/db.js refuses to open data/gym.db (fails the step loudly);
//  - the sha256 of data/gym.db is taken before and after the run; a change fails the run.
// The temporary directory is removed when the run ends, pass or fail.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const steps = pkg.scripts['test:chain-steps'].split('&&').map((s) => s.trim()).filter(Boolean);
const realDb = path.join(root, 'data', 'gym.db');

const sha256 = (file) => (fs.existsSync(file)
  ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  : 'absent');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-test-'));
const env = {
  ...process.env,
  GYM_DB_PATH: path.join(tmpDir, 'gym-test.db'),
  GYM_FORBID_REAL_DB: '1'
};

const shaBefore = sha256(realDb);
let exitCode = 0;
try {
  for (const step of steps) {
    console.log(`\n▶ ${step}`);
    const result = spawnSync(step, { cwd: root, env, shell: true, stdio: 'inherit' });
    if (result.status !== 0) {
      console.error(`\n✗ Failed: ${step}`);
      exitCode = result.status ?? 1;
      break;
    }
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

const shaAfter = sha256(realDb);
console.log(`\ndata/gym.db sha256 before: ${shaBefore}`);
console.log(`data/gym.db sha256 after:  ${shaAfter}`);
if (shaBefore !== shaAfter) {
  console.error('\n✗ data/gym.db changed during the test run. Tests must not write to the real database.');
  exitCode = exitCode || 1;
}

if (exitCode === 0) console.log(`\n✓ All ${steps.length} test steps passed (temp DB removed, data/gym.db unchanged).`);
process.exit(exitCode);
