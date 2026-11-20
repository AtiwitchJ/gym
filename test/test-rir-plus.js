import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RIR_CHOICES, nextRirSelection, isRirChoiceSelected, rirLabel } from '../src/composables/useRir.js';
import { useWorkoutStore } from '../src/composables/useWorkoutStore.js';
import os from 'node:os';

// Rule: tests never write to data/gym.db. Use a temp database (set before server/db.js loads).
if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-rirplus-')), 'gym-test.db');
}
const { default: repo } = await import('../server/db.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: RIR "เหลือ 2+" keeps the 2-or-more meaning (advanced tester item 1)');
console.log('====================================================\n');

const [plus2, one, fail] = RIR_CHOICES;

console.log('▶ [1] Choices: 2+ is marked as the 2-or-more choice...');
assert.strictEqual(plus2.value, 2);
assert.strictEqual(plus2.plus, true, '"เหลือ 2+" carries plus: true');
assert.ok(!one.plus && !fail.plus, 'other choices are not plus');
console.log('✓ Choices verified.');

console.log('▶ [2] Selecting, switching, and clearing...');
assert.deepStrictEqual(nextRirSelection(null, false, plus2), { rir: 2, rirPlus: true }, 'tap 2+ selects 2+');
assert.deepStrictEqual(nextRirSelection(2, true, plus2), { rir: null, rirPlus: false }, 'tap 2+ again clears it');
assert.deepStrictEqual(nextRirSelection(2, true, one), { rir: 1, rirPlus: false }, 'tap 1 switches from 2+');
assert.deepStrictEqual(nextRirSelection(1, false, fail), { rir: 0, rirPlus: false }, 'tap ล้ม selects 0');
assert.strictEqual(isRirChoiceSelected(2, true, plus2), true, '2+ is highlighted when selected');
assert.strictEqual(isRirChoiceSelected(2, false, plus2), false, 'an old plain 2 does not highlight the 2+ button');
assert.strictEqual(isRirChoiceSelected(2, false, one), false);
console.log('✓ Selection rules verified.');

console.log('▶ [3] Labels in history: "2+" vs "2"...');
assert.strictEqual(rirLabel(2, true), '2+');
assert.strictEqual(rirLabel(2, false), '2');
assert.strictEqual(rirLabel(1, false), '1');
assert.strictEqual(rirLabel(0, false), '0');
assert.strictEqual(rirLabel(null, false), '—');
console.log('✓ Labels verified.');

console.log('▶ [4] Store: the flag is kept per set and sent with the saved session...');
const store = useWorkoutStore();
store.currentDay.value = 'prog_a';
const ex = store.workoutData.prog_a.exercises[0];
store.toggleSetDone('prog_a', ex.id, 1);
store.updateRir('prog_a', ex.id, 1, 2, true);
assert.strictEqual(store.userState.prog_a[ex.id].rir_1, 2);
assert.strictEqual(store.userState.prog_a[ex.id].rirPlus_1, true);
store.toggleSetDone('prog_a', ex.id, 2);
store.updateRir('prog_a', ex.id, 2, 2, false);
assert.strictEqual(store.userState.prog_a[ex.id].rirPlus_2, false, 'a plain 2 is not plus');
await store.finishAndSaveWorkout();
const sessionRow = store.workoutHistory.value[0];
const savedEx = sessionRow.exercises.find((e) => e.id === ex.id);
assert.strictEqual(savedEx.sets.find((x) => x.setIndex === 2).rirPlus, true, 'saved 2+ set keeps the flag');
assert.strictEqual(savedEx.sets.find((x) => x.setIndex === 3).rirPlus, false, 'saved plain 2 set is not plus');
console.log('✓ Store and save path verified.');

console.log('▶ [5] Database: the flag survives a save and read...');
const testId = `rirplus_test_${Date.now()}`;
repo.saveSession({
  id: testId,
  date: '2026-11-19',
  time: '09:00',
  dayKey: 'prog_a',
  dayTitle: 'RIR plus test',
  exercises: [{
    id: 'a1',
    name: 'RIR plus check',
    category: 'test',
    sets: [
      { setIndex: 2, type: 'เล่นจริง', target: '6-8', weight: 70, actualReps: 8, done: true, rir: 2, rirPlus: true },
      { setIndex: 3, type: 'เล่นจริง', target: '6-8', weight: 70, actualReps: 8, done: true, rir: 2, rirPlus: false }
    ]
  }]
});
try {
  const history = repo.getExerciseHistory('a1');
  const row = history.find((h) => h.sessionId === testId);
  assert.ok(row, 'saved session is found in the exercise history');
  assert.strictEqual(row.sets.find((x) => x.setIndex === 2).rirPlus, true, '2+ survives the database');
  assert.strictEqual(row.sets.find((x) => x.setIndex === 3).rirPlus, false, 'plain 2 survives the database');
  assert.strictEqual(row.sets.find((x) => x.setIndex === 2).rir, 2);
  const all = repo.getHistory().find((h) => h.id === testId);
  assert.strictEqual(all.exercises[0].sets.find((x) => x.setIndex === 2).rirPlus, true, 'getHistory returns the flag too');
} finally {
  repo.deleteSession(testId);
}
console.log('✓ Database round trip verified (test session removed).');

console.log('▶ [6] Card wiring: both cards show 2+ as selected, and keep the unconfirmed note...');
const card = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
const bonus = fs.readFileSync(path.join(root, 'src/components/BonusCard.vue'), 'utf8');
for (const [name, src] of [['ExerciseCard', card], ['BonusCard', bonus]]) {
  assert.ok(src.includes('@click="pickRir(sIdx, opt)"'), `${name} passes the whole choice`);
  assert.ok(src.includes(':class="isRirSelected(sIdx, opt)'), `${name} highlights from the plus-aware check`);
}
const rirSource = fs.readFileSync(path.join(root, 'src/composables/useRir.js'), 'utf8');
assert.ok(rirSource.includes('NOT YET CONFIRMED'), 'the unconfirmed mapping note stays');
console.log('✓ Card wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL RIR 2+ TESTS PASSED!');
console.log('====================================================');
