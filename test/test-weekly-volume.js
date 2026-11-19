import assert from 'node:assert';
import volume from '../server/volume.js';
import app from '../server/server.js';

/**
 * Weekly volume per muscle and per exercise (last 8 weeks, completed sets only).
 * volume = weight × actual reps. Weeks start on Monday (UTC date).
 */

const { WEEKS, weekStartOf, recentWeekStarts, buildWeeklyVolume } = volume;
const DAY = 24 * 60 * 60 * 1000;

console.log('====================================================');
console.log('🧪 Test: Weekly Volume (muscle & exercise, 8 weeks)');
console.log('====================================================\n');

// 1. Week boundaries (Monday start)
console.log('▶ [1] Monday week boundaries...');
assert.strictEqual(WEEKS, 8);
assert.strictEqual(weekStartOf('2026-11-16'), '2026-11-16'); // Monday
assert.strictEqual(weekStartOf('2026-11-22'), '2026-11-16'); // Sunday → same week
assert.strictEqual(weekStartOf('2026-11-15'), '2026-11-09'); // Sunday → previous Monday
assert.strictEqual(weekStartOf('2026-11-19'), '2026-11-16'); // Thursday
assert.strictEqual(weekStartOf('not-a-date'), null);
console.log('✓ Week starts on Monday.');

// 2. Window: 8 weeks, oldest first, ending with the current week
console.log('▶ [2] 8-week window...');
const NOW = Date.parse('2026-11-19T12:00:00.000Z'); // Thursday
const starts = recentWeekStarts(NOW);
assert.strictEqual(starts.length, 8);
assert.strictEqual(starts[7], '2026-11-16');
const firstExpected = new Date(Date.parse('2026-11-16T00:00:00.000Z') - 7 * 7 * DAY).toISOString().slice(0, 10);
assert.strictEqual(starts[0], firstExpected);
const empty = buildWeeklyVolume([], NOW);
assert.deepStrictEqual(empty.weeks.map((w) => w.weekStart), starts);
assert.ok(empty.weeks.every((w) => w.muscles.length === 0 && w.exercises.length === 0));
console.log(`✓ Window ${starts[0]} … ${starts[7]}, empty weeks included.`);

// 3. Volume math, done-only filter, muscle mapping, window cut-off
console.log('▶ [3] Volume aggregation...');
const testMap = { ex_bench: 'Chest', ex_row: 'Back' };
const rows = [
  { exerciseId: 'ex_bench', exerciseName: 'Bench', date: '2026-11-17', done: 1, weight: 60, actualReps: 10 }, // 600
  { exerciseId: 'ex_bench', exerciseName: 'Bench', date: '2026-11-17', done: 1, weight: 70, actualReps: 6 },  // 420
  { exerciseId: 'ex_bench', exerciseName: 'Bench', date: '2026-11-18', done: 0, weight: 999, actualReps: 9 }, // not completed
  { exerciseId: 'ex_row', exerciseName: 'Row', date: '2026-11-11', done: 1, weight: 50, actualReps: 8 },      // prev week: 400
  { exerciseId: 'unknown_ex', exerciseName: 'Mystery', date: '2026-11-18', done: 1, weight: 20, actualReps: 5 }, // 100, no muscle
  { exerciseId: 'ex_row', exerciseName: 'Row', date: '2026-09-27', done: 1, weight: 90, actualReps: 10 },      // before window
  { exerciseId: 'ex_row', exerciseName: 'Row', date: '2026-11-18', done: 1, weight: null, actualReps: 12 },    // no weight → volume 0, set counted
  null,
];
const out = buildWeeklyVolume(rows, NOW, { muscleById: testMap });
const thisWeek = out.weeks[7];
const prevWeek = out.weeks[6];

assert.deepStrictEqual(thisWeek.muscles, [
  { muscle: 'Chest', volume: 1020, sets: 2 },
  { muscle: 'Back', volume: 0, sets: 1 },
]);
assert.deepStrictEqual(thisWeek.exercises.map((e) => [e.exerciseId, e.volume, e.sets]), [
  ['ex_bench', 1020, 2],
  ['unknown_ex', 100, 1],
  ['ex_row', 0, 1],
]);
assert.strictEqual(thisWeek.exercises[0].exerciseName, 'Bench');
assert.deepStrictEqual(prevWeek.muscles, [{ muscle: 'Back', volume: 400, sets: 1 }]);
assert.strictEqual(out.weeks[0].muscles.length, 0, 'set before the window must be excluded');
console.log('✓ weight×reps summed; non-completed and out-of-window excluded; unmapped exercise kept only under exercises.');

// 4. Decimal weights round to 1 decimal
console.log('▶ [4] Decimal weights...');
const dec = buildWeeklyVolume(
  [{ exerciseId: 'ex_bench', exerciseName: 'Bench', date: '2026-11-17', done: 1, weight: 2.5, actualReps: 3 }],
  NOW,
  { muscleById: testMap }
);
assert.strictEqual(dec.weeks[7].exercises[0].volume, 7.5);
console.log('✓ 2.5 kg × 3 = 7.5.');

// 5. Route contract (real DB, read-only GET)
console.log('▶ [5] GET /api/volume/weekly contract...');
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
try {
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/volume/weekly`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.weeks));
  assert.strictEqual(body.weeks.length, 8);
  for (let i = 1; i < body.weeks.length; i++) {
    assert.ok(body.weeks[i].weekStart > body.weeks[i - 1].weekStart, 'weeks must be ascending');
  }
  for (const w of body.weeks) {
    assert.deepStrictEqual(Object.keys(w).sort(), ['exercises', 'muscles', 'weekStart']);
    for (const m of w.muscles) assert.deepStrictEqual(Object.keys(m).sort(), ['muscle', 'sets', 'volume']);
    for (const e of w.exercises) assert.deepStrictEqual(Object.keys(e).sort(), ['exerciseId', 'exerciseName', 'sets', 'volume']);
  }
  console.log(`✓ Route returned 8 weeks (${body.weeks[0].weekStart} … ${body.weeks[7].weekStart}) with the agreed shape.`);
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log('\n====================================================');
console.log('🎉 WEEKLY VOLUME TESTS PASSED!');
console.log('====================================================');
