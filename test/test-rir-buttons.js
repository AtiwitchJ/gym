import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RIR_CHOICES, normalizeRir, nextRir } from '../src/composables/useRir.js';
import { useWorkoutStore } from '../src/composables/useWorkoutStore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: RIR buttons after Done (step 5)');
console.log('====================================================\n');

console.log('▶ [1] Exactly three choices: เหลือ 2+, เหลือ 1, ล้ม...');
assert.deepStrictEqual(RIR_CHOICES.map((c) => c.value), [2, 1, 0]);
assert.deepStrictEqual(RIR_CHOICES.map((c) => c.label), ['เหลือ 2+', 'เหลือ 1', 'ล้ม']);
console.log('✓ Choices verified.');

console.log('▶ [2] Stored value rules...');
assert.strictEqual(normalizeRir(null), null);
assert.strictEqual(normalizeRir(''), null);
assert.strictEqual(normalizeRir(undefined), null);
assert.strictEqual(normalizeRir(0), 0);
assert.strictEqual(normalizeRir('1'), 1);
assert.strictEqual(normalizeRir(2), 2);
assert.strictEqual(normalizeRir(3), 2, '3 or more is stored as 2+');
assert.strictEqual(normalizeRir(-1), null);
assert.strictEqual(normalizeRir('x'), null);
console.log('✓ Normalization verified.');

console.log('▶ [3] Tap the chosen button again to clear it...');
assert.strictEqual(nextRir(null, 1), 1, 'first tap selects');
assert.strictEqual(nextRir(1, 1), null, 'same tap clears');
assert.strictEqual(nextRir(1, 0), 0, 'another button switches');
assert.strictEqual(nextRir(0, 0), null, 'clearing works for 0 too');
console.log('✓ Toggle behaviour verified.');

console.log('▶ [4] Store: RIR is saved with the day and goes into the session history...');
const store = useWorkoutStore();
store.currentDay.value = 'prog_a';
store.switchTab('today');
const first = store.workoutData.prog_a.exercises[0];
store.toggleSetDone('prog_a', first.id, 0);
store.updateRir('prog_a', first.id, 0, 1);
assert.strictEqual(store.userState.prog_a[first.id].rir_0, 1, 'RIR stored on the set');
store.updateRir('prog_a', first.id, 0, nextRir(1, 1));
assert.strictEqual(store.userState.prog_a[first.id].rir_0, null, 'tapping the same choice clears it');
store.updateRir('prog_a', first.id, 0, 2);
await store.finishAndSaveWorkout();
const saved = store.workoutHistory.value[0];
assert.strictEqual(saved.dayKey, 'prog_a');
const savedFirst = saved.exercises.find((e) => e.id === first.id);
assert.strictEqual(savedFirst.sets[0].rir, 2, 'RIR 2 (2+) is in the saved set');
assert.strictEqual(savedFirst.sets[1].rir, null, 'an unanswered set has no RIR');
console.log('✓ Store and history wiring verified.');

console.log('▶ [5] ExerciseCard wiring: buttons appear only after Done...');
const card = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
assert.ok(card.includes('v-for="opt in RIR_CHOICES"'), 'RIR buttons are rendered from the choices');
assert.ok(card.includes('@click="pickRir(sIdx, opt.value)"'), 'tapping a RIR button calls pickRir');
assert.ok(card.includes('<div v-if="isSetDone(sIdx)" class="mt-2 flex items-center gap-1.5 flex-wrap">'), 'RIR row only shows after Done');
assert.ok(card.includes("import { RIR_CHOICES, normalizeRir, nextRir } from '../composables/useRir.js';"), 'ExerciseCard imports the RIR helpers');
assert.ok(card.includes('  updateRir,'), 'ExerciseCard gets updateRir from the store');
console.log('✓ ExerciseCard wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL RIR-BUTTON TESTS PASSED!');
console.log('====================================================');
