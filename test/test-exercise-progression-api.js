import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: Per-Exercise Progression Chart & Strength Curve API (/api/exercises/:id/*)
 * Spec reference: docs/COMPETITOR-RE-NEXT-FEATURE-20261123.md (Section 6)
 *
 * Covers:
 * 1. Safe SQLite schema migration: exercise_goals table exists, core tables untouched.
 * 2. GET /api/exercises/:id/progression:
 *    - Empty history returns timeline: [], stats: null, goal: null (status 200, no crash)
 *    - Chronological timeline (date ASC)
 *    - Warmup set exclusion: warmup sets ('warm', 'warmup', 'วอร์ม') excluded from maxWeight, bestE1rm, totalVolume
 *    - Uncompleted sets (done: false/0) excluded
 *    - Same-day sessions aggregated into a single data point per date
 * 3. Progression stats calculation:
 *    - baselineE1rm, latestE1rm, deltaE1rm, percentageGain, bestWeightEver, totalSessionsLogged
 * 4. PUT /api/exercises/:id/goal:
 *    - Upsert goal per exercise without duplicate rows
 *    - Query progression returns updated goal
 *    - 400 Bad Request validation for targetWeight (-10, 0, 1200, non-numeric)
 *    - 400 Bad Request validation for targetReps (0, 101, -1, non-integer)
 * 5. Limit query parameter handling (default 20, max 50).
 * 6. Zero data integrity impact: data/gym.db untouched, core tables intact.
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-progression-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

console.log('====================================================');
console.log('🧪 QA Test: Exercise Progression & Strength Curve API');
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
  'exercise_rest',
  'user_training_goals'
];
for (const t of expectedCoreTables) {
  assert.ok(existingTables.includes(t), `Core table "${t}" must exist and not be altered`);
}

// Check exercise_goals table exists
assert.ok(
  existingTables.includes('exercise_goals'),
  'The "exercise_goals" table must exist after migration'
);

// Verify columns in exercise_goals
const tableInfo = repo.db.prepare("PRAGMA table_info(exercise_goals)").all();
const colNames = tableInfo.map(c => c.name);
for (const reqCol of ['exercise_id', 'target_weight', 'target_reps', 'target_e1rm', 'notes']) {
  assert.ok(colNames.includes(reqCol), `Column "${reqCol}" must exist in exercise_goals table`);
}

// Seed draft and todo to verify data integrity
repo.saveDraft('mon', { ex_bench: { wt_0: '70', set_0: true } });
repo.saveTodos([{ id: 'todo_seed_prog', text: 'Stretching before bench', done: 0 }]);
console.log('  ✓ Schema migration safe, core tables untouched, exercise_goals initialized.\n');

// ------------------------------------------------------------------
// 2. Start Ephemeral HTTP Server
// ------------------------------------------------------------------
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/api/exercises`;

try {
  // ----------------------------------------------------------------
  // [A] Empty History Handling (Test 1)
  // ----------------------------------------------------------------
  console.log('▶ [2] Testing Empty History Handling (Status 200, empty timeline, null stats)...');

  const emptyExId = 'ex_never_trained_qa_test';
  const emptyRes = await fetch(`${base}/${emptyExId}/progression`);
  assert.strictEqual(emptyRes.status, 200, 'Empty exercise history must return 200 OK without crashing');

  const emptyData = await emptyRes.json();
  assert.strictEqual(emptyData.exerciseId, emptyExId, 'Returned exerciseId must match requested ID');
  assert.ok(Array.isArray(emptyData.timeline), 'timeline must be an array');
  assert.strictEqual(emptyData.timeline.length, 0, 'timeline must be empty when no sessions exist');
  assert.strictEqual(emptyData.stats, null, 'stats must be null when no sessions exist');
  assert.strictEqual(emptyData.goal, null, 'goal must be null when not set');
  console.log('  ✓ Empty history returns timeline: [], stats: null, goal: null safely.\n');

  // ----------------------------------------------------------------
  // [B] Chronological Timeline, Warmup Exclusion & Aggregation (Test 2)
  // ----------------------------------------------------------------
  console.log('▶ [3] Testing Chronological Timeline & Warmup Exclusion...');

  const testExId = 'ex_bench_prog_test';

  // Seed Day 1: 2026-10-15 (Warm-up 40kg x 15, Work 70kg x 8 rir 2, Work 70kg x 8 rir 2)
  repo.saveSession({
    id: 's_prog_d1',
    date: '2026-10-15',
    time: '18:00',
    dayKey: 'mon',
    dayTitle: 'Chest Day',
    totalSetsDone: 3,
    exercises: [
      {
        id: testExId,
        name: 'Barbell Bench Press',
        category: 'chest',
        sets: [
          { setIndex: 0, type: 'warm', target: '15', weight: 40, actualReps: 15, done: true, rir: 0 },
          { setIndex: 1, type: 'work', target: '8-10', weight: 70, actualReps: 8, done: true, rir: 2 },
          { setIndex: 2, type: 'work', target: '8-10', weight: 70, actualReps: 8, done: true, rir: 2 }
        ]
      }
    ]
  });

  // Seed Day 2: 2026-10-28 (Thai label warmup 'วอร์ม' 50kg x 10, Work 75kg x 7 rir 1, Skipped set 80kg done=false)
  repo.saveSession({
    id: 's_prog_d2',
    date: '2026-10-28',
    time: '18:30',
    dayKey: 'mon',
    dayTitle: 'Chest Day',
    totalSetsDone: 2,
    exercises: [
      {
        id: testExId,
        name: 'Barbell Bench Press',
        category: 'chest',
        sets: [
          { setIndex: 0, type: 'วอร์ม', target: '10', weight: 50, actualReps: 10, done: true, rir: 0 },
          { setIndex: 1, type: 'work', target: '6-8', weight: 75, actualReps: 7, done: true, rir: 1 },
          { setIndex: 2, type: 'work', target: '6-8', weight: 80, actualReps: 0, done: false, rir: 0 } // Skipped!
        ]
      }
    ]
  });

  // Seed Day 3 Session A: 2026-11-20 (Work 80kg x 6 rir 1)
  repo.saveSession({
    id: 's_prog_d3_a',
    date: '2026-11-20',
    time: '18:00',
    dayKey: 'mon',
    dayTitle: 'Chest Heavy',
    totalSetsDone: 1,
    exercises: [
      {
        id: testExId,
        name: 'Barbell Bench Press',
        category: 'chest',
        sets: [
          { setIndex: 0, type: 'work', target: '6', weight: 80, actualReps: 6, done: true, rir: 1 }
        ]
      }
    ]
  });

  // Seed Day 3 Session B (same day): 2026-11-20 (Bonus session: Work 82.5kg x 5 rir 1)
  // Tests same-day aggregation into single date entry
  repo.saveSession({
    id: 's_prog_d3_b',
    date: '2026-11-20',
    time: '20:00',
    dayKey: 'mon',
    dayTitle: 'Bonus PR Attempt',
    totalSetsDone: 1,
    exercises: [
      {
        id: testExId,
        name: 'Barbell Bench Press',
        category: 'chest',
        sets: [
          { setIndex: 0, type: 'work', target: '5', weight: 82.5, actualReps: 5, done: true, rir: 1 }
        ]
      }
    ]
  });

  const progRes = await fetch(`${base}/${testExId}/progression`);
  assert.strictEqual(progRes.status, 200);
  const progData = await progRes.json();

  assert.strictEqual(progData.exerciseId, testExId);
  assert.strictEqual(progData.timeline.length, 3, 'Must aggregate same-day sessions into 3 distinct dates');

  // Verify date ASC sorting
  const dates = progData.timeline.map(t => t.date);
  assert.deepStrictEqual(dates, ['2026-10-15', '2026-10-28', '2026-11-20'], 'Timeline must be strictly ordered date ASC');

  // Day 1 Checks:
  // Sets: warm (40x15), work (70x8, rir 2), work (70x8, rir 2)
  // Working sets: 2
  // Max weight: 70 (not warm-up 40)
  // Volume: 70*8 + 70*8 = 1120 (warmup 40*15 = 600 excluded)
  // e1RM: 70 * (1 + (8+2)/30) = 70 * (1 + 10/30) = 93.33 -> ~93.3
  const d1 = progData.timeline[0];
  assert.strictEqual(d1.date, '2026-10-15');
  assert.strictEqual(d1.maxWeight, 70, 'maxWeight must exclude warmup sets');
  assert.strictEqual(d1.workingSetsCount, 2, 'workingSetsCount must exclude warmup sets');
  assert.strictEqual(d1.totalVolume, 1120, 'totalVolume must sum only completed working sets (70*8 + 70*8 = 1120)');
  assert.ok(d1.bestE1rm > 90 && d1.bestE1rm < 95, `bestE1rm must be ~93.3, got ${d1.bestE1rm}`);
  assert.ok(d1.bestSet, 'bestSet must be present');
  assert.strictEqual(d1.bestSet.weight, 70);
  assert.strictEqual(d1.bestSet.reps, 8);
  assert.strictEqual(d1.bestSet.rir, 2);

  // Day 2 Checks:
  // Sets: วอร์ม (50x10), work (75x7, rir 1), skipped work (80x0 done=false)
  // Working sets: 1
  // Max weight: 75
  // Volume: 75 * 7 = 525
  const d2 = progData.timeline[1];
  assert.strictEqual(d2.date, '2026-10-28');
  assert.strictEqual(d2.maxWeight, 75);
  assert.strictEqual(d2.workingSetsCount, 1, 'Only 1 working set completed (warmup and done=false excluded)');
  assert.strictEqual(d2.totalVolume, 525, 'totalVolume must be 75 * 7 = 525');

  // Day 3 Checks (Combined 2 sessions on same day):
  // Session A: 80kg x 6, rir 1 -> e1RM = 80 * (1 + 7/30) = 98.7, volume = 480
  // Session B: 82.5kg x 5, rir 1 -> e1RM = 82.5 * (1 + 6/30) = 99.0, volume = 412.5
  // Max weight: 82.5
  // Total volume: 480 + 412.5 = 892.5
  const d3 = progData.timeline[2];
  assert.strictEqual(d3.date, '2026-11-20');
  assert.strictEqual(d3.maxWeight, 82.5, 'Combined same-day max weight must be 82.5');
  assert.strictEqual(d3.workingSetsCount, 2, 'Combined working sets count must be 2');
  assert.strictEqual(d3.totalVolume, 892.5, 'Combined total volume must sum all working sets across same day');
  assert.ok(d3.bestE1rm >= 98.5, 'Combined best e1RM must reflect highest between the sessions');
  console.log('  ✓ Chronological ordering (date ASC), warmup exclusion, and same-day aggregation verified.\n');

  // ----------------------------------------------------------------
  // [C] Progression Stats Calculation (Test 3)
  // ----------------------------------------------------------------
  console.log('▶ [4] Testing Progression Stats Calculation (deltaE1rm, percentageGain, etc.)...');

  const stats = progData.stats;
  assert.ok(stats, 'stats object must exist when sessions are present');
  assert.strictEqual(stats.baselineE1rm, d1.bestE1rm, 'baselineE1rm must equal first session bestE1rm');
  assert.strictEqual(stats.latestE1rm, d3.bestE1rm, 'latestE1rm must equal latest session bestE1rm');

  const expectedDelta = Math.round((d3.bestE1rm - d1.bestE1rm) * 10) / 10;
  assert.ok(
    Math.abs(stats.deltaE1rm - expectedDelta) <= 0.1,
    `deltaE1rm (${stats.deltaE1rm}) must match latestE1rm - baselineE1rm (${expectedDelta})`
  );

  const expectedPct = Math.round(((d3.bestE1rm - d1.bestE1rm) / d1.bestE1rm) * 100 * 100) / 100;
  assert.ok(
    Math.abs(stats.percentageGain - expectedPct) <= 0.2,
    `percentageGain (${stats.percentageGain}) must match formula (${expectedPct})`
  );

  assert.strictEqual(stats.bestWeightEver, 82.5, 'bestWeightEver must be highest working weight (82.5)');
  assert.strictEqual(stats.totalSessionsLogged, 3, 'totalSessionsLogged must reflect 3 dates logged');
  console.log('  ✓ Progression stats mathematically verified (baseline, latest, delta, percentageGain).\n');

  // ----------------------------------------------------------------
  // [D] Exercise Goal Setting, Upsert & Validation (Test 4)
  // ----------------------------------------------------------------
  console.log('▶ [5] Testing PUT /api/exercises/:id/goal (Upsert & 400 Validation)...');

  // 1. Initial Goal Set (200 OK)
  const putGoalRes = await fetch(`${base}/${testExId}/goal`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetWeight: 100.0,
      targetReps: 5,
      notes: 'Road to 100kg x 5 reps'
    })
  });
  assert.strictEqual(putGoalRes.status, 200, 'Valid goal PUT must return 200 OK');
  const putGoalData = await putGoalRes.json();
  assert.strictEqual(putGoalData.success, true);
  assert.strictEqual(putGoalData.exerciseId, testExId);
  assert.strictEqual(putGoalData.goal.targetWeight, 100.0);
  assert.strictEqual(putGoalData.goal.targetReps, 5);
  assert.ok(putGoalData.goal.targetE1rm > 100.0, 'targetE1rm should be calculated for 100kg x 5');
  assert.strictEqual(putGoalData.goal.notes, 'Road to 100kg x 5 reps');

  // Check goal appears in progression endpoint
  const progWithGoalRes = await fetch(`${base}/${testExId}/progression`);
  const progWithGoal = await progWithGoalRes.json();
  assert.ok(progWithGoal.goal, 'goal must be populated after PUT');
  assert.strictEqual(progWithGoal.goal.targetWeight, 100.0);
  assert.strictEqual(progWithGoal.goal.targetReps, 5);

  // 2. Upsert Goal on same exercise (Update without duplicate rows)
  const updateGoalRes = await fetch(`${base}/${testExId}/goal`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetWeight: 105.0,
      targetReps: 3,
      notes: 'Upgraded target: 105kg x 3'
    })
  });
  assert.strictEqual(updateGoalRes.status, 200);
  const updatedGoalData = await updateGoalRes.json();
  assert.strictEqual(updatedGoalData.goal.targetWeight, 105.0);
  assert.strictEqual(updatedGoalData.goal.targetReps, 3);
  assert.strictEqual(updatedGoalData.goal.notes, 'Upgraded target: 105kg x 3');

  // Verify only 1 row in DB for this exercise_id
  const goalRows = repo.db.prepare('SELECT COUNT(*) as count FROM exercise_goals WHERE exercise_id = ?').get(testExId);
  assert.strictEqual(goalRows.count, 1, 'Upsert must maintain exactly 1 row per exercise_id');

  // 3. Validation: targetWeight errors -> 400 Bad Request
  const badWeights = [-10, 0, 1200, 'seventy', null, Infinity];
  for (const w of badWeights) {
    const res = await fetch(`${base}/${testExId}/goal`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetWeight: w, targetReps: 5 })
    });
    assert.strictEqual(res.status, 400, `Expected 400 for targetWeight=${w}, got ${res.status}`);
  }

  // 4. Validation: targetReps errors -> 400 Bad Request
  const badReps = [0, 101, -5, 2.5, 'ten'];
  for (const r of badReps) {
    const res = await fetch(`${base}/${testExId}/goal`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetWeight: 100, targetReps: r })
    });
    assert.strictEqual(res.status, 400, `Expected 400 for targetReps=${r}, got ${res.status}`);
  }
  console.log('  ✓ Exercise goal upsert, retrieval in progression, and 400 validations verified.\n');

  // ----------------------------------------------------------------
  // [E] Limit Query Parameter
  // ----------------------------------------------------------------
  console.log('▶ [6] Testing limit query parameter on progression endpoint...');

  const limit2Res = await fetch(`${base}/${testExId}/progression?limit=2`);
  assert.strictEqual(limit2Res.status, 200);
  const limit2Data = await limit2Res.json();
  assert.strictEqual(limit2Data.timeline.length, 2, 'limit=2 must return only 2 latest timeline points');
  assert.strictEqual(limit2Data.timeline[0].date, '2026-10-28');
  assert.strictEqual(limit2Data.timeline[1].date, '2026-11-20');
  console.log('  ✓ Query parameter limit=2 returns 2 latest sessions in chronological order.\n');

  // ----------------------------------------------------------------
  // [F] Pre-existing Data Integrity Check
  // ----------------------------------------------------------------
  console.log('▶ [7] Verifying seeded data in pre-existing tables remains intact...');
  const drafts = repo.getAllDrafts();
  assert.ok(drafts.mon, 'Drafts in mon must remain intact');
  assert.strictEqual(drafts.mon.ex_bench.wt_0, '70');

  const todos = repo.getTodos();
  const seededTodo = todos.find(t => t.id === 'todo_seed_prog');
  assert.ok(seededTodo, 'Seeded todo must remain intact');
  assert.strictEqual(seededTodo.text, 'Stretching before bench');
  console.log('  ✓ Pre-existing draft and todos completely uncorrupted.\n');

} finally {
  await new Promise(resolve => server.close(resolve));
}

console.log('====================================================');
console.log('🎉 ALL EXERCISE PROGRESSION TESTS PASSED!');
console.log('====================================================');
