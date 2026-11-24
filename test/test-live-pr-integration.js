import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  getBaselineE1rm,
  getCachedBaseline,
  setCachedBaseline,
  evaluateExercisePrs,
  collectSessionPrs,
  clearPrCache,
  isNewPr
} from '../src/composables/usePersonalRecords.js';
import { prLabel } from '../src/composables/useSessionSummary.js';
import { calculateEstimated1RM } from '../src/composables/useRpeAdvisor.js';

/**
 * End-to-End Integration Test: Live PR Feature
 * - Strictly isolated temporary SQLite DB (GYM_FORBID_REAL_DB=1)
 * - Real Express API server & routes (/api/exercises/:id/history, /api/history, /api/exercises/:id/records)
 * - Multi-exercise history & cross-day canonical IDs
 * - Baseline reliability: exists, empty/first-time, load failure (offline/500)
 * - Active workout live PR tracking, dynamic untick/edit reactivity
 * - Summary PR collection & non-drift verification
 * - Post-save baseline progression across canonical links
 */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-live-pr-integration-'));
const testDbPath = path.join(tmpDir, 'gym-live-pr-test.db');
process.env.GYM_DB_PATH = testDbPath;
process.env.GYM_FORBID_REAL_DB = '1';

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

console.log('====================================================');
console.log('🧪 Integration Test: Live PR Feature with Real API & DB');
console.log('====================================================\n');

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const fetchImpl = (url, opts) => fetch(`${base}${url}`, opts);

