import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-pr-records-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

const EX = 'bench_test';
const makeSession = (id, date, sets) => ({
  id,
  date,
  time: '18:00',
  dayKey: 'tue',
  dayTitle: 'Chest',
  totalSetsDone: sets.length,
  exercises: [{ id: EX, name: 'Bench', category: 'chest', sets }]
});
const set = (type, weight, reps, rir = 0) => ({ setIndex: 0, type, target: '', weight, actualReps: reps, done: true, rir });

console.log('====================================================');
console.log('🧪 QA Test: PR Records Timeline & Set Records API');
console.log('====================================================\n');

assert.notStrictEqual(path.resolve(repo.getDbPath()), path.resolve('data/gym.db'), 'Tests must never open data/gym.db');

const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api/exercises/${EX}/records`;

try {
  console.log('▶ [1] Empty history returns safe empty payload...');
  const empty = await (await fetch(base)).json();
  assert.deepStrictEqual(empty.records, {});
  assert.deepStrictEqual(empty.setRecords, []);
  assert.deepStrictEqual(empty.timeline, []);
  console.log('  ✓ Empty payload verified.\n');

  console.log('▶ [2] Stats consider completed working sets only...');
  repo.saveSession(makeSession('pr1', '2026-10-15', [set('warm', 200, 3), set('work', 80, 8, 2)]));
  repo.saveSession(makeSession('pr2', '2026-11-01', [set('work', 90, 6, 1)]));
  repo.saveSession(makeSession('pr3', '2026-11-20', [set('work', 100, 5, 1)]));
  const data = await (await fetch(base)).json();
  assert.strictEqual(data.records.heaviestWeight.value, 100);
  assert.strictEqual(data.records.mostReps.value, 8);
  assert.ok(data.records.bestE1rm.value > 100);
  assert.strictEqual(data.records.bestSetVolume.value, 640);
  console.log('  ✓ Warmup excluded; heaviest/reps/e1RM/volume verified.\n');

  console.log('▶ [3] Set records sorted by reps ASC with max weight...');
  assert.deepStrictEqual(data.setRecords.map(r => r.reps), [5, 6, 8]);
  assert.strictEqual(data.setRecords.find(r => r.reps === 5).weight, 100);
  console.log('  ✓ Set records verified.\n');

  console.log('▶ [4] Timeline newest first with previousValue...');
  assert.ok(data.timeline.length >= 2);
  for (let i = 1; i < data.timeline.length; i++) {
    assert.ok(data.timeline[i - 1].date >= data.timeline[i].date);
  }
  assert.strictEqual(data.timeline[data.timeline.length - 1].previousValue, null);
  console.log('  ✓ Timeline verified.\n');

  console.log('▶ [5] Core schema unchanged...');
  const tables = repo.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  for (const t of ['workout_sessions', 'session_exercises', 'session_sets', 'exercise_rest', 'exercise_setup_notes']) {
    assert.ok(tables.includes(t), `core table ${t} must exist`);
  }
  console.log('  ✓ Core schema intact.\n');
} finally {
  await new Promise(resolve => server.close(resolve));
}

console.log('🎉 ALL PR RECORDS API TESTS PASSED!');
