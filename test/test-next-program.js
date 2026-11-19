import assert from 'node:assert';
import { nextProgramKey, latestProgramSession } from '../src/data/workouts.js';
import { useWorkoutStore } from '../src/composables/useWorkoutStore.js';

console.log('====================================================');
console.log('🧪 QA Test: Next program follows the last completed session (step 2)');
console.log('====================================================\n');

const s = (dayKey, date, time = '18:00') => ({ id: `${dayKey}_${date}_${time}`, dayKey, date, time });

console.log('▶ [1] No completed A/B session -> Program A...');
assert.strictEqual(nextProgramKey([]), 'prog_a');
assert.strictEqual(nextProgramKey(undefined), 'prog_a', 'missing history must not throw');
console.log('✓ Empty history starts with A.');

console.log('▶ [2] Opposite of the last completed program...');
assert.strictEqual(nextProgramKey([s('prog_a', '2026-11-16')]), 'prog_b');
assert.strictEqual(nextProgramKey([s('prog_b', '2026-11-16')]), 'prog_a');
console.log('✓ A -> B and B -> A.');

console.log('▶ [3] Newest session wins, regardless of array order...');
const unsorted = [s('prog_a', '2026-11-09'), s('prog_b', '2026-11-16'), s('prog_a', '2026-11-12')];
assert.strictEqual(latestProgramSession(unsorted).date, '2026-11-16');
assert.strictEqual(nextProgramKey(unsorted), 'prog_a', 'newest is B, so next is A');
assert.strictEqual(nextProgramKey([...unsorted].reverse()), 'prog_a', 'order of the array does not matter');
console.log('✓ Newest-first selection verified.');

console.log('▶ [4] Same day: the later time wins...');
assert.strictEqual(nextProgramKey([s('prog_a', '2026-11-16', '07:00'), s('prog_b', '2026-11-16', '18:00')]), 'prog_a');
assert.strictEqual(nextProgramKey([s('prog_a', '2026-11-16', '18:00'), s('prog_b', '2026-11-16', '07:00')]), 'prog_b');
console.log('✓ Time tie-break verified.');

console.log('▶ [5] Rest and legacy weekday sessions are ignored...');
const noise = [s('rest', '2026-11-20'), s('mon', '2026-11-19'), s('tue', '2026-11-18'), s('prog_b', '2026-11-16')];
assert.strictEqual(nextProgramKey(noise), 'prog_a', 'only the prog_b session counts');
assert.strictEqual(nextProgramKey([s('mon', '2026-11-19')]), 'prog_a', 'legacy-only history starts with A');
console.log('✓ Non-program sessions do not affect the next program.');

console.log('▶ [6] Skipped weekday does not change the answer...');
// Trained A on Monday, skipped Wednesday, opening on Friday: the next program is still B.
const skippedWednesday = [s('prog_a', '2026-11-16')];
assert.strictEqual(nextProgramKey(skippedWednesday), 'prog_b');
console.log('✓ Calendar days are not used.');

console.log('▶ [7] Saving Program A resets only A and moves วันนี้ to B...');
{
  const store = useWorkoutStore();
  store.switchTab('today');
  const firstA = store.workoutData.prog_a.exercises[0];
  store.userState.prog_b = { keepMe: { set_0: true } };          // B's state must survive A's save
  store.toggleSetDone('prog_a', firstA.id, 0);                    // tick a set in A
  assert.strictEqual(store.userState.prog_a[firstA.id].set_0, true, 'precondition: A set ticked');
  await store.finishAndSaveWorkout();
  assert.strictEqual(store.userState.prog_a[firstA.id].set_0, undefined, 'A checkmarks reset after save');
  assert.deepStrictEqual(store.userState.prog_b.keepMe, { set_0: true }, "B's state is untouched by A's save");
  assert.strictEqual(store.workoutHistory.value[0].dayKey, 'prog_a', 'the saved session is Program A');
  assert.strictEqual(store.todayProgramKey.value, 'prog_b', 'วันนี้ moves to B after A is saved');
  assert.strictEqual(store.currentDay.value, 'prog_b', 'open วันนี้ tab shows B after the save');
  console.log('✓ Save ordering verified (regression for the reset-on-wrong-day bug).');
}

console.log('\n====================================================');
console.log('🎉 ALL NEXT-PROGRAM TESTS PASSED!');
console.log('====================================================');
