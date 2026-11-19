import assert from 'node:assert';
import { buildSessionExercises, recordValuesFromSets } from '../src/composables/sessionPayload.js';
import { normalizeRir } from '../src/composables/useRir.js';

/**
 * Finishing a workout must not store values for unfinished sets or write 0 kg records.
 */

console.log('====================================================');
console.log('🧪 Test: Session payload (unfinished sets never saved)');
console.log('====================================================\n');

const dayData = {
  exercises: [
    {
      id: 'lat_pulldown', name: 'Lat Pulldown', isMain: true,
      sets: [{ type: 'warm', reps: '15' }, { type: 'work', reps: '8-10' }]
    },
    {
      id: 'barbell_bench_press', name: 'Bench', isMain: true,
      sets: [{ type: 'warm', reps: '15' }, { type: 'work', reps: '8' }, { type: 'work', reps: '8' }]
    }
  ],
  bonusExercises: [
    { id: 'b_m_shoulder', name: 'Shoulder', sets: [{ type: 'work', reps: '8' }] }
  ]
};

// Lat Pulldown: targets pre-filled as reps, nothing ticked. Bench: two ticked sets, third set typed but not ticked.
const dayState = {
  lat_pulldown: { reps_0: '15', reps_1: '10' },
  barbell_bench_press: {
    wt_0: '35', reps_0: '15', set_0: true,
    wt_1: '70', reps_1: '8', set_1: true, rir_1: 2,
    wt_2: '100', reps_2: '8'
  },
  b_m_shoulder: {}
};

// 1. Exercises with no completed set are left out, and their values are not written
console.log('▶ [1] Unfinished exercises omitted...');
const lastWeightsBefore = { other: { wt_0: 20 } };
const lastSnapshot = JSON.stringify(lastWeightsBefore);
const out = buildSessionExercises(dayData, dayState, lastWeightsBefore);
assert.deepStrictEqual(out.sessionExercises.map((e) => e.id), ['barbell_bench_press']);
assert.strictEqual(out.totalSetsDone, 2);
assert.strictEqual(JSON.stringify(lastWeightsBefore), lastSnapshot, 'payload build must not mutate lastWeights');
console.log('✓ Lat Pulldown and the bonus exercise (no ticked set) are not in the session.');

// 2. Last-record writes come only from completed sets
console.log('▶ [2] Only completed sets write last-record values...');
assert.deepStrictEqual(out.lastRecords.map((r) => r.exId), ['barbell_bench_press', 'barbell_bench_press']);
assert.deepStrictEqual(out.lastRecords.map((r) => [r.sIdx, r.wt, r.reps]), [[0, '35', '15'], [1, '70', '8']]);
assert.ok(!out.lastRecords.some((r) => r.exId === 'lat_pulldown'), 'lat_pulldown must not write');
assert.ok(!out.lastRecords.some((r) => r.sIdx === 2), 'typed but unticked set 3 must not write');
console.log('✓ Records: bench set 1 (35×15) and set 2 (70×8) only.');

// 3. Unfinished sets are saved with no values
console.log('▶ [3] Unfinished sets saved empty...');
const bench = out.sessionExercises[0];
assert.strictEqual(bench.sets[0].done, true);
assert.strictEqual(bench.sets[0].weight, '35');
assert.strictEqual(bench.sets[2].done, false);
assert.strictEqual(bench.sets[2].weight, '', 'typed weight of an unticked set must not be saved');
assert.strictEqual(bench.sets[2].actualReps, '');
assert.strictEqual(bench.sets[2].rir, null);
assert.strictEqual(bench.sets[1].rir, normalizeRir(2));
console.log('✓ Unticked set 3 has weight "", reps "", rir null.');

// 4. No 0 kg anywhere in the payload
console.log('▶ [4] No 0 kg values in payload...');
const everyWeight = out.sessionExercises.flatMap((e) => e.sets.map((s) => s.weight));
assert.ok(!everyWeight.some((w) => w === 0 || w === '0'), 'payload must not contain 0 kg');
assert.ok(!out.lastRecords.some((r) => Number(r.wt) === 0), 'records must not contain 0 kg');
console.log('✓ No 0 kg in session sets or records.');

// 5. Completed set with reps but no weight is not a last-weight record
console.log('▶ [5] Completed set without weight writes no record...');
const repsOnly = buildSessionExercises(
  { exercises: [{ id: 'hanging_leg_raise', name: 'HLR', sets: [{ type: 'work', reps: '15' }] }] },
  { hanging_leg_raise: { reps_0: '12', set_0: true } },
  {}
);
assert.strictEqual(repsOnly.sessionExercises.length, 1);
assert.strictEqual(repsOnly.lastRecords.length, 1, 'reps-only completed set is a record candidate');
assert.strictEqual(repsOnly.lastRecords[0].wt, '', 'weight stays empty, store skips the weight write');
console.log('✓ Empty weight is passed through as "", so no 0 kg is written.');

// 6. recordValuesFromSets: last stats from history
console.log('▶ [6] recordValuesFromSets ignores unfinished sets...');
assert.deepStrictEqual(
  recordValuesFromSets([
    { done: true, weight: 60, actualReps: 8 },
    { done: false, weight: 70, actualReps: 8 },
    { done: true, weight: null, actualReps: 12 },
    { weight: 50, actualReps: 6 }
  ]),
  { wt_0: 60, reps_0: 8, reps_2: 12, wt_3: 50, reps_3: 6 }
);
assert.deepStrictEqual(recordValuesFromSets([{ done: false, weight: null, actualReps: 15 }]), {});
assert.deepStrictEqual(recordValuesFromSets(undefined), {});
console.log('✓ Skipped set gives nothing; undefined done counts as completed.');

console.log('\n====================================================');
console.log('🎉 SESSION PAYLOAD TESTS PASSED!');
console.log('====================================================');
