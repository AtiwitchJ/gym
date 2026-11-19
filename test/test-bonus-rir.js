import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { useWorkoutStore } from '../src/composables/useWorkoutStore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: RIR row on bonus sets (review item 2)');
console.log('====================================================\n');

console.log('▶ [1] BonusCard shows the same RIR row as ExerciseCard, only after Done...');
const bonus = fs.readFileSync(path.join(root, 'src/components/BonusCard.vue'), 'utf8');
assert.ok(bonus.includes('<div v-if="isSetDone(sIdx)" class="col-span-full mt-1 flex items-center gap-1.5 flex-wrap">'), 'RIR row only after Done, full width');
assert.ok(bonus.includes('v-for="opt in RIR_CHOICES"') && bonus.includes('@click="pickRir(sIdx, opt.value)"'), 'three choices, tap to pick');
assert.ok(bonus.includes('min-h-[44px] min-w-[44px] px-3 rounded-xl border-2 border-plate text-xs font-heading font-bold'), 'choice buttons are 44 px');
assert.ok(bonus.includes("import { RIR_CHOICES, normalizeRir, nextRir } from '../composables/useRir.js';"), 'same helpers as ExerciseCard');
assert.ok(bonus.includes('updateRir(currentDay.value, props.bonus.id, sIdx, nextRir(getRir(sIdx), value));'), 'stored on the bonus exercise');
console.log('✓ BonusCard row verified.');

console.log('▶ [2] A bonus set RIR is saved with the session history...');
const store = useWorkoutStore();
store.currentDay.value = 'mon'; // the legacy day that still has bonus exercises in the data
const bEx = store.workoutData.mon.bonusExercises[0];
store.toggleSetDone('mon', bEx.id, 0);
store.updateRir('mon', bEx.id, 0, 1);
assert.strictEqual(store.userState.mon[bEx.id].rir_0, 1, 'bonus RIR stored on the day state');
await store.finishAndSaveWorkout();
const saved = store.workoutHistory.value[0];
const savedBonus = saved.exercises.find((e) => e.id === bEx.id);
assert.ok(savedBonus, 'bonus exercise is in the saved session');
assert.strictEqual(savedBonus.sets[0].rir, 1, 'bonus set keeps RIR 1');
assert.strictEqual(savedBonus.sets[1].rir, null, 'an unanswered bonus set has no RIR');
console.log('✓ Bonus RIR reaches the saved history.');

console.log('\n====================================================');
console.log('🎉 ALL BONUS RIR TESTS PASSED!');
console.log('====================================================');
