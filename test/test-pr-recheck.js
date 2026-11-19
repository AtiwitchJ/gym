import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isNewPr } from '../src/composables/usePersonalRecords.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: PR badge is re-checked when RIR or values change after Done (regular item 3)');
console.log('====================================================\n');

console.log('▶ [1] The same set beats a stored PR only once its RIR is known...');
// Stored PR e1RM 90. 70 kg × 8 at RIR 2 = 93.3 (a PR). Without RIR at Done it is 88.7 (not a PR).
assert.strictEqual(isNewPr({ weight: 70, reps: 8, rir: null }, 90).isPr, false, 'at Done, before RIR: no badge');
assert.strictEqual(isNewPr({ weight: 70, reps: 8, rir: 2 }, 90).isPr, true, 'after RIR 2 is chosen: badge');
console.log('✓ RIR changes the result, so the check has to run again.');

console.log('▶ [2] ExerciseCard checks again on every change to a done set...');
const card = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
const stepW = card.slice(card.indexOf('function stepWeight'), card.indexOf('function stepReps'));
const stepR = card.slice(card.indexOf('function stepReps'), card.indexOf('// RIR after Done (step 5)'));
const pick = card.slice(card.indexOf('function pickRir'), card.indexOf('function getWeight(sIdx)') > 0 ? card.indexOf('function getWeight(sIdx)') : card.length);
assert.ok(stepW.includes('if (isSetDone(sIdx)) evaluatePrOnTick(sIdx);'), 'weight steppers re-check');
assert.ok(stepR.includes('if (isSetDone(sIdx)) evaluatePrOnTick(sIdx);'), 'reps steppers re-check');
assert.ok(pick.includes('if (isSetDone(sIdx)) evaluatePrOnTick(sIdx);'), 'RIR choice re-checks');
console.log('✓ Re-check wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL PR RE-CHECK TESTS PASSED!');
console.log('====================================================');
