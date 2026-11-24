import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Integration Test: Repeat Workout Flow (Database -> History API -> cloneSessionToActive)
 * Strictly isolated with temporary SQLite database; forbids real DB access.
 */
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-repeat-integration-'));
const testDbPath = path.join(tmpDir, 'gym-repeat-test.db');
process.env.GYM_DB_PATH = testDbPath;
process.env.GYM_FORBID_REAL_DB = '1';

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');
const { cloneSessionToActive } = await import('../src/composables/useActiveSessionStore.js');

console.log('====================================================');
console.log('🧪 Integration Test: Repeat Workout Flow');
console.log('====================================================\n');

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

try {
  // 1. Seed historical session into isolated temporary database
  console.log('▶ [1] Seeding session into isolated database...');
  const historicalSessionId = 'test-session-bench-replay';
  const seededSession = {
    id: historicalSessionId,
    date: '2026-11-20',
    time: '18:30',
    dayKey: 'prog_a',
    dayTitle: 'Program A (Push + Quads)',
    totalSetsDone: 1,
    durationSec: 3600,
    sessionRpe: 8.5,
    sessionLoadAu: 510,
    pumpRating: 'good',
    jointComfort: 'good',
    exercises: [
      {
        id: 'barbell_bench_press',
        name: 'Barbell Bench Press',
        category: 'chest',
        sets: [
          {
            setIndex: 1,
            type: 'normal',
            target: '6-8',
            weight: 80.0,
            actualReps: 7,
            done: true,
            rir: 1,
            rirPlus: false
          }
        ]
      }
    ]
  };

  repo.saveSession(seededSession);
  console.log('  ✓ Session recorded via repo.saveSession.');

  // 2. Fetch via GET /api/history
  console.log('▶ [2] Fetching via GET /api/history...');
  const res = await fetch(`${base}/api/history`);
  assert.strictEqual(res.status, 200, 'GET /api/history returns 200');
  const historyList = await res.json();
  assert.ok(Array.isArray(historyList), 'Response is array');
  assert.strictEqual(historyList.length, 1, 'History has exactly 1 session');

  const historySession = historyList[0];
  assert.strictEqual(historySession.id, historicalSessionId, 'History session id matches');
  assert.strictEqual(historySession.dayKey, 'prog_a');
  assert.strictEqual(historySession.dayTitle, 'Program A (Push + Quads)');
  assert.strictEqual(historySession.exercises.length, 1);

  // Schema check on API response
  const historyEx = historySession.exercises[0];
  assert.strictEqual(historyEx.id, 'barbell_bench_press', 'Exercise id matches');
  assert.strictEqual(historyEx.name, 'Barbell Bench Press', 'Exercise name matches');
  assert.strictEqual(historyEx.category, 'chest', 'Exercise category matches');
  assert.strictEqual(historyEx.canonicalId, 'chest_press', 'Canonical id resolved');
  assert.strictEqual(historyEx.sets.length, 1);

  const historySet = historyEx.sets[0];
  assert.strictEqual(historySet.setIndex, 1);
  assert.strictEqual(historySet.type, 'normal');
  assert.strictEqual(historySet.target, '6-8', 'Historical set target preserved');
  assert.strictEqual(historySet.weight, 80.0, 'Historical set weight is 80.0');
  assert.strictEqual(historySet.actualReps, 7, 'Historical actual reps is 7');
  assert.strictEqual(historySet.done, true);
  assert.strictEqual(historySet.rir, 1);
  assert.strictEqual(historySet.rirPlus, false);
  console.log('  ✓ GET /api/history response verified.');

  // 3. Feed the real API response into cloneSessionToActive
  console.log('▶ [3] Feeding API response into cloneSessionToActive...');
  const cloned = cloneSessionToActive(historySession);

  // 4. Verify cloned active session contracts
  console.log('▶ [4] Verifying cloned session properties...');
  assert.ok(cloned.id.startsWith('session_'), 'Cloned id starts with session_');
  assert.notStrictEqual(cloned.id, historicalSessionId, 'Cloned id is fresh, not historical');
  assert.strictEqual(cloned.routineId, 'prog_a', 'routineId matches dayKey');
  assert.strictEqual(cloned.title, 'Program A (Push + Quads)');
  assert.strictEqual(cloned.subtitle, 'เล่นซ้ำจากรอบวันที่ 2026-11-20');
  assert.ok(typeof cloned.startTime === 'number', 'startTime is timestamp');
  assert.ok(typeof cloned.startedAt === 'string', 'startedAt is ISO string');

  // Verify exercise mapping
  assert.strictEqual(cloned.exercises.length, 1, 'Cloned exercises length is 1');
  const clonedEx = cloned.exercises[0];
  assert.strictEqual(clonedEx.exerciseId, 'barbell_bench_press', 'exerciseId correctly mapped');
  assert.strictEqual(clonedEx.name, 'Barbell Bench Press', 'Exercise name preserved');
  assert.strictEqual(clonedEx.muscleGroup, 'chest', 'Muscle group mapped');
  assert.strictEqual(clonedEx.sets.length, 1, 'Cloned sets length is 1');

  // Verify set mapping and reset states
  const clonedSet = clonedEx.sets[0];
  assert.strictEqual(clonedSet.type, 'working', 'Type mapped to working');
  assert.strictEqual(clonedSet.target, '6-8', 'Target preserved as 6-8');
  assert.strictEqual(clonedSet.targetReps, '6-8', 'Target reps preserved as 6-8');
  assert.strictEqual(clonedSet.weight, 80.0, 'Weight preserved as 80.0');
  assert.strictEqual(clonedSet.targetWeight, 80.0, 'Target weight preserved as 80.0');
  assert.strictEqual(clonedSet.reps, 8, 'Reps mapped to upper bound 8 (not actual reps 7)');
  assert.strictEqual(clonedSet.completed, false, 'Completed reset to false');
  assert.strictEqual(clonedSet.completedAt, null, 'completedAt reset to null');
  assert.strictEqual(clonedSet.rir, null, 'RIR reset to null');
  assert.strictEqual(clonedSet.rirPlus, false, 'rirPlus reset to false');

  console.log('  ✓ Exercise identity mapped: barbell_bench_press');
  console.log('  ✓ Target preserved: 6-8 (target and targetReps)');
  console.log('  ✓ Weight preserved: 80.0');
  console.log('  ✓ Reps upper bound parsed: 8 (from 6-8, distinct from actualReps 7)');
  console.log('  ✓ Reset states: completed=false, completedAt=null, rir=null, rirPlus=false');
  console.log('  ✓ Fresh active session id generated.');

  console.log('\n====================================================');
  console.log('🎉 REPEAT WORKOUT INTEGRATION TEST PASSED 100%!');
  console.log('====================================================\n');
} finally {
  server.close();
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (err) {
    // ignore cleanup error
  }
}
