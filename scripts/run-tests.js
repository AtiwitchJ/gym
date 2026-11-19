// Runs the test chain (package.json "test:chain") one step at a time.
// Every step gets GYM_DB_PATH pointing at a temporary database, so tests never touch data/gym.db.
// The temporary directory is removed when the run ends, pass or fail.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const steps = pkg.scripts['test:chain'].split('&&').map((s) => s.trim()).filter(Boolean);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-test-'));
const env = { ...process.env, GYM_DB_PATH: path.join(tmpDir, 'gym-test.db') };

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

if (exitCode === 0) console.log(`\n✓ All ${steps.length} test steps passed (temp DB removed).`);
process.exit(exitCode);
