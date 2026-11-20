import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stepFrom, toNumberOrNull, WEIGHT_STEP_KG, REPS_STEP } from '../src/composables/useSetStepper.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: Set-row steppers (step 3 of the set-screen plan)');
console.log('====================================================\n');

console.log('▶ [1] Step constants...');
assert.strictEqual(WEIGHT_STEP_KG, 2.5, 'weight step is 2.5 kg (guess, see plan)');
assert.strictEqual(REPS_STEP, 1);
console.log('✓ Steps verified.');

console.log('▶ [2] Weight steps from the current value...');
assert.strictEqual(stepFrom('20', '', 1, WEIGHT_STEP_KG), 22.5);
assert.strictEqual(stepFrom('22.5', '', -1, WEIGHT_STEP_KG), 20);
assert.strictEqual(stepFrom(20, '', 1, WEIGHT_STEP_KG), 22.5, 'numbers work too');
console.log('✓ Current value stepping verified.');

console.log('▶ [3] Empty value starts from the previous record (prefill)...');
assert.strictEqual(stepFrom('', '18', 1, WEIGHT_STEP_KG), 20.5, 'previous 18 kg, + one step');
assert.strictEqual(stepFrom('', 18, -1, WEIGHT_STEP_KG), 15.5, 'previous 18 kg, - one step');
assert.strictEqual(stepFrom('', '', 1, WEIGHT_STEP_KG), 2.5, 'no previous record starts from 0');
assert.strictEqual(stepFrom(null, undefined, 1, REPS_STEP), 1, 'null/undefined are treated as empty');
console.log('✓ Prefill from the previous record verified.');

console.log('▶ [4] Never below the minimum, one decimal...');
assert.strictEqual(stepFrom('0', '', -1, WEIGHT_STEP_KG), 0, 'weight cannot go below 0');
assert.strictEqual(stepFrom('1', '', -1, REPS_STEP), 0, 'reps cannot go below 0');
assert.strictEqual(stepFrom('10', '', -1, REPS_STEP, 1), 9);
assert.strictEqual(stepFrom('10', '', -1, REPS_STEP, 10), 10, 'custom minimum is respected');
assert.strictEqual(stepFrom('0.1', '', 1, 0.2), 0.3, 'rounds to one decimal');
console.log('✓ Bounds verified.');

console.log('▶ [5] toNumberOrNull...');
assert.strictEqual(toNumberOrNull(''), null);
assert.strictEqual(toNumberOrNull(null), null);
assert.strictEqual(toNumberOrNull('abc'), null);
assert.strictEqual(toNumberOrNull('8'), 8);
console.log('✓ Parsing verified.');

console.log('▶ [6] ExerciseCard wiring: ± steppers, Done 56 px, keypad still reachable by tapping the value...');
const card = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
assert.ok(card.includes("from '../composables/useSetStepper.js'"), 'ExerciseCard imports the stepper math');
assert.ok(card.includes('@click="stepWeight(sIdx, -1)"') && card.includes('@click="stepWeight(sIdx, 1)"'), 'weight ± buttons');
assert.ok(card.includes('@click="stepReps(sIdx, -1)"') && card.includes('@click="stepReps(sIdx, 1)"'), 'reps ± buttons');
assert.ok(card.includes('@click="openWeightKeypad(sIdx)"') && card.includes('@click="openRepsKeypad(sIdx, set.reps)"'), 'tapping the value still opens the keypad');
assert.ok(card.includes('w-11 h-11 sm:w-14 sm:h-14 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-base'), 'Done button is 44 px on phones, 56 px from 640 px (density step 1)');
assert.ok(!card.includes('grid-cols-[1fr_72px_58px_50px_34px]'), 'old 5-column set row is gone');
assert.ok(card.includes('ครั้งก่อน {{ getPrevWeight(sIdx) }} กก.'), 'previous record line shows under the set');
console.log('✓ ExerciseCard wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL SET-STEPPER TESTS PASSED!');
console.log('====================================================');
