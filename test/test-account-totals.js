import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { accountTotals, totalWorkingVolume } from '../src/composables/workingVolume.js';

/**
 * Account page totals must count the same saved sessions the history page shows.
 * Drafts and legacy summary lists are not part of the count. Volume uses the weekly chart rule.
 */

console.log('====================================================');
console.log('🧪 Test: Account totals = saved sessions (count and volume)');
console.log('====================================================\n');

const session = (id, date, sets) => ({ id, date, time: '18:00', exercises: [{ id: 'ex', name: 'Ex', sets }] });
const S = (type, weight, reps, done = true) => ({ type, weight, actualReps: reps, done });

const saved = [
  session('s1', '2026-11-10', [S('วอร์ม', 35, 15), S('เล่นจริง', 70, 8)]),
  session('s2', '2026-11-12', [S('เล่นจริง', 70, 8), S('เล่นจริง', 70, 8, false)]), // skipped set
  session('s3', '2026-11-14', [S('วอร์ม', 90, 25)]),                              // warm-up only
  session('s4', '2026-11-17', [S('เล่นจริง', 52.5, 8)]),
  session('s5', '2026-11-18', [S('ซ้อมเสริม', 20, 10)])
];

// 1. Count equals the number of saved sessions
console.log('▶ [1] Count equals saved sessions...');
const totals = accountTotals(saved);
assert.strictEqual(totals.workouts, saved.length, 'workout count must equal saved session count');
console.log(`✓ ${totals.workouts} saved sessions -> ${totals.workouts} workouts.`);

// 2. Volume equals the chart rule over the same sessions (warm-ups and skipped sets excluded)
console.log('▶ [2] Volume uses the chart rule...');
assert.strictEqual(totals.volumeKg, 70 * 8 + 70 * 8 + 52.5 * 8 + 20 * 10); // 560 + 560 + 420 + 200 = 1740
assert.strictEqual(totals.volumeKg, totalWorkingVolume(saved));
assert.strictEqual(accountTotals([]).volumeKg, 0);
assert.strictEqual(accountTotals([]).workouts, 0);
assert.strictEqual(accountTotals(undefined).workouts, 0);
console.log('✓ 1740 kg; warm-ups and skipped sets excluded; empty list gives 0 and 0.');

// 3. Draft and legacy summary lists are not counted: only the list passed in is used
console.log('▶ [3] Drafts and legacy summaries are not counted...');
const legacySummaries = [{ totalVolumeKg: 999 }, { totalVolumeKg: 999 }];
const draft = session('draft', '2026-11-19', [S('เล่นจริง', 100, 5)]);
assert.strictEqual(accountTotals([...saved, draft]).workouts, saved.length + 1, 'only what the caller passes as saved is counted');
assert.strictEqual(accountTotals(legacySummaries).volumeKg, 0, 'legacy totalVolumeKg is not used');
console.log('✓ Account counts only the saved-session list; legacy totalVolumeKg is ignored.');

// 4. Route check: the count equals GET /api/history on a temp database
console.log('▶ [4] Count equals GET /api/history...');
if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-totals-')), 'gym-test.db');
}
const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

const seedIds = ['test_totals_1', 'test_totals_2', 'test_totals_3'];
seedIds.forEach((id, i) => {
  repo.saveSession({
    id,
    date: `2026-11-1${i + 1}`,
    time: '18:00',
    dayKey: 'mon',
    dayTitle: 'test',
    totalSetsDone: 1,
    exercises: [{
      id: 'test_totals_bench', name: 'Bench', category: 'ท่าหลัก',
      sets: [
        { setIndex: 1, type: 'วอร์ม', target: '15 ครั้ง', weight: 35, actualReps: 15, done: true, rir: null },
        { setIndex: 2, type: 'เล่นจริง', target: '6–8 ครั้ง', weight: 70, actualReps: 8, done: true, rir: 2 }
      ]
    }]
  });
});

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
try {
  const { port } = server.address();
  const history = await (await fetch(`http://127.0.0.1:${port}/api/history`)).json();
  const mine = history.filter((s) => seedIds.includes(s.id));
  assert.strictEqual(mine.length, 3, 'seeded sessions must be in history');
  const fromHistory = accountTotals(history);
  assert.strictEqual(fromHistory.workouts, history.length, 'count equals every saved session in history');
  assert.strictEqual(fromHistory.volumeKg, totalWorkingVolume(history));
  assert.ok(fromHistory.volumeKg >= 3 * 560, 'three seeded sessions contribute 560 kg each (warm-up excluded)');
  console.log(`✓ History has ${history.length} saved sessions; account count = ${fromHistory.workouts}.`);
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log('\n====================================================');
console.log('🎉 ACCOUNT TOTALS TESTS PASSED!');
console.log('====================================================');
