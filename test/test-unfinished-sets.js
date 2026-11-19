import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Uses unique exercise ids so other test steps sharing the temp DB cannot affect the result.
 * Unfinished or skipped sets must not write values or 0 kg last-weight records.
 * Uses its own temp database (set before server/db.js loads), so it never touches data/gym.db.
 */

if (!process.env.GYM_DB_PATH) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-unfinished-'));
  process.env.GYM_DB_PATH = path.join(dir, 'gym-test.db');
}
const { default: repo } = await import('../server/db.js');

console.log('====================================================');
console.log('🧪 Test: Unfinished sets never write 0 kg records');
console.log('====================================================\n');

const session = {
  id: 'test_unfinished_sets_1',
  date: '2026-11-18',
  time: '18:00',
  dayKey: 'thu',
  dayTitle: 'test',
  totalSetsDone: 2,
  exercises: [
    {
      // Never done: targets typed or pre-filled as reps only
      id: 'test_unf_lat_pulldown', name: 'Lat Pulldown', category: 'ท่าหลัก',
      sets: [
        { setIndex: 1, type: 'วอร์ม', target: '15', weight: '', actualReps: '15', done: false, rir: null },
        { setIndex: 2, type: 'เล่นจริง', target: '8-10', weight: '', actualReps: '10', done: false, rir: null }
      ]
    },
    {
      // Completed set with weight and RIR
      id: 'test_unf_bench', name: 'Bench', category: 'ท่าหลัก',
      sets: [
        { setIndex: 1, type: 'เล่นจริง', target: '8', weight: '60', actualReps: '8', done: true, rir: 2 },
        // Typed weight but not ticked
        { setIndex: 2, type: 'เล่นจริง', target: '8', weight: '100', actualReps: '8', done: false, rir: null }
      ]
    },
    {
      // Completed set with reps but no weight: must not become 0 kg
      id: 'test_unf_hanging_leg_raise', name: 'Hanging Leg Raise', category: 'ท่าเสริม',
      sets: [
        { setIndex: 1, type: 'เล่นจริง', target: '15', weight: '', actualReps: '12', done: true, rir: null }
      ]
    }
  ]
};

// 1. Save
console.log('▶ [1] Save session with unfinished and reps-only sets...');
repo.saveSession(session);
console.log('✓ Session saved.');

// 2. Last weights: no 0 kg, no unfinished-set records
console.log('▶ [2] Last-weight records...');
const lw = repo.getLastWeights();
assert.strictEqual(lw.test_unf_lat_pulldown, undefined, 'unfinished exercise must not create a last-weight record');
assert.strictEqual(lw.test_unf_hanging_leg_raise, undefined, 'reps-only completed set must not create a 0 kg record');
assert.strictEqual(lw.test_unf_bench.wt_0, 60, 'completed set saves its weight');
assert.strictEqual(lw.test_unf_bench.wt_1, undefined, 'typed but unticked set must not save');
const allWeights = Object.values(lw).flatMap((o) => Object.keys(o).filter((k) => k.startsWith('wt_')).map((k) => o[k]));
assert.ok(!allWeights.some((w) => Number(w) === 0), 'no 0 kg anywhere in last weights');
console.log('✓ No record for Lat Pulldown or Hanging Leg Raise; bench saves 60 kg; no 0 kg.');

// 3. History rows of unfinished sets carry no values
console.log('▶ [3] History rows of unfinished sets...');
const lat = repo.getExerciseHistory('test_unf_lat_pulldown');
assert.strictEqual(lat.length, 1);
for (const set of lat[0].sets) {
  assert.strictEqual(set.done, false);
  assert.strictEqual(set.weight, null, 'unfinished set stores no weight');
  assert.strictEqual(set.actualReps, null, 'unfinished set stores no reps');
  assert.strictEqual(set.rir, null);
}
const bench = repo.getExerciseHistory('test_unf_bench')[0];
assert.strictEqual(bench.sets[1].weight, null, 'typed but unticked set stores no weight');
assert.strictEqual(bench.sets[0].weight, 60);
assert.strictEqual(bench.sets[0].rir, 2);
console.log('✓ Lat Pulldown sets are empty; typed bench set 2 is empty; bench set 1 is 60 kg, RIR 2.');

// 4. Reps-only completed set: history keeps the rep count, no weight record
console.log('▶ [4] Reps-only completed set...');
const hlr = repo.getExerciseHistory('test_unf_hanging_leg_raise')[0];
assert.strictEqual(hlr.sets[0].done, true);
assert.strictEqual(hlr.sets[0].weight, null);
console.log('✓ Completed reps-only set is stored with weight null.');

console.log('\n====================================================');
console.log('🎉 UNFINISHED SET TESTS PASSED!');
console.log('====================================================');
