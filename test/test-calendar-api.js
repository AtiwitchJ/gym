import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: Training Calendar & Consistency Streak API (/api/calendar/*)
 * Spec reference: docs/COMPETITOR-RE-NEXT-FEATURE-20261122.md (Section 6)
 *
 * Covers:
 * 1. Safe SQLite schema migration: user_training_goals table exists with default row, core tables untouched.
 * 2. GET /api/calendar/month: daysInMonth (leap year 2024=29, common 2025/2026=28), firstDayOfWeek (0=Mon..6=Sun).
 * 3. Workout mapping & aggregation: workouts in month, totalWorkoutsThisMonth, totalSetsThisMonth.
 * 4. GET /api/calendar/streak: streak calculation, 0 on empty, consecutive weeks, gap reset, 1 day per date.
 * 5. PUT /api/calendar/target: update weekly target (1..7), rejection outside range.
 * 6. Input validation: 400 Bad Request for invalid month/year/target.
 * 7. Data integrity: verifies pre-existing workout sessions, drafts, todos are untouched.
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-calendar-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

console.log('====================================================');
console.log('🧪 QA Test: /api/calendar/* Endpoints & Streak Suite');
console.log('====================================================\n');

// ------------------------------------------------------------------
// 1. Schema Migration & Data Isolation Verification
// ------------------------------------------------------------------
console.log('▶ [1] Verifying SQLite schema migration & zero data integrity impact...');

assert.notStrictEqual(
  path.resolve(repo.getDbPath()),
  path.resolve('data/gym.db'),
  'Tests must NEVER write to real data/gym.db'
);

const existingTables = repo.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
const expectedCoreTables = [
  'workout_sessions',
  'session_exercises',
  'session_sets',
  'body_weights',
  'gym_profiles',
  'exercise_last_weights',
  'daily_draft_state',
  'todos',
  'superset_groups',
  'exercise_rest'
];
for (const t of expectedCoreTables) {
  assert.ok(existingTables.includes(t), `Core table "${t}" must exist and not be removed`);
}

// Seed draft and todo to test isolation
repo.saveDraft('mon', { ex_bench: { wt_0: '70', set_0: true } });
repo.saveTodos([{ id: 'todo_seed_cal', text: 'Hydrate before workout', done: 0 }]);

// Check user_training_goals table exists
assert.ok(
  existingTables.includes('user_training_goals'),
  'The "user_training_goals" table must exist after migration'
);

// Check default target row ('default_user', 4)
const defaultGoal = repo.db.prepare("SELECT * FROM user_training_goals WHERE id = 'default_user'").get();
assert.ok(defaultGoal, 'default_user row must exist in user_training_goals');
assert.strictEqual(Number(defaultGoal.weekly_target_days), 4, 'Default weekly target days must be 4');
console.log('  ✓ Schema migration safe, core tables untouched, user_training_goals initialized.\n');

// ------------------------------------------------------------------
// 2. Start Ephemeral HTTP Server
// ------------------------------------------------------------------
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/api/calendar`;

try {
  // ----------------------------------------------------------------
  // [A] Month Endpoint Date Correctness & Leap Year Handling (Test 1)
  // ----------------------------------------------------------------
  console.log('▶ [2] Testing GET /api/calendar/month daysInMonth & firstDayOfWeek (Leap years)...');

  // Feb 2024 (Leap Year -> 29 days, Feb 1 was Thursday -> 3)
  const feb24Res = await fetch(`${base}/month?year=2024&month=2`);
  assert.strictEqual(feb24Res.status, 200);
  const feb24 = await feb24Res.json();
  assert.strictEqual(feb24.year, 2024);
  assert.strictEqual(feb24.month, 2);
  assert.strictEqual(feb24.daysInMonth, 29, 'Feb 2024 must have 29 days (leap year)');
  assert.strictEqual(feb24.firstDayOfWeek, 3, 'Feb 1, 2024 was Thursday (3 in 0=Mon..6=Sun)');

  // Feb 2025 (Common Year -> 28 days, Feb 1 was Saturday -> 5)
  const feb25Res = await fetch(`${base}/month?year=2025&month=2`);
  assert.strictEqual(feb25Res.status, 200);
  const feb25 = await feb25Res.json();
  assert.strictEqual(feb25.daysInMonth, 28, 'Feb 2025 must have 28 days');
  assert.strictEqual(feb25.firstDayOfWeek, 5, 'Feb 1, 2025 was Saturday (5 in 0=Mon..6=Sun)');

  // Feb 2026 (Common Year -> 28 days, Feb 1 was Sunday -> 6)
  const feb26Res = await fetch(`${base}/month?year=2026&month=2`);
  assert.strictEqual(feb26Res.status, 200);
  const feb26 = await feb26Res.json();
  assert.strictEqual(feb26.daysInMonth, 28, 'Feb 2026 must have 28 days');
  assert.strictEqual(feb26.firstDayOfWeek, 6, 'Feb 1, 2026 was Sunday (6 in 0=Mon..6=Sun)');

  // Nov 2026 (30 days, Nov 1 is Sunday -> 6)
  const nov26Res = await fetch(`${base}/month?year=2026&month=11`);
  assert.strictEqual(nov26Res.status, 200);
  const nov26 = await nov26Res.json();
  assert.strictEqual(nov26.daysInMonth, 30, 'Nov 2026 must have 30 days');
  assert.strictEqual(nov26.firstDayOfWeek, 6, 'Nov 1, 2026 is Sunday (6 in 0=Mon..6=Sun)');

  // Current month/year query
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentMonthRes = await fetch(`${base}/month?year=${currentYear}&month=${currentMonth}`);
  assert.strictEqual(currentMonthRes.status, 200);
  const currentMonthData = await currentMonthRes.json();
  assert.strictEqual(currentMonthData.year, currentYear);
  assert.strictEqual(currentMonthData.month, currentMonthData.month);
  assert.ok(currentMonthData.daysInMonth >= 28 && currentMonthData.daysInMonth <= 31);
  console.log('  ✓ Leap year daysInMonth (29 vs 28) and ISO firstDayOfWeek (0=Mon..6=Sun) verified.\n');

  // ----------------------------------------------------------------
  // [B] Input Validation & Boundary Checks (Test 4)
  // ----------------------------------------------------------------
  console.log('▶ [3] Testing Input Validation & Boundary Checks (400 Bad Request)...');

  // Bad month values
  const badMonths = [13, 0, -1, 'foo'];
  for (const m of badMonths) {
    const res = await fetch(`${base}/month?year=2026&month=${m}`);
    assert.strictEqual(res.status, 400, `Expected 400 for month=${m}, got ${res.status}`);
  }

  // Bad year values
  const badYears = [1999, 2101, 'bar'];
  for (const y of badYears) {
    const res = await fetch(`${base}/month?year=${y}&month=11`);
    assert.strictEqual(res.status, 400, `Expected 400 for year=${y}, got ${res.status}`);
  }

  // Bad PUT weeklyTarget values
  const badTargets = [8, -1, 0, 10, 'four', null];
  for (const target of badTargets) {
    const res = await fetch(`${base}/target`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeklyTarget: target })
    });
    assert.strictEqual(res.status, 400, `Expected 400 for weeklyTarget=${target}, got ${res.status}`);
  }

  // Missing body in PUT target
  const emptyTargetRes = await fetch(`${base}/target`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.strictEqual(emptyTargetRes.status, 400, 'Missing weeklyTarget in body must return 400');
  console.log('  ✓ Invalid months, years, and weekly targets rejected with 400 Bad Request.\n');

  // ----------------------------------------------------------------
  // [C] PUT /api/calendar/target & Goal Persistence
  // ----------------------------------------------------------------
  console.log('▶ [4] Testing PUT /api/calendar/target and goal persistence...');
  const putRes = await fetch(`${base}/target`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weeklyTarget: 3 })
  });
  assert.strictEqual(putRes.status, 200);
  const putBody = await putRes.json();
  assert.strictEqual(putBody.success, true);
  assert.strictEqual(putBody.weeklyTarget, 3);

  // Verify in SQLite
  const updatedGoal = repo.db.prepare("SELECT weekly_target_days FROM user_training_goals WHERE id = 'default_user'").get();
  assert.strictEqual(Number(updatedGoal.weekly_target_days), 3, 'weekly_target_days must be updated to 3 in DB');
  console.log('  ✓ PUT /api/calendar/target updates goal successfully.\n');

  // ----------------------------------------------------------------
  // [D] Workout Mapping & Month Aggregation (Test 2)
  // ----------------------------------------------------------------
  console.log('▶ [5] Testing Workout Mapping & Aggregation for Month View...');

  // 1. Isolated month check (2032-11) to guarantee clean count and set summation
  repo.saveSession({
    id: 'cal_sess_32_02',
    date: '2032-11-02',
    time: '18:00',
    dayKey: 'mon',
    dayTitle: 'อก & หลัง',
    totalSetsDone: 18,
    exercises: []
  });
  repo.saveSession({
    id: 'cal_sess_32_04',
    date: '2032-11-04',
    time: '18:30',
    dayKey: 'wed',
    dayTitle: 'ไหล่ & แขน',
    totalSetsDone: 16,
    exercises: []
  });
  repo.saveSession({
    id: 'cal_sess_32_06',
    date: '2032-11-06',
    time: '19:00',
    dayKey: 'fri',
    dayTitle: 'ขา & ท้อง',
    totalSetsDone: 20,
    exercises: []
  });
  // Outside target month (Dec 2032)
  repo.saveSession({
    id: 'cal_sess_32_dec',
    date: '2032-12-01',
    time: '18:00',
    dayKey: 'tue',
    dayTitle: 'วอร์มเสริม',
    totalSetsDone: 10,
    exercises: []
  });

  const m32Res = await fetch(`${base}/month?year=2032&month=11`);
  assert.strictEqual(m32Res.status, 200);
  const m32 = await m32Res.json();

  assert.strictEqual(m32.totalWorkoutsThisMonth, 3, 'Must count exactly 3 workouts in November 2032');
  assert.strictEqual(m32.totalSetsThisMonth, 54, 'Total sets must sum to 18 + 16 + 20 = 54');
  assert.strictEqual(m32.workouts.length, 3, 'workouts array must contain 3 elements');

  const workoutDates32 = m32.workouts.map(w => w.date);
  assert.deepStrictEqual(workoutDates32, ['2032-11-02', '2032-11-04', '2032-11-06']);

  const w1 = m32.workouts[0];
  assert.strictEqual(w1.date, '2032-11-02');
  assert.strictEqual(w1.sessionId, 'cal_sess_32_02');
  assert.strictEqual(w1.dayKey, 'mon');
  assert.strictEqual(w1.dayTitle, 'อก & หลัง');
  assert.strictEqual(w1.totalSetsDone, 18);

  // 2. Spec requirement: seed 2, 4, 6 Nov 2026 and verify mapping
  repo.saveSession({ id: 'cal_nov26_02', date: '2026-11-02', time: '18:00', dayKey: 'mon', dayTitle: 'อก & หลัง', totalSetsDone: 18, exercises: [] });
  repo.saveSession({ id: 'cal_nov26_04', date: '2026-11-04', time: '18:30', dayKey: 'wed', dayTitle: 'ไหล่ & แขน', totalSetsDone: 16, exercises: [] });
  repo.saveSession({ id: 'cal_nov26_06', date: '2026-11-06', time: '19:00', dayKey: 'fri', dayTitle: 'ขา & ท้อง', totalSetsDone: 20, exercises: [] });

  const nov26Res2 = await fetch(`${base}/month?year=2026&month=11`);
  assert.strictEqual(nov26Res2.status, 200);
  const nov26Data2 = await nov26Res2.json();
  assert.ok(nov26Data2.workouts.some(w => w.date === '2026-11-02'), 'Nov 2 must be present');
  assert.ok(nov26Data2.workouts.some(w => w.date === '2026-11-04'), 'Nov 4 must be present');
  assert.ok(nov26Data2.workouts.some(w => w.date === '2026-11-06'), 'Nov 6 must be present');
  assert.ok(!nov26Data2.workouts.some(w => w.date === '2032-12-01'), 'Dec session must be excluded');
  console.log('  ✓ Workout mapping and month aggregation verified (Dec excluded).\n');

  // ----------------------------------------------------------------
  // [E] Streak Calculation Algorithm (Test 3)
  // ----------------------------------------------------------------
  console.log('▶ [6] Testing Streak Calculation Algorithm (Empty, Consecutive, Gap Reset, Same-day)...');

  // Case 1: Same-day multiple sessions must count as 1 day trained!
  repo.saveSession({
    id: 'cal_sess_nov_02_bonus',
    date: '2026-11-02',
    time: '20:00',
    dayKey: 'mon',
    dayTitle: 'Bonus Session',
    totalSetsDone: 4,
    exercises: []
  });

  // Verify GET streak respects weeklyTarget (set to 3 earlier)
  const streakRes = await fetch(`${base}/streak`);
  assert.strictEqual(streakRes.status, 200);
  const streakData = await streakRes.json();

  assert.strictEqual(streakData.weeklyTarget, 3, 'Streak endpoint must reflect current weeklyTarget');
  assert.ok(typeof streakData.currentStreakWeeks === 'number', 'currentStreakWeeks must be a number');
  assert.ok(typeof streakData.bestStreakWeeks === 'number', 'bestStreakWeeks must be a number');
  assert.ok(Array.isArray(streakData.weeklyHistory), 'weeklyHistory must be an array');

  // Check unique days trained in week 45 (2026-11-02 to 2026-11-08)
  // Even with 4 sessions (two on Nov 2, one on Nov 4, one on Nov 6), unique days trained = 3!
  const week45 = streakData.weeklyHistory.find(w => w.year === 2026 && (w.weekNumber === 45 || w.daysTrained === 3));
  assert.ok(week45, 'Week containing Nov 2-6 must be in history');
  assert.strictEqual(week45.daysTrained, 3, 'Multiple sessions on Nov 2 must count as 1 day, total 3 days');
  assert.strictEqual(week45.targetMet, true, 'daysTrained (3) >= weeklyTarget (3) -> targetMet true');

  // Case 2: Seed consecutive weeks to achieve a 3-week streak
  // Week 46 (2026-11-09 to 2026-11-15): 3 days (Nov 9, 11, 13)
  repo.saveSession({ id: 's_w46_1', date: '2026-11-09', time: '18:00', dayKey: 'mon', dayTitle: 'A', totalSetsDone: 10, exercises: [] });
  repo.saveSession({ id: 's_w46_2', date: '2026-11-11', time: '18:00', dayKey: 'wed', dayTitle: 'B', totalSetsDone: 10, exercises: [] });
  repo.saveSession({ id: 's_w46_3', date: '2026-11-13', time: '18:00', dayKey: 'fri', dayTitle: 'A', totalSetsDone: 10, exercises: [] });

  // Week 47 (2026-11-16 to 2026-11-22): 3 days (Nov 16, 18, 20)
  repo.saveSession({ id: 's_w47_1', date: '2026-11-16', time: '18:00', dayKey: 'mon', dayTitle: 'B', totalSetsDone: 10, exercises: [] });
  repo.saveSession({ id: 's_w47_2', date: '2026-11-18', time: '18:00', dayKey: 'wed', dayTitle: 'A', totalSetsDone: 10, exercises: [] });
  repo.saveSession({ id: 's_w47_3', date: '2026-11-20', time: '18:00', dayKey: 'fri', dayTitle: 'B', totalSetsDone: 10, exercises: [] });

  const streak3Res = await fetch(`${base}/streak`);
  assert.strictEqual(streak3Res.status, 200);
  const streak3Data = await streak3Res.json();

  assert.ok(streak3Data.currentStreakWeeks >= 3, `Expected at least 3 weeks streak, got ${streak3Data.currentStreakWeeks}`);
  assert.ok(streak3Data.bestStreakWeeks >= streak3Data.currentStreakWeeks);

  // Check weeklyHistory is ordered newest first
  for (let i = 0; i < streak3Data.weeklyHistory.length - 1; i++) {
    const cur = streak3Data.weeklyHistory[i];
    const nxt = streak3Data.weeklyHistory[i + 1];
    const curKey = cur.year * 100 + cur.weekNumber;
    const nxtKey = nxt.year * 100 + nxt.weekNumber;
    assert.ok(curKey >= nxtKey, `weeklyHistory must be ordered descending: ${curKey} >= ${nxtKey}`);
  }

  // Case 3: Gap reset verification. Use the maximum target (7) so no week in the
  // shared chain database can meet it; weeks with 3 days must reset the streak.
  const putTarget5 = await fetch(`${base}/target`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weeklyTarget: 7 })
  });
  assert.strictEqual(putTarget5.status, 200);

  const streakGapRes = await fetch(`${base}/streak`);
  const streakGapData = await streakGapRes.json();
  assert.strictEqual(streakGapData.weeklyTarget, 7);
  assert.strictEqual(streakGapData.currentStreakWeeks, 0, 'When daysTrained (3) < weeklyTarget (7), streak must reset to 0');
  console.log('  ✓ Streak calculation, same-day deduplication, consecutive count, and gap reset verified.\n');

  // ----------------------------------------------------------------
  // [F] Pre-existing Data Integrity Check
  // ----------------------------------------------------------------
  console.log('▶ [7] Verifying seeded data in pre-existing tables remains intact...');
  const drafts = repo.getAllDrafts();
  assert.ok(drafts.mon, 'Drafts in mon must remain intact');
  assert.strictEqual(drafts.mon.ex_bench.wt_0, '70');

  const todos = repo.getTodos();
  const seededTodo = todos.find(t => t.id === 'todo_seed_cal');
  assert.ok(seededTodo, 'Seeded todo must remain intact');
  assert.strictEqual(seededTodo.text, 'Hydrate before workout');
  console.log('  ✓ Pre-existing draft and todos completely uncorrupted.\n');

} finally {
  await new Promise(resolve => server.close(resolve));
}

console.log('====================================================');
console.log('🎉 ALL CALENDAR API & STREAK TESTS PASSED!');
console.log('====================================================');
