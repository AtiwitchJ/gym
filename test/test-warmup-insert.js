import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planWarmupInsert, isWarmSetType } from '../src/composables/warmupCalc.js';
import { useWorkoutStore } from '../src/composables/useWorkoutStore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: 1-Click Warm-up Set Generator');
console.log('====================================================\n');

console.log('▶ [1] The planner inserts percent rows before the first working set...');
const routine = {
  sets: [
    { type: 'warmup', targetReps: 15, targetWeight: 50 },
    { type: 'working', targetReps: 8, targetWeight: 100 },
    { type: 'working', targetReps: 8, targetWeight: 100 }
  ]
};
const planned = planWarmupInsert(routine, 100);
assert.ok(planned, 'a working set and a positive weight give a plan');
assert.strictEqual(planned.insertAt, 1, 'rows land after the existing warm-up, before the working set');
assert.deepStrictEqual(
  planned.rows.map((r) => [r.type, r.targetWeight, r.targetReps]),
  [['warm', 40, 5], ['warm', 60, 5], ['warm', 80, 3]]
);
assert.ok(planned.rows.every((r) => r._generatedWarmup === true), 'rows are marked to prevent duplicates');
assert.strictEqual(planWarmupInsert(routine, 0), null, 'no usable weight → no plan');
assert.strictEqual(planWarmupInsert({ sets: [] }, 100), null, 'no working set → no plan');
assert.strictEqual(isWarmSetType('warmup'), true);
assert.strictEqual(isWarmSetType('工作'), false);
console.log('  ✓ 40/60/80 rows, correct position, guarded against bad input\n');

console.log('▶ [2] The store action writes rows and reindexes existing draft state...');
const store = useWorkoutStore();
const day = '__qa_warmup_insert__';
const exId = 'qa_warmup_ex';
store.workoutData[day] = {
  title: 'QA',
  exercises: [{ id: exId, name: 'QA Lift', sets: routine.sets.map((s) => ({ ...s })) }]
};
store.userState[day] = {
  [exId]: {
    wt_0: '50', reps_0: '15',
    wt_1: '100', reps_1: '8', set_1: true, rir_1: 2, ts_1: '2026-11-23T12:00:00.000Z',
    updatedAt: '2026-11-23'
  }
};

const inserted = store.insertWarmupSets(day, exId);
assert.strictEqual(inserted, 3, 'three warm-up rows inserted');
const sets = store.workoutData[day].exercises[0].sets;
assert.strictEqual(sets.length, 6, 'the set table grew from 3 to 6 rows');
assert.deepStrictEqual(sets.slice(1, 4).map((s) => [s.type, s.targetWeight, s.targetReps]), [
  ['warm', 40, 5], ['warm', 60, 5], ['warm', 80, 3]
]);
assert.strictEqual(sets[4].type, 'working', 'the original working set moved down, type preserved');

const st = store.userState[day][exId];
assert.strictEqual(st.wt_0, '50', 'existing warm-up state at index 0 untouched');
assert.strictEqual(st.wt_1, '40', 'new row 1 is pre-filled with 40 kg');
assert.strictEqual(st.reps_1, '5', 'new row 1 is pre-filled with 5 reps');
assert.strictEqual(st.wt_3, '80', 'new row 3 is pre-filled with 80 kg');
assert.strictEqual(st.wt_4, '100', 'working weight shifted from index 1 to 4, not lost');
assert.strictEqual(st.reps_4, '8', 'working reps shifted with it');
assert.strictEqual(st.set_4, true, 'done flag preserved after reindex');
assert.strictEqual(st.rir_4, 2, 'RIR preserved after reindex');
assert.strictEqual(st.ts_4, '2026-11-23T12:00:00.000Z', 'rest timestamp preserved after reindex');
assert.strictEqual(st.updatedAt, '2026-11-23', 'unindexed metadata preserved');
console.log('  ✓ rows inserted, all draft values (weight/reps/done/RIR/time) preserved\n');

console.log('▶ [3] No duplicate inserts, and no weight means no rows...');
assert.strictEqual(store.insertWarmupSets(day, exId), 0, 'a second click adds nothing');
assert.strictEqual(store.workoutData[day].exercises[0].sets.length, 6, 'table length unchanged on the second click');
const day2 = '__qa_warmup_empty__';
store.workoutData[day2] = {
  exercises: [{ id: 'qa_empty', sets: [{ type: 'working', targetReps: 8, targetWeight: 100 }] }]
};
store.userState[day2] = { qa_empty: {} };
assert.strictEqual(store.insertWarmupSets(day2, 'qa_empty'), 0, 'no typed weight and no history → 0 rows');
assert.strictEqual(store.workoutData[day2].exercises[0].sets.length, 1, 'no rows added when weight is missing');
console.log('  ✓ idempotent; empty weight is a no-op\n');

console.log('▶ [4] UI contract exposes the one-click button...');
const card = read('src/components/ExerciseCard.vue');
assert.ok(card.includes('insertWarmupSets,'), 'ExerciseCard takes the store action');
assert.ok(card.includes('function onInsertWarmupSets()'), 'ExerciseCard has a click handler');
assert.ok(card.includes('@click="onInsertWarmupSets"'), 'the button is wired to the handler');
assert.ok(card.includes('min-h-[44px]'), 'the button meets the 44 px touch target');
const storeSrc = read('src/composables/useWorkoutStore.js');
assert.ok(storeSrc.includes('function insertWarmupSets('), 'the store implements the action');
assert.ok(storeSrc.includes('insertWarmupSets,'), 'the store exposes the action');
console.log('  ✓ button, handler and store action present\n');

console.log('✅ 1-click warm-up generator checks passed');
