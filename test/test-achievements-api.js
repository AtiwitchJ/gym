import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Always use a fresh private database: the chain runner shares one temp DB across
// steps, and this suite asserts a clean empty state on its first request.
process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-achievements-')), 'gym-test.db');
process.env.GYM_FORBID_REAL_DB = '1';

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

const set = (type, weight, reps, index = 0) => ({
  setIndex: index,
  type,
  target: '',
  weight,
  actualReps: reps,
  done: true,
  rir: 1
});
const makeSession = (id, date, exercises) => ({
  id,
  date,
  time: '18:00',
  dayKey: 'mon',
  dayTitle: 'Workout',
  totalSetsDone: exercises.reduce((n, ex) => n + ex.sets.length, 0),
  exercises
});

console.log('====================================================');
console.log('🧪 QA Test: Achievements & Milestones API');
console.log('====================================================\n');

assert.notStrictEqual(path.resolve(repo.getDbPath()), path.resolve('data/gym.db'), 'Tests must never open data/gym.db');

const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api/achievements`;

try {
  console.log('▶ [1] Empty database returns a safe, fully locked payload...');
  const empty = await (await fetch(base)).json();
  assert.strictEqual(empty.summary.total, 10);
  assert.strictEqual(empty.summary.unlockedCount, 0);
  assert.strictEqual(empty.badges.length, 10);
  assert.ok(empty.badges.every(b => b.unlocked === false));
  assert.ok(empty.badges.every(b => b.progress.current === 0 && b.progress.percent === 0));
  console.log('  ✓ 10 badges, all locked, zero progress.\n');

  console.log('▶ [2] First session unlocks first workout and records its date...');
  repo.saveSession(makeSession('ach_1', '2026-10-01', [
    { id: 'bench', canonicalId: 'bench', name: 'Bench', category: 'chest', sets: [
      set('warm', 200, 3, 0),
      set('work', 80, 10, 1)
    ] }
  ]));
  const afterOne = await (await fetch(base)).json();
  const first = afterOne.badges.find(b => b.id === 'first_workout');
  assert.strictEqual(first.unlocked, true);
  assert.strictEqual(first.unlockedAt, '2026-10-01');
  assert.strictEqual(afterOne.summary.totalSessions, 1);
  assert.strictEqual(afterOne.summary.totalSets, 2, 'warmup set still counts as a logged set');
  assert.strictEqual(afterOne.summary.totalVolume, 800, 'warmup weight must be excluded from volume');
  console.log('  ✓ Unlock date + warmup-excluded volume verified.\n');

  console.log('▶ [3] Progress is capped and percent stays within 0..100...');
  const capped = afterOne.badges.find(b => b.id === 'sets_100');
  assert.strictEqual(capped.progress.current, 2);
  assert.strictEqual(capped.progress.raw, 2);
  assert.ok(capped.progress.percent >= 0 && capped.progress.percent <= 100);
  for (const b of afterOne.badges) {
    assert.ok(b.progress.current <= b.target, `${b.id} current must not exceed target`);
    assert.ok(b.progress.percent >= 0 && b.progress.percent <= 100);
  }
  console.log('  ✓ Progress math verified.\n');

  console.log('▶ [4] Body-weight check-ins unlock their own badge...');
  for (let i = 1; i <= 10; i++) {
    repo.saveBodyWeight({ date: `2026-10-${String(i).padStart(2, '0')}`, weight: 72 + i / 10, note: '' });
  }
  const withWeights = await (await fetch(base)).json();
  const weigh = withWeights.badges.find(b => b.id === 'weighins_10');
  assert.strictEqual(weigh.unlocked, true);
  assert.strictEqual(withWeights.summary.weighIns, 10);
  console.log('  ✓ 10 check-ins unlock weighins_10.\n');

  console.log('▶ [5] No new tables; core schema untouched...');
  const tables = repo.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
  for (const t of ['workout_sessions', 'session_exercises', 'session_sets', 'exercise_rest', 'body_weights']) {
    assert.ok(tables.includes(t), `core table ${t} must exist`);
  }
  assert.ok(!tables.some(t => /achievement/i.test(t)), 'achievements must be derived, not stored in a new table');
  console.log('  ✓ Derived-only: no achievement table created.\n');
} finally {
  await new Promise(resolve => server.close(resolve));
}

console.log('🎉 ALL ACHIEVEMENTS API TESTS PASSED!');
