import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateEstimated1RM as frontendE1RM } from '../src/composables/useRpeAdvisor.js';
import { calculateEstimated1RM as serverE1RM } from '../server/estimate.js';
import { formatOneRm, ONE_RM_RIR_CHOICES, useOneRmCalculator } from '../src/composables/useOneRm.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: Standalone 1RM calculator (gap item 4)');
console.log('====================================================\n');

console.log('▶ [1] Acceptance: 80 kg × 8 at RIR 2 gives 106.7...');
assert.strictEqual(formatOneRm(80, 8, 2), '106.7');
assert.strictEqual(formatOneRm('80', '8', '2'), '106.7', 'text input works too');
console.log('✓ Acceptance vector verified.');

console.log('▶ [2] Weight or reps of 0 (or missing) shows "—"...');
assert.strictEqual(formatOneRm(0, 8, 2), '—', 'weight 0');
assert.strictEqual(formatOneRm(80, 0, 2), '—', 'reps 0');
assert.strictEqual(formatOneRm('', '', 0), '—', 'empty inputs');
assert.strictEqual(formatOneRm(80, 'abc', 0), '—', 'non-numeric reps');
assert.strictEqual(formatOneRm(-5, 8, 0), '—', 'negative weight');
console.log('✓ "—" cases verified.');

console.log('▶ [3] Client and server give the same result on every test vector...');
const weights = [0, 1, 2.5, 20, 80, 97.5, 150, 152.5];
const reps = [0, 1, 3, 5, 8, 10, 15, 20];
const rirs = [null, undefined, '', 0, 1, 2, 3, 4, '2'];
let vectors = 0;
for (const w of weights) {
  for (const r of reps) {
    for (const rir of rirs) {
      const client = frontendE1RM(w, r, rir);
      const server = serverE1RM(w, r, rir);
      assert.strictEqual(client, server, `mismatch for ${w} × ${r} RIR ${rir}: client ${client}, server ${server}`);
      vectors++;
    }
  }
}
console.log(`✓ ${vectors} vectors match on client and server.`);

console.log('▶ [4] The choices and the shared open state...');
assert.deepStrictEqual(ONE_RM_RIR_CHOICES.map((c) => c.value), [0, 1, 2, 3]);
const state = useOneRmCalculator();
assert.strictEqual(state.isOpen.value, false);
state.open();
assert.strictEqual(state.isOpen.value, true);
state.close();
assert.strictEqual(state.isOpen.value, false);
console.log('✓ Choices and open state verified.');

console.log('▶ [5] Wiring: App mounts the modal, the account page opens it, the modal uses the shared helper...');
const app = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8');
assert.ok(app.includes('<OneRmCalculatorModal />') && app.includes("import OneRmCalculatorModal from './components/OneRmCalculatorModal.vue';"), 'App mounts the modal');
const profile = fs.readFileSync(path.join(root, 'src/components/ProfileView.vue'), 'utf8');
assert.ok(profile.includes('@click="openOneRm"') && profile.includes('🧮 คำนวณ 1RM'), 'account page button');
const modal = fs.readFileSync(path.join(root, 'src/components/OneRmCalculatorModal.vue'), 'utf8');
assert.ok(modal.includes('formatOneRm(weight.value, reps.value, rir.value)'), 'modal uses the shared formatter');
assert.ok(!modal.includes('calculateEstimated1RM'), 'modal does not repeat the formula');
console.log('✓ Wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL 1RM CALCULATOR TESTS PASSED!');
console.log('====================================================');
