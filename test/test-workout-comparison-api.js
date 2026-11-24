import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: /api/workout-comparison and /api/workout-comparison/latest-pair HTTP contracts.
 * Uses an isolated temp database only; never touches data/gym.db.
 */
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-comp-'));
process.env.GYM_DB_PATH = path.join(tmpDir, 'gym-test.db');
process.env.GYM_FORBID_REAL_DB = '1';

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

console.log('====================================================');
console.log('🧪 QA Test: Workout Comparison API Endpoints (Integration)');
console.log('====================================================\n');

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

try {
  // Seed two sessions for Day 1
  repo.saveSession({
    id: 'ws-old-day1',
    date: '2026-11-17',
    time: '18:45',
    dayKey: 'day1',
    dayTitle: 'Day 1: อกและหลังแขน',
    totalSetsDone: 3,
    durationSec: 3480,
    sessionRpe: 8.5,
    sessionLoadAu: 493.0,
    exercises: [
      {
        id: 'ex-bench',
        name: 'Barbell Bench Press',
        category: 'chest',
        sets: [
          { setIndex: 0, weight: 80.0, actualReps: 9, done: true, type: 'normal', target: '8-10 reps' },
          { setIndex: 1, weight: 80.0, actualReps: 8, done: true, type: 'normal', target: '8-10 reps' },
          { setIndex: 2, weight: 82.5, actualReps: 7, done: true, type: 'normal', target: '8-10 reps' }
        ]
      }
    ]
  });

  repo.saveSession({
    id: 'ws-new-day1',
    date: '2026-11-24',
    time: '18:30',
    dayKey: 'day1',
    dayTitle: 'Day 1: อกและหลังแขน',
    totalSetsDone: 3,
    durationSec: 3120,
    sessionRpe: 8.0,
    sessionLoadAu: 416.0,
    exercises: [
      {
        id: 'ex-bench',
        name: 'Barbell Bench Press',
        category: 'chest',
        sets: [
          { setIndex: 0, weight: 80.0, actualReps: 10, done: true, type: 'normal', target: '8-10 reps' },
          { setIndex: 1, weight: 82.5, actualReps: 8, done: true, type: 'normal', target: '8-10 reps' },
          { setIndex: 2, weight: 82.5, actualReps: 7, done: true, type: 'normal', target: '8-10 reps' }
        ]
      }
    ]
  });

  // 1. GET /api/workout-comparison/latest-pair with found pair
  console.log('▶ [1] GET /api/workout-comparison/latest-pair (auto-match pair)...');
  const pairRes = await fetch(`${base}/api/workout-comparison/latest-pair?sessionId=ws-new-day1`);
  assert.strictEqual(pairRes.status, 200);
  const pairData = await pairRes.json();
  assert.strictEqual(pairData.success, true);
  assert.strictEqual(pairData.hasComparison, true);
  assert.strictEqual(pairData.baseSession.id, 'ws-new-day1');
  assert.strictEqual(pairData.targetSession.id, 'ws-old-day1');
  assert.strictEqual(pairData.baseSession.durationSec, null, 'baseSession.durationSec is null in SQLite schema');
  assert.strictEqual(pairData.targetSession.durationSec, null, 'targetSession.durationSec is null in SQLite schema');
  assert.strictEqual(pairData.summary.macroDelta.durationSec.base, null);
  assert.strictEqual(pairData.summary.macroDelta.densityKgPerMin.base, null);
  assert.ok(!pairData.summary.summaryTextTh.includes('หนาแน่น'), 'Summary text omits density claim when duration is absent');
  assert.strictEqual(pairData.summary.verdict, 'overload');
  assert.strictEqual(pairData.exercises.length, 1);
  assert.strictEqual(pairData.exercises[0].status, 'progressed');
  console.log('✓ Auto-match latest pair 200 OK verified.');

  // 2. GET /api/workout-comparison/latest-pair for earliest session (zero comparison)
  console.log('▶ [2] GET /api/workout-comparison/latest-pair (first session zero comparison)...');
  const zeroRes = await fetch(`${base}/api/workout-comparison/latest-pair?sessionId=ws-old-day1`);
  assert.strictEqual(zeroRes.status, 200);
  const zeroData = await zeroRes.json();
  assert.strictEqual(zeroData.success, true);
  assert.strictEqual(zeroData.hasComparison, false);
  assert.strictEqual(zeroData.targetSession, null);
  assert.strictEqual(zeroData.summary, null);
  assert.ok(zeroData.messageTh.includes('ยังไม่มีรอบก่อนหน้า'));
  console.log('✓ First session zero comparison 200 OK verified.');

  // 3. GET /api/workout-comparison/latest-pair validation errors
  console.log('▶ [3] GET /api/workout-comparison/latest-pair parameter validation...');
  const missingParamRes = await fetch(`${base}/api/workout-comparison/latest-pair`);
  assert.strictEqual(missingParamRes.status, 400);

  const notFoundRes = await fetch(`${base}/api/workout-comparison/latest-pair?sessionId=nonexistent`);
  assert.strictEqual(notFoundRes.status, 404);
  console.log('✓ Parameter validation for latest-pair verified.');

  // 4. GET /api/workout-comparison with explicit baseId and targetId
  console.log('▶ [4] GET /api/workout-comparison with baseId and targetId...');
  const explicitRes = await fetch(`${base}/api/workout-comparison?baseId=ws-new-day1&targetId=ws-old-day1`);
  assert.strictEqual(explicitRes.status, 200);
  const explicitData = await explicitRes.json();
  assert.strictEqual(explicitData.success, true);
  assert.strictEqual(explicitData.hasComparison, true);
  assert.strictEqual(explicitData.baseSession.id, 'ws-new-day1');
  assert.strictEqual(explicitData.targetSession.id, 'ws-old-day1');
  assert.strictEqual(explicitData.summary.verdictScore, 100);
  console.log('✓ Explicit comparison 200 OK verified.');

  // 5. GET /api/workout-comparison validation errors
  console.log('▶ [5] GET /api/workout-comparison validation errors...');
  const missingBaseRes = await fetch(`${base}/api/workout-comparison?targetId=ws-old-day1`);
  assert.strictEqual(missingBaseRes.status, 400);

  const notFoundBaseRes = await fetch(`${base}/api/workout-comparison?baseId=nonexistent&targetId=ws-old-day1`);
  assert.strictEqual(notFoundBaseRes.status, 404);

  const notFoundTargetRes = await fetch(`${base}/api/workout-comparison?baseId=ws-new-day1&targetId=nonexistent`);
  assert.strictEqual(notFoundTargetRes.status, 404);
  console.log('✓ Parameter validation for explicit comparison verified.');

  console.log('\n====================================================');
  console.log('🎉 ALL WORKOUT COMPARISON API TESTS PASSED!');
  console.log('====================================================');
} finally {
  server.close();
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {}
}
