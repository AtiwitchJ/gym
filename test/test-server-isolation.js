import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateEstimated1RM as serverE1RM } from '../server/estimate.js';
import { calculateEstimated1RM as frontendE1RM } from '../src/composables/useRpeAdvisor.js';

/**
 * Docker runner image copies only server/ (and dist/), so server code must never require files outside server/.
 * This test scans server/*.js and fails on any relative require/import that climbs out of server/.
 * It also checks that the server e1RM copy matches the frontend formula.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = path.join(root, 'server');

console.log('====================================================');
console.log('🧪 Test: Server isolation (no requires outside server/)');
console.log('====================================================\n');

// 1. Static scan
console.log('▶ [1] Scanning server/*.js for requires outside server/...');
const files = fs.readdirSync(serverDir).filter((f) => f.endsWith('.js'));
const escapePatterns = [
  /require\(\s*['"`]\.\.\//,      // require('../...')
  /import\s+[^'"`;]*from\s*['"`]\.\.\//, // import x from '../...'
  /import\(\s*['"`]\.\.\//,       // import('../...')
];
const violations = [];
for (const file of files) {
  const lines = fs.readFileSync(path.join(serverDir, file), 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (escapePatterns.some((re) => re.test(line))) {
      violations.push(`server/${file}:${i + 1}: ${line.trim()}`);
    }
  });
}
assert.deepStrictEqual(violations, [], `server/ must not require outside server/:\n${violations.join('\n')}`);
console.log(`✓ ${files.length} server files checked, no requires outside server/.`);

// 2. Parity of e1RM formula (server copy vs frontend)
console.log('▶ [2] e1RM parity: server/estimate.js vs src/composables/useRpeAdvisor.js...');
const weights = [0, 1, 2.5, 20, 60, 80, 100.5, 250, '80', '', null, undefined, NaN];
const reps = [0, 1, 3, 5, 8, 12, 15, 30, '8', '', null, undefined];
const rirs = [undefined, null, '', 0, 1, 2, 3, 4, '2'];
let cases = 0;
for (const w of weights) for (const r of reps) for (const rir of rirs) {
  const a = serverE1RM(w, r, rir);
  const b = frontendE1RM(w, r, rir);
  assert.strictEqual(a, b, `mismatch for weight=${w} reps=${r} rir=${rir}: server ${a} vs frontend ${b}`);
  cases++;
}
assert.strictEqual(serverE1RM(80, 8, 2), 106.7); // spec example
console.log(`✓ ${cases} input combinations match (80 kg × 8 at RIR 2 = 106.7).`);

console.log('\n====================================================');
console.log('🎉 SERVER ISOLATION TESTS PASSED!');
console.log('====================================================');