try {
  // --------------------------------------------------------------------------
  // 1. Seed Historical Sessions across Multiple Exercises and Canonical Links
  // --------------------------------------------------------------------------
  console.log('▶ [1] Seeding multi-exercise historical sessions into isolated SQLite...');

  // Historical Session 1 (2026-11-10)
  repo.saveSession({
    id: 'history-session-1',
    date: '2026-11-10',
    time: '18:00',
    dayKey: 'push_day',
    dayTitle: 'Push Day 1',
    totalSetsDone: 3,
    durationSec: 3600,
    sessionRpe: 8.0,
    sessionLoadAu: 480,
    pumpRating: 'good',
    jointComfort: 'good',
    exercises: [
      {
        id: 'barbell_bench_press',
        name: 'Barbell Bench Press',
        category: 'chest',
        sets: [
          // Warmup set: must be ignored by PR calculation
          { setIndex: 1, type: 'warmup', target: '15', weight: 40.0, actualReps: 15, done: true, rir: null },
          // Working set: 80 kg x 6 reps, rir: 0 -> e1RM = 80 * (1 + 6/30) = 96.0 kg
          { setIndex: 2, type: 'normal', target: '6-8', weight: 80.0, actualReps: 6, done: true, rir: 0 }
        ]
      },
      {
        id: 'th1', // Canonical link to shoulder_press
        name: 'Shoulder Press Machine',
        category: 'shoulders',
        sets: [
          // 50 kg x 10 reps, rir: 1 -> effective reps 11 -> e1RM = 50 * (1 + 11/30) = 68.3 kg
          { setIndex: 1, type: 'normal', target: '8-10', weight: 50.0, actualReps: 10, done: true, rir: 1 }
        ]
      },
      {
        id: 'barbell_deadlift', // Non-canonical standard exercise
        name: 'Barbell Deadlift',
        category: 'back',
        sets: [
          // 140 kg x 5 reps, rir: 0 -> e1RM = 140 * (1 + 5/30) = 163.3 kg
          { setIndex: 1, type: 'normal', target: '5', weight: 140.0, actualReps: 5, done: true, rir: 0 }
        ]
      }
    ]
  });

  // Historical Session 2 (2026-11-17) - Progressive Overload for Bench Press
  repo.saveSession({
    id: 'history-session-2',
    date: '2026-11-17',
    time: '18:30',
    dayKey: 'push_day',
    dayTitle: 'Push Day 2',
    totalSetsDone: 2,
    durationSec: 3300,
    sessionRpe: 8.5,
    sessionLoadAu: 468,
    pumpRating: 'insane',
    jointComfort: 'good',
    exercises: [
      {
        id: 'barbell_bench_press',
        name: 'Barbell Bench Press',
        category: 'chest',
        sets: [
          // 82.5 kg x 6 reps, rir: 0 -> e1RM = 82.5 * (1 + 6/30) = 99.0 kg
          { setIndex: 1, type: 'normal', target: '6-8', weight: 82.5, actualReps: 6, done: true, rir: 0 },
          // Uncompleted / failed set: 100 kg x 1 rep, done: false -> must be ignored!
          { setIndex: 2, type: 'normal', target: '1', weight: 100.0, actualReps: 1, done: false, rir: 0 }
        ]
      }
    ]
  });

  console.log('  ✓ Historical sessions saved successfully.');

  // --------------------------------------------------------------------------
  // 2. Real API Contract: Baseline States (Exists, Empty, Load Failure)
  // --------------------------------------------------------------------------
  console.log('\n▶ [2] Verifying Baseline States via Real API Endpoints...');
  clearPrCache();

  // 2a. Baseline Exists: barbell_bench_press
  const benchRes = await fetchImpl('/api/exercises/barbell_bench_press/history');
  assert.strictEqual(benchRes.status, 200, 'GET history returns 200');
  const benchHistory = await benchRes.json();
  assert.strictEqual(benchHistory.length, 2, 'bench history contains 2 sessions');
  assert.strictEqual(benchHistory[0].pr.bestWeight, 82.5, 'bestWeight ignores uncompleted 100 kg');
  assert.strictEqual(benchHistory[0].pr.bestReps, 6);
  assert.strictEqual(benchHistory[0].pr.estimated1RM, 99.0, 'Historical baseline e1RM is 99.0 kg');

  const benchBaseline = await getBaselineE1rm('barbell_bench_press', fetchImpl);
  assert.strictEqual(benchBaseline, 99.0, 'getBaselineE1rm correctly resolved 99.0 kg');
  assert.strictEqual(getCachedBaseline('barbell_bench_press'), 99.0, 'Baseline cached in memory');
  console.log('  ✓ Baseline Exists verified: 99.0 kg (warmup and incomplete sets excluded).');

  // 2b. Canonical ID Baseline Resolution: Querying b_m_shoulder resolves history from th1
  const shoulderRes = await fetchImpl('/api/exercises/b_m_shoulder/history');
  assert.strictEqual(shoulderRes.status, 200);
  const shoulderHistory = await shoulderRes.json();
  assert.strictEqual(shoulderHistory.length, 1, 'b_m_shoulder resolves linked th1 session');
  assert.strictEqual(shoulderHistory[0].pr.estimated1RM, 68.3, 'Canonical baseline e1RM is 68.3 kg');

  const shoulderBaseline = await getBaselineE1rm('b_m_shoulder', fetchImpl);
  assert.strictEqual(shoulderBaseline, 68.3, 'b_m_shoulder got 68.3 kg baseline from linked th1');
  console.log('  ✓ Canonical ID Link verified: b_m_shoulder resolved 68.3 kg baseline from th1.');

  // 2c. Baseline Exists: barbell_deadlift
  const dlBaseline = await getBaselineE1rm('barbell_deadlift', fetchImpl);
  assert.strictEqual(dlBaseline, 163.3, 'Deadlift baseline resolved 163.3 kg');

  // 2d. Baseline Empty: Unseen / First-Time Exercise
  const newExRes = await fetchImpl('/api/exercises/brand_new_curl/history');
  assert.strictEqual(newExRes.status, 200);
  const newExHistory = await newExRes.json();
  assert.deepStrictEqual(newExHistory, [], 'Unseen exercise returns empty array');

  const emptyBaseline = await getBaselineE1rm('brand_new_curl', fetchImpl);
  assert.strictEqual(emptyBaseline, null, 'getBaselineE1rm on empty history returns null');
  console.log('  ✓ Baseline Empty verified: Brand new exercise resolves to null.');

  // 2e. Baseline Load Failure (simulated offline / 500 error)
  const failedBaseline = await getBaselineE1rm('failing_ex', async () => {
    return { ok: false, status: 500 };
  });
  assert.strictEqual(failedBaseline, undefined, 'Failed HTTP request resolves to undefined');

  const networkErrBaseline = await getBaselineE1rm('network_err_ex', async () => {
    throw new Error('Connection refused / offline');
  });
  assert.strictEqual(networkErrBaseline, undefined, 'Network exception resolves to undefined');
  console.log('  ✓ Baseline Load Failure verified: 500/offline errors resolve to undefined.');

  // --------------------------------------------------------------------------
  // 3. Active Workout Live PR Evaluation (Simulating Active Session)
  // --------------------------------------------------------------------------
  console.log('\n▶ [3] Active Workout Live PR Evaluation across All Exercises...');

  const activeWorkoutSession = {
    id: `session_live_${Date.now()}`,
    dayKey: 'push_day',
    title: 'Push Day - Live Progression Run',
    startTime: Date.now() - 3600000,
    exercises: [
      // Exercise A: Bench Press (Baseline = 99.0 kg)
      {
        exerciseId: 'barbell_bench_press',
        name: 'Barbell Bench Press',
        sets: [
          // Set 0: Warmup -> never PR
          { completed: true, type: 'warmup', weight: 50, reps: 15, rir: null },
          // Set 1: 85 kg x 6 reps, rir: 0 -> e1RM = 102.0 kg (> 99.0) -> PR!
          { completed: true, type: 'working', weight: 85, reps: 6, rir: 0 },
          // Set 2: 90 kg x 5 reps, rir: 0 -> e1RM = 105.0 kg (> 102.0) -> PR!
          { completed: true, type: 'working', weight: 90, reps: 5, rir: 0 },
          // Set 3: 85 kg x 5 reps, rir: 0 -> e1RM = 99.2 kg (<= 105.0) -> NOT PR
          { completed: true, type: 'working', weight: 85, reps: 5, rir: 0 },
          // Set 4: 95 kg x 5 reps, uncompleted -> NOT PR
          { completed: false, type: 'working', weight: 95, reps: 5, rir: 0 }
        ]
      },
      // Exercise B: Shoulder Press Bonus (Canonical baseline from th1 = 68.3 kg)
      {
        exerciseId: 'b_m_shoulder',
        name: 'Shoulder Press Machine (Bonus)',
        sets: [
          // Set 0: 55 kg x 10 reps, rir: 1 -> e1RM = 55 * (1 + 11/30) = 75.2 kg (> 68.3) -> PR!
          { completed: true, type: 'working', weight: 55, reps: 10, rir: 1 }
        ]
      },
      // Exercise C: Deadlift (Baseline = 163.3 kg)
      {
        exerciseId: 'barbell_deadlift',
        name: 'Barbell Deadlift',
        sets: [
          // Set 0: 140 kg x 4 reps, rir: 0 -> e1RM = 158.7 kg (<= 163.3) -> NOT PR
          { completed: true, type: 'working', weight: 140, reps: 4, rir: 0 }
        ]
      },
      // Exercise D: Brand New Exercise (Baseline = null)
      {
        exerciseId: 'brand_new_curl',
        name: 'Biceps Cable Curl',
        sets: [
          // Set 0: 30 kg x 12 reps -> First time logging -> MUST NOT BE PR!
          { completed: true, type: 'working', weight: 30, reps: 12, rir: 1 }
        ]
      },
      // Exercise E: Error / Offline Exercise (Baseline = undefined)
      {
        exerciseId: 'failing_ex',
        name: 'Failing Lift',
        sets: [
          // Set 0: 100 kg x 10 reps -> Baseline failed to load -> MUST NOT BE PR!
          { completed: true, type: 'working', weight: 100, reps: 10, rir: 0 }
        ]
      }
    ]
  };

  // Evaluate each exercise with its real baseline
  evaluateExercisePrs(activeWorkoutSession.exercises[0], benchBaseline);
  evaluateExercisePrs(activeWorkoutSession.exercises[1], shoulderBaseline);
  evaluateExercisePrs(activeWorkoutSession.exercises[2], dlBaseline);
  evaluateExercisePrs(activeWorkoutSession.exercises[3], emptyBaseline);
  evaluateExercisePrs(activeWorkoutSession.exercises[4], failedBaseline);

  // Assertions for Bench Press (Exercise A)
  const benchSets = activeWorkoutSession.exercises[0].sets;
  assert.strictEqual(benchSets[0].isPr, false, 'Warmup set is not PR');
  assert.strictEqual(benchSets[1].isPr, true, 'Set 1 (102.0 kg > 99.0 kg baseline) is PR');
  assert.strictEqual(benchSets[2].isPr, true, 'Set 2 (105.0 kg > 102.0 kg Set 1) is PR');
  assert.strictEqual(benchSets[3].isPr, false, 'Set 3 (99.2 kg <= 105.0 kg Set 2) is NOT PR');
  assert.strictEqual(benchSets[4].isPr, false, 'Uncompleted Set 4 is NOT PR');

  // Assertions for Shoulder Press (Exercise B)
  const shoulderSets = activeWorkoutSession.exercises[1].sets;
  assert.strictEqual(shoulderSets[0].isPr, true, 'Shoulder Set 0 (75.2 kg > 68.3 kg canonical baseline) is PR');

  // Assertions for Deadlift (Exercise C)
  const dlSets = activeWorkoutSession.exercises[2].sets;
  assert.strictEqual(dlSets[0].isPr, false, 'Deadlift Set 0 (158.7 kg <= 163.3 kg) is NOT PR');

  // Assertions for Brand New Exercise (Exercise D - null baseline)
  const newExSets = activeWorkoutSession.exercises[3].sets;
  assert.strictEqual(newExSets[0].isPr, false, 'First time exercise (null baseline) NEVER claims PR');

  // Assertions for Error Exercise (Exercise E - undefined baseline)
  const errExSets = activeWorkoutSession.exercises[4].sets;
  assert.strictEqual(errExSets[0].isPr, false, 'Load failure exercise (undefined baseline) NEVER claims PR');

  console.log('  ✓ Live PR evaluation verified across all baseline states and set types.');

  // --------------------------------------------------------------------------
  // 4. Reactivity: Dynamic Unticking & Keypad Modification Safety
  // --------------------------------------------------------------------------
  console.log('\n▶ [4] Dynamic Reactivity: Untick & Stepper/Keypad Edits...');

  // 4a. User unticks Set 2 (105.0 kg PR)
  benchSets[2].completed = false;
  // User edits Set 3 weight from 85 kg to 88 kg (88 * (1 + 5/30) = 102.7 kg)
  benchSets[3].weight = 88;

  evaluateExercisePrs(activeWorkoutSession.exercises[0], benchBaseline);

  assert.strictEqual(benchSets[1].isPr, true, 'Set 1 remains PR (102.0 kg)');
  assert.strictEqual(benchSets[2].isPr, false, 'Unticked Set 2 cannot be PR');
  assert.strictEqual(benchSets[3].isPr, true, 'Set 3 (102.7 kg > Set 1 102.0 kg) becomes PR after Set 2 unticked!');
  console.log('  ✓ Unticking Set 2 promoted edited Set 3 to PR dynamically.');

  // 4b. User re-ticks Set 2 with increased weight: 92 kg x 5 reps -> e1RM = 107.3 kg
  benchSets[2].completed = true;
  benchSets[2].weight = 92;
  benchSets[2].reps = 5;

  evaluateExercisePrs(activeWorkoutSession.exercises[0], benchBaseline);

  assert.strictEqual(benchSets[1].isPr, true, 'Set 1 is PR (102.0 kg > 99.0 kg)');
  assert.strictEqual(benchSets[2].isPr, true, 'Set 2 is PR (107.3 kg > 102.0 kg)');
  assert.strictEqual(benchSets[3].isPr, false, 'Set 3 is no longer PR (102.7 kg <= 107.3 kg)');
  console.log('  ✓ Re-ticking with higher weight dynamically corrected PR precedence.');

  // --------------------------------------------------------------------------
  // 5. Summary PR Collection & Zero-Drift Verification
  // --------------------------------------------------------------------------
  console.log('\n▶ [5] Summary PR Collection & Label Verification...');

  const sessionPrs = collectSessionPrs(activeWorkoutSession);
  assert.strictEqual(sessionPrs.length, 3, 'Exactly 3 PR sets earned in session');

  assert.strictEqual(sessionPrs[0].exerciseId, 'barbell_bench_press');
  assert.strictEqual(sessionPrs[0].setIndex, 1);
  assert.strictEqual(sessionPrs[0].weight, '85');
  assert.strictEqual(sessionPrs[0].reps, '6');
  assert.strictEqual(prLabel(sessionPrs[0]), 'Barbell Bench Press 85 kg × 6');

  assert.strictEqual(sessionPrs[1].exerciseId, 'barbell_bench_press');
  assert.strictEqual(sessionPrs[1].setIndex, 2);
  assert.strictEqual(sessionPrs[1].weight, '92');
  assert.strictEqual(sessionPrs[1].reps, '5');
  assert.strictEqual(prLabel(sessionPrs[1]), 'Barbell Bench Press 92 kg × 5');

  assert.strictEqual(sessionPrs[2].exerciseId, 'b_m_shoulder');
  assert.strictEqual(sessionPrs[2].setIndex, 0);
  assert.strictEqual(sessionPrs[2].weight, '55');
  assert.strictEqual(sessionPrs[2].reps, '10');
  assert.strictEqual(prLabel(sessionPrs[2]), 'Shoulder Press Machine (Bonus) 55 kg × 10');

  console.log('  ✓ Collected PRs formatted perfectly without drift or spurious entries.');

  // --------------------------------------------------------------------------
  // 6. Save Workout Session via Real HTTP POST /api/history & Baseline Evolution
  // --------------------------------------------------------------------------
  console.log('\n▶ [6] Saving Session via Real HTTP POST /api/history...');

  const postPayload = {
    id: activeWorkoutSession.id,
    date: '2026-11-24',
    time: '19:00',
    dayKey: 'push_day',
    dayTitle: 'Push Day - Live Progression Run',
    totalSetsDone: 5,
    durationSec: 3600,
    sessionRpe: 8.5,
    sessionLoadAu: 510,
    pumpRating: 'insane',
    jointComfort: 'good',
    exercises: [
      {
        id: 'barbell_bench_press',
        name: 'Barbell Bench Press',
        category: 'chest',
        sets: [
          { setIndex: 1, type: 'warmup', target: '15', weight: 50, actualReps: 15, done: true },
          { setIndex: 2, type: 'normal', target: '6-8', weight: 85, actualReps: 6, done: true, rir: 0 },
          { setIndex: 3, type: 'normal', target: '6-8', weight: 92, actualReps: 5, done: true, rir: 0 },
          { setIndex: 4, type: 'normal', target: '6-8', weight: 88, actualReps: 5, done: true, rir: 0 }
        ]
      },
      {
        id: 'b_m_shoulder',
        name: 'Shoulder Press Machine (Bonus)',
        category: 'shoulders',
        sets: [
          { setIndex: 1, type: 'normal', target: '8-10', weight: 55, actualReps: 10, done: true, rir: 1 }
        ]
      },
      {
        id: 'brand_new_curl',
        name: 'Biceps Cable Curl',
        category: 'arms',
        sets: [
          { setIndex: 1, type: 'normal', target: '10-12', weight: 30, actualReps: 12, done: true, rir: 1 }
        ]
      }
    ]
  };

  const saveRes = await fetchImpl('/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postPayload)
  });

  assert.strictEqual(saveRes.status, 200, 'POST /api/history returns 200 OK');
  const saveResult = await saveRes.json();
  assert.strictEqual(saveResult.success, true);
  console.log('  ✓ Session committed to SQLite through real HTTP endpoint.');

  // --------------------------------------------------------------------------
  // 7. Verify Post-Save Baseline Progression across Endpoints
  // --------------------------------------------------------------------------
  console.log('\n▶ [7] Verifying Post-Save Baseline Evolution across Endpoints...');
  clearPrCache();

  // 7a. Bench Press baseline evolved from 99.0 kg to 107.3 kg
  const postBenchBaseline = await getBaselineE1rm('barbell_bench_press', fetchImpl);
  assert.strictEqual(postBenchBaseline, 107.3, 'Bench baseline updated to 107.3 kg (92 kg x 5)');

  // 7b. Linked th1 exercise baseline evolved from 68.3 kg to 75.2 kg
  const postTh1Baseline = await getBaselineE1rm('th1', fetchImpl);
  assert.strictEqual(postTh1Baseline, 75.2, 'Linked th1 baseline automatically updated from b_m_shoulder PR (75.2 kg)');

  // 7c. Brand new exercise now has an established baseline for future sessions!
  const postCurlBaseline = await getBaselineE1rm('brand_new_curl', fetchImpl);
  // 30 kg x 12 reps, rir 1 -> effective reps 13 -> 30 * (1 + 13/30) = 43.0 kg
  assert.strictEqual(postCurlBaseline, 43.0, 'Brand new exercise established 43.0 kg baseline for future workouts');

  // 7d. Query /api/exercises/:id/records timeline
  const recordsRes = await fetchImpl('/api/exercises/barbell_bench_press/records');
  assert.strictEqual(recordsRes.status, 200);
  const recordsData = await recordsRes.json();
  assert.strictEqual(recordsData.records.heaviestWeight.value, 92);
  assert.strictEqual(recordsData.records.bestE1rm.value, 107.3);
  console.log('  ✓ Post-save evolution verified: All baselines and milestone records advanced seamlessly.');

  console.log('\n====================================================');
  console.log('🎉 ALL LIVE PR INTEGRATION CONTRACTS PASSED (100%)');
  console.log('====================================================\n');
} finally {
  server.close();
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (err) {
    // ignore cleanup
  }
}
