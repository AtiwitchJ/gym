import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isNewPr, getBaselineE1rm, clearPrCache } from '../src/composables/usePersonalRecords.js';
import { useWorkoutStore } from '../src/composables/useWorkoutStore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: PR badge on tick (step 6a)');
console.log('====================================================\n');

console.log('▶ [1] A set is a PR only when it beats a stored record...');
// baseline e1RM 20 kg x 8 -> 25.3 (weight x (1 + reps/30)); 10 kg x 8 -> 12.7
assert.strictEqual(isNewPr({ weight: 12.5, reps: 8, rir: 0 }, null).isPr, false, 'no stored record -> no badge');
assert.strictEqual(isNewPr({ weight: 10, reps: 8, rir: 0 }, 12.7).isPr, false, 'equal to the record is not a PR');
assert.strictEqual(isNewPr({ weight: 12.5, reps: 8, rir: 0 }, 12.7).isPr, true, 'beats the record');
assert.strictEqual(isNewPr({ weight: 12.5, reps: 8, rir: 2 }, 12.7).isPr, true, 'RIR counts toward the estimate');
assert.strictEqual(isNewPr({ weight: 12.5, reps: 8, isWarm: true }, 1).isPr, false, 'warm-up sets never give a PR');
assert.strictEqual(isNewPr({ weight: '', reps: 8 }, 1).isPr, false, 'empty weight is not a PR');
assert.strictEqual(isNewPr({ weight: 12.5, reps: 0 }, 1).isPr, false, 'zero reps is not a PR');
const r = isNewPr({ weight: 10, reps: 8, rir: 0 }, 1);
assert.ok(Math.abs(r.e1rm - 12.7) < 0.05, `e1RM of 10 x 8 is about 12.7, got ${r.e1rm}`);
console.log('✓ PR rule verified.');

console.log('▶ [2] Stored PR is read from the history endpoint and cached...');
let calls = 0;
const okFetch = async (url) => {
  calls += 1;
  assert.strictEqual(url, '/api/exercises/a1%2Fx/history');
  return { ok: true, status: 200, json: async () => [{ pr: { estimated1RM: 25.3 } }] };
};
clearPrCache();
assert.strictEqual(await getBaselineE1rm('a1/x', okFetch), 25.3);
assert.strictEqual(await getBaselineE1rm('a1/x', okFetch), 25.3);
assert.strictEqual(calls, 1, 'second call uses the cache');
clearPrCache();
assert.strictEqual(await getBaselineE1rm('a1/x', okFetch), 25.3);
assert.strictEqual(calls, 2, 'clearPrCache forces a fresh read');

clearPrCache();
const noRecord = async () => ({ ok: true, status: 200, json: async () => [] });
assert.strictEqual(await getBaselineE1rm('new', noRecord), null, 'no sessions -> null (no badge)');
const broken = async () => { throw new Error('offline'); };
clearPrCache();
assert.strictEqual(await getBaselineE1rm('bad', broken), undefined, 'failed read -> undefined (no badge)');
clearPrCache();
console.log('✓ Baseline lookup verified.');

console.log('▶ [3] Store keeps the PR flag per set...');
const store = useWorkoutStore();
store.setPrFlag('prog_a', 'a1_chest_press', 1, true);
assert.strictEqual(store.userState.prog_a.a1_chest_press.pr_1, true);
store.setPrFlag('prog_a', 'a1_chest_press', 1, false);
assert.strictEqual(store.userState.prog_a.a1_chest_press.pr_1, false);
console.log('✓ Store flag verified.');

console.log('▶ [4] ExerciseCard wiring: badge on the set row, check on tick...');
const card = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
assert.ok(card.includes('v-if="getPrFlag(sIdx)"') && card.includes('🏆 PR'), 'PR badge on the set row');
assert.ok(card.includes('evaluatePrOnTick(sIdx);'), 'PR is checked when a set is ticked');
assert.ok(card.includes("import { isNewPr, getBaselineE1rm } from '../composables/usePersonalRecords.js';"), 'ExerciseCard imports the PR helpers');
assert.ok(card.includes('setPrFlag(currentDay.value, props.exercise.id, sIdx, false);'), 'untick clears the PR flag');
console.log('✓ ExerciseCard wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL PR-BADGE TESTS PASSED!');
console.log('====================================================');
