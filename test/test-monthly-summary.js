import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Monthly summary: saved sessions in a month, completed working sets, volume (warm-ups excluded), best PR per exercise.
 * Uses a seeded temp database. Month 2031-07 is used so no other test step can add rows to it.
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-monthly-')), 'gym-test.db');
}
const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');
const { validateMonth, buildMonthlySummary, ValidationError } = await import('../server/monthly.js');

console.log('====================================================');
console.log('🧪 Test: Monthly summary (GET /api/summary/monthly)');
console.log('====================================================\n');

const MONTH = '2031-07';
const BENCH = 'test_monthly_bench';
const LAT = 'test_monthly_lat';
const set = (setIndex, type, weight, actualReps, done, rir = null) =>
  ({ setIndex, type, target: '6–8 ครั้ง', weight, actualReps, done, rir });
const save = (id, date, exercises) => repo.saveSession({ id, date, time: '18:00', dayKey: 'mon', dayTitle: 't', totalSetsDone: 1, exercises });

// 1. Validation (pure)
console.log('▶ [1] Month validation...');
assert.strictEqual(validateMonth('2026-11'), '2026-11');
for (const bad of ['2031-13', '2031-00', '2031-1', '2031-7', '2031-07-01', 'abc', '', undefined, null, 202607]) {
  assert.throws(() => validateMonth(bad), ValidationError, `expected 400 for ${JSON.stringify(bad)}`);
}
console.log('✓ YYYY-MM accepted; bad month, month-only-1-digit, full date, and missing rejected with 400.');

// Seed: two sessions in July, one in August, one in June. Only July counts.
save('test_monthly_1', '2031-07-03', [
  { id: BENCH, name: 'Bench', category: 'ท่าหลัก', sets: [
    set(1, 'วอร์ม', 35, 15, true),              // warm-up: excluded everywhere
    set(2, 'เล่นจริง', 70, 8, true, 2),
    set(3, 'เล่นจริง', 100, 3, false)            // skipped: excluded everywhere
  ] }
]);
save('test_monthly_2', '2031-07-31', [
  { id: BENCH, name: 'Bench', category: 'ท่าหลัก', sets: [set(1, 'เล่นจริง', 72.5, 6, true, 1)] },
  { id: LAT, name: 'Lat Pulldown', category: 'ท่าหลัก', sets: [set(1, 'เล่นจริง', 50, 10, true)] }
]);
save('test_monthly_aug', '2031-08-01', [
  { id: BENCH, name: 'Bench', category: 'ท่าหลัก', sets: [set(1, 'เล่นจริง', 200, 1, true)] }
]);
save('test_monthly_jun', '2031-06-30', [
  { id: BENCH, name: 'Bench', category: 'ท่าหลัก', sets: [set(1, 'เล่นจริง', 180, 1, true)] }
]);

// 2. Pure aggregation on the same history (repo.getHistory shape)
console.log('▶ [2] Aggregation rules...');
const history = repo.getHistory();
const summary = buildMonthlySummary(history, MONTH);
assert.strictEqual(summary.month, MONTH);
assert.strictEqual(summary.sessions, 2, 'two saved sessions in July');
assert.strictEqual(summary.completedWorkingSets, 3, '70×8, 72.5×6, 50×10 (warm-up and skipped excluded)');
assert.strictEqual(summary.volumeKg, 560 + 435 + 500, 'volume 1495 kg, warm-up excluded');
console.log('✓ 2 sessions, 3 completed working sets, 1495 kg.');

// 3. PR per exercise: same logic as the exercise PR (warm-ups and skipped sets excluded)
console.log('▶ [3] Best PR per exercise in the month...');
const bench = summary.prs.find((p) => p.exerciseId === BENCH);
const lat = summary.prs.find((p) => p.exerciseId === LAT);
assert.ok(bench && lat, 'both exercises present');
assert.strictEqual(bench.bestWeight, 72.5, 'skipped 100 kg and July-excluded 200 kg ignored');
assert.strictEqual(bench.bestReps, 8, 'warm-up 15 reps ignored');
assert.strictEqual(bench.estimated1RM, 93.3, '70 × 8 at RIR 2 is the best e1RM');
assert.strictEqual(lat.bestWeight, 50);
assert.strictEqual(lat.estimated1RM, 66.7);
assert.strictEqual(summary.prs[0].exerciseId, BENCH, 'highest e1RM first');
assert.ok(!summary.prs.some((p) => p.bestWeight === 180 || p.bestWeight === 200), 'June and August sessions excluded');
console.log('✓ Bench best 72.5 kg, 8 reps, e1RM 93.3; Lat 50 kg, e1RM 66.7; June/August excluded.');

// 4. Empty month
console.log('▶ [4] Empty month...');
assert.deepStrictEqual(buildMonthlySummary(history, '2031-09'), { month: '2031-09', sessions: 0, completedWorkingSets: 0, volumeKg: 0, prs: [] });
console.log('✓ Month with no saved sessions gives zeros and an empty prs list.');

// 5. Route contract
console.log('▶ [5] GET /api/summary/monthly...');
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
try {
  const base = `http://127.0.0.1:${server.address().port}/api/summary/monthly`;
  const ok = await fetch(`${base}?month=${MONTH}`);
  assert.strictEqual(ok.status, 200);
  const body = await ok.json();
  assert.deepStrictEqual(Object.keys(body).sort(), ['completedWorkingSets', 'month', 'prs', 'sessions', 'volumeKg']);
  assert.deepStrictEqual(body.prs.map((p) => Object.keys(p).sort()), [
    ['bestReps', 'bestWeight', 'estimated1RM', 'exerciseId', 'exerciseName'],
    ['bestReps', 'bestWeight', 'estimated1RM', 'exerciseId', 'exerciseName']
  ]);
  assert.strictEqual(body.sessions, 2);
  assert.strictEqual(body.volumeKg, 1495);

  for (const q of ['', '?month=2031-13', '?month=2031-7', '?month=2031-07-01', '?month=abc']) {
    const res = await fetch(`${base}${q}`);
    assert.strictEqual(res.status, 400, `expected 400 for "${q}"`);
    assert.match((await res.json()).error, /YYYY-MM/);
  }
  console.log('✓ 200 with the agreed keys; missing, malformed, and out-of-range months return 400.');
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log('\n====================================================');
console.log('🎉 MONTHLY SUMMARY TESTS PASSED!');
console.log('====================================================');
