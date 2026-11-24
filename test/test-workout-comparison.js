import assert from 'node:assert';
import {
  compareWorkoutSessions,
  findLatestPair,
  extractWorkingSets,
  compareSets,
  evaluateExerciseStatus
} from '../server/workout-comparison.js';

console.log('====================================================');
console.log('🧪 QA Test: Workout Session Comparison Engine (Unit)');
console.log('====================================================\n');

// 1. Zero Comparison Graceful Handling
console.log('▶ [1] Zero Comparison Graceful Handling (first session)...');
const firstSession = {
  id: 'ws-first',
  date: '2026-11-24',
  time: '18:00',
  dayKey: 'day1',
  dayTitle: 'Day 1: อกและหลังแขน',
  exercises: [
    {
      id: 'ex-bench',
      name: 'Bench Press',
      sets: [{ setIndex: 0, weight: 80, actualReps: 8, done: true, type: 'normal' }]
    }
  ]
};

const zeroRes = compareWorkoutSessions(firstSession, null);
assert.strictEqual(zeroRes.success, true);
assert.strictEqual(zeroRes.hasComparison, false);
assert.strictEqual(zeroRes.targetSession, null);
assert.strictEqual(zeroRes.summary, null);
assert.ok(zeroRes.messageTh.includes('ยังไม่มีรอบก่อนหน้า'));
assert.deepStrictEqual(zeroRes.exercises, []);
assert.deepStrictEqual(zeroRes.newExercises, []);
assert.deepStrictEqual(zeroRes.droppedExercises, []);
console.log('✓ Zero comparison graceful handling verified.');

// 2. Macro Delta Precision & Rounding (Spec Section 6 Test 2)
console.log('▶ [2] Macro Delta Precision & Rounding...');
// Session A: 14,250 kg, 162 reps, 52 min (3120 s)
// Session B: 13,100 kg, 150 reps, 58 min (3480 s)
const sessionA = {
  id: 'ws-a',
  date: '2026-11-24',
  time: '18:30',
  dayKey: 'day1',
  dayTitle: 'Day 1: อกและหลังแขน',
  durationSec: 3120,
  sessionRpe: 8.0,
  sessionLoadAu: 416.0,
  exercises: [
    {
      id: 'ex-bench',
      canonicalId: 'barbell_bench_press',
      name: 'Barbell Bench Press',
      category: 'chest',
      sets: [
        { setIndex: 0, weight: 80, actualReps: 10, done: true, type: 'normal' },
        { setIndex: 1, weight: 82.5, actualReps: 8, done: true, type: 'normal' },
        { setIndex: 2, weight: 82.5, actualReps: 7, done: true, type: 'normal' }
      ]
    },
    {
      id: 'ex-bulk-a',
      canonicalId: 'bulk_a',
      name: 'Bulk Exercise A',
      category: 'chest',
      // Volume = 14250 - (80*10 + 82.5*8 + 82.5*7) = 14250 - 2037.5 = 12212.5 kg
      // Reps = 162 - 25 = 137 reps
      sets: [
        { setIndex: 0, weight: 89.1423357664, actualReps: 137, done: true, type: 'normal' }
      ]
    }
  ]
};

const sessionB = {
  id: 'ws-b',
  date: '2026-11-17',
  time: '18:45',
  dayKey: 'day1',
  dayTitle: 'Day 1: อกและหลังแขน',
  durationSec: 3480,
  sessionRpe: 8.5,
  sessionLoadAu: 493.0,
  exercises: [
    {
      id: 'ex-bench',
      canonicalId: 'barbell_bench_press',
      name: 'Barbell Bench Press',
      category: 'chest',
      sets: [
        { setIndex: 0, weight: 80, actualReps: 9, done: true, type: 'normal' },
        { setIndex: 1, weight: 80, actualReps: 8, done: true, type: 'normal' },
        { setIndex: 2, weight: 82.5, actualReps: 7, done: true, type: 'normal' }
      ]
    },
    {
      id: 'ex-bulk-a',
      canonicalId: 'bulk_a',
      name: 'Bulk Exercise A',
      category: 'chest',
      // Volume = 13100 - (80*9 + 80*8 + 82.5*7) = 13100 - 1937.5 = 11162.5 kg
      // Reps = 150 - 24 = 126 reps
      sets: [
        { setIndex: 0, weight: 88.5912698413, actualReps: 126, done: true, type: 'normal' }
      ]
    }
  ]
};

const macroRes = compareWorkoutSessions(sessionA, sessionB);
assert.strictEqual(macroRes.success, true);
assert.strictEqual(macroRes.hasComparison, true);

const macro = macroRes.summary.macroDelta;
assert.strictEqual(macro.totalVolumeKg.base, 14250.0, 'totalVolumeKg.base is 14250.0');
assert.strictEqual(macro.totalVolumeKg.target, 13100.0, 'totalVolumeKg.target is 13100.0');
assert.strictEqual(macro.totalVolumeKg.diff, 1150.0, 'totalVolumeKg.diff is 1150.0');
assert.strictEqual(macro.totalVolumeKg.pct, 8.8, 'totalVolumeKg.pct is 8.8');

assert.strictEqual(macro.totalReps.base, 162, 'totalReps.base is 162');
assert.strictEqual(macro.totalReps.target, 150, 'totalReps.target is 150');
assert.strictEqual(macro.totalReps.diff, 12, 'totalReps.diff is 12');
assert.strictEqual(macro.totalReps.pct, 8.0, 'totalReps.pct is 8.0');

assert.strictEqual(macro.densityKgPerMin.base, 274.0, 'densityKgPerMin.base is 274.0');
assert.strictEqual(macro.densityKgPerMin.target, 225.9, 'densityKgPerMin.target is 225.9');
assert.strictEqual(macro.densityKgPerMin.diff, 48.1, 'densityKgPerMin.diff is 48.1');

console.log('✓ Macro Delta precision & rounding verified.');

// 3. Set-by-Set Status Classification (Spec Section 6 Test 3)
console.log('▶ [3] Set-by-Set Status Classification...');
const c1 = compareSets({ weight: 80, reps: 10, type: 'normal' }, { weight: 80, reps: 9, type: 'normal' }, 0);
assert.strictEqual(c1.status, 'progressed');
assert.strictEqual(c1.noteTh, '+1 ครั้งที่น้ำหนักเดิม');

const c2 = compareSets({ weight: 82.5, reps: 8, type: 'normal' }, { weight: 80, reps: 8, type: 'normal' }, 1);
assert.strictEqual(c2.status, 'progressed');
assert.strictEqual(c2.noteTh, '+2.5 kg ที่จำนวนครั้งเดิม');

const c3 = compareSets({ weight: 82.5, reps: 7, type: 'normal' }, { weight: 82.5, reps: 7, type: 'normal' }, 2);
assert.strictEqual(c3.status, 'maintained');
assert.strictEqual(c3.noteTh, 'ผลงานเท่าเดิม');

const c4 = compareSets({ weight: 75, reps: 8, type: 'normal' }, { weight: 80, reps: 8, type: 'normal' }, 3);
assert.strictEqual(c4.status, 'regressed');
assert.strictEqual(c4.noteTh, '-5 kg ที่จำนวนครั้งเดิม');
console.log('✓ Set-by-Set status classification verified.');

// 4. Warmup Sets Exclusion in Volume Delta (Spec Section 6 Test 4)
console.log('▶ [4] Warmup Sets Exclusion in Volume Delta...');
const warmupSessionA = {
  id: 'ws-warm-a',
  date: '2026-11-24',
  exercises: [
    {
      id: 'ex-squat',
      name: 'Squat',
      sets: [
        { setIndex: 0, weight: 40, actualReps: 10, done: true, type: 'warmup' }, // warm-up
        { setIndex: 1, weight: 100, actualReps: 5, done: true, type: 'normal' }
      ]
    }
  ]
};

const warmupSessionB = {
  id: 'ws-warm-b',
  date: '2026-11-17',
  exercises: [
    {
      id: 'ex-squat',
      name: 'Squat',
      sets: [
        { setIndex: 0, weight: 40, actualReps: 10, done: true, type: 'warm' }, // warm-up alias
        { setIndex: 1, weight: 100, actualReps: 5, done: true, type: 'normal' }
      ]
    }
  ]
};

const warmRes = compareWorkoutSessions(warmupSessionA, warmupSessionB);
assert.strictEqual(warmRes.summary.macroDelta.totalVolumeKg.base, 500.0, 'Excludes warmup from volume A');
assert.strictEqual(warmRes.summary.macroDelta.totalVolumeKg.target, 500.0, 'Excludes warmup from volume B');
assert.strictEqual(warmRes.exercises[0].setComparisons.length, 1, 'Only 1 working set compared');
console.log('✓ Warmup sets exclusion verified.');

// 5. New & Dropped Exercises Detection (Spec Section 6 Test 5)
console.log('▶ [5] New & Dropped Exercises Detection...');
const exSessionA = {
  id: 'ws-new-a',
  date: '2026-11-24',
  exercises: [
    {
      id: 'ex-bench',
      canonicalId: 'bench_press',
      name: 'Bench Press',
      sets: [{ setIndex: 0, weight: 80, actualReps: 8, done: true }]
    },
    {
      id: 'ex-lateral-raise',
      canonicalId: 'lateral_raise',
      name: 'Lateral Raise',
      sets: [{ setIndex: 0, weight: 12, actualReps: 15, done: true }]
    }
  ]
};

const exSessionB = {
  id: 'ws-new-b',
  date: '2026-11-17',
  exercises: [
    {
      id: 'ex-bench',
      canonicalId: 'bench_press',
      name: 'Bench Press',
      sets: [{ setIndex: 0, weight: 80, actualReps: 8, done: true }]
    },
    {
      id: 'ex-dips',
      canonicalId: 'dips',
      name: 'Dips',
      sets: [{ setIndex: 0, weight: 0, actualReps: 10, done: true }]
    }
  ]
};

const exRes = compareWorkoutSessions(exSessionA, exSessionB);
assert.strictEqual(exRes.exercises.length, 1);
assert.strictEqual(exRes.exercises[0].name, 'Bench Press');

assert.strictEqual(exRes.newExercises.length, 1);
assert.strictEqual(exRes.newExercises[0].name, 'Lateral Raise');

assert.strictEqual(exRes.droppedExercises.length, 1);
assert.strictEqual(exRes.droppedExercises[0].name, 'Dips');
console.log('✓ New & dropped exercises detection verified.');

// 6. Bonus Sets Handling (Mismatched set counts)
console.log('▶ [6] Bonus sets handling...');
const bonusSetComp = compareSets({ weight: 70, reps: 8, type: 'normal' }, null, 3);
assert.strictEqual(bonusSetComp.status, 'progressed');
assert.ok(bonusSetComp.noteTh.includes('+1 เซ็ตเพิ่มเติม'));
console.log('✓ Bonus sets handling verified.');

// 7. Auto-pairing Logic (findLatestPair)
console.log('▶ [7] Auto-pairing Logic (findLatestPair)...');
const historyList = [
  { id: 's3', date: '2026-11-24', time: '18:00', dayKey: 'day1' },
  { id: 's2', date: '2026-11-20', time: '18:00', dayKey: 'day2' },
  { id: 's1', date: '2026-11-17', time: '18:00', dayKey: 'day1' }
];

// s3 should match s1 because dayKey matches
const pair1 = findLatestPair(historyList, 's3');
assert.strictEqual(pair1.baseSession.id, 's3');
assert.strictEqual(pair1.targetSession.id, 's1');

// s2 has no older session with dayKey='day2', so it should match s1 (closest older)
const pair2 = findLatestPair(historyList, 's2');
assert.strictEqual(pair2.baseSession.id, 's2');
assert.strictEqual(pair2.targetSession.id, 's1');

// s1 is the oldest, targetSession must be null
const pair3 = findLatestPair(historyList, 's1');
assert.strictEqual(pair3.baseSession.id, 's1');
assert.strictEqual(pair3.targetSession, null);
console.log('✓ Auto-pairing logic verified.');

// 8. Regression: Set matching with gaps (QA Risk 1)
console.log('▶ [8] Regression: Set matching with gaps (skipped set in A, skipped set in B)...');
// Exercise A: Set 1 (done), Set 2 (skipped), Set 3 (done)
// Exercise B: Set 1 (done), Set 2 (done), Set 3 (skipped)
const gapSessionA = {
  id: 'ws-gap-a',
  date: '2026-11-24',
  exercises: [
    {
      id: 'ex-press',
      name: 'Overhead Press',
      sets: [
        { setIndex: 1, weight: 50, actualReps: 8, done: true },
        { setIndex: 2, weight: 50, actualReps: 0, done: false }, // skipped
        { setIndex: 3, weight: 50, actualReps: 8, done: true }
      ]
    }
  ]
};

const gapSessionB = {
  id: 'ws-gap-b',
  date: '2026-11-17',
  exercises: [
    {
      id: 'ex-press',
      name: 'Overhead Press',
      sets: [
        { setIndex: 1, weight: 50, actualReps: 8, done: true },
        { setIndex: 2, weight: 50, actualReps: 8, done: true },
        { setIndex: 3, weight: 50, actualReps: 0, done: false } // skipped
      ]
    }
  ]
};

const gapRes = compareWorkoutSessions(gapSessionA, gapSessionB);
assert.strictEqual(gapRes.exercises.length, 1);
const comparisons = gapRes.exercises[0].setComparisons;
assert.strictEqual(comparisons.length, 3, 'Should have 3 slot comparisons');

// Slot 0 (Set 1): both done 50x8 -> maintained
assert.strictEqual(comparisons[0].status, 'maintained');
assert.strictEqual(comparisons[0].diffWeight, 0);
assert.strictEqual(comparisons[0].diffReps, 0);

// Slot 1 (Set 2): A skipped, B completed 50x8 -> regressed (-1 set)
assert.strictEqual(comparisons[1].status, 'regressed');
assert.strictEqual(comparisons[1].baseSet, null);
assert.ok(comparisons[1].noteTh.includes('-1 เซ็ต'));

// Slot 2 (Set 3): A completed 50x8, B skipped -> progressed (+1 set)
assert.strictEqual(comparisons[2].status, 'progressed');
assert.strictEqual(comparisons[2].targetSet, null);
assert.ok(comparisons[2].noteTh.includes('+1 เซ็ต'));

// Ensure Set 3 of A was NEVER matched against Set 2 of B
assert.strictEqual(comparisons[0].setIndex, 1);
assert.strictEqual(comparisons[1].setIndex, 2);
assert.strictEqual(comparisons[2].setIndex, 3);
console.log('✓ Set matching with gaps correctly preserves set identity.');

// 9. Regression: Real SQLite session without durationSec (QA Risk 2)
console.log('▶ [9] Regression: Real SQLite session without durationSec...');
const realDbSessionA = {
  id: 'ws-real-a',
  date: '2026-11-24',
  durationSec: null, // real DB row has no duration_sec column
  exercises: [
    {
      id: 'ex-curl',
      name: 'Bicep Curl',
      sets: [{ setIndex: 0, weight: 20, actualReps: 10, done: true }]
    }
  ]
};

const realDbSessionB = {
  id: 'ws-real-b',
  date: '2026-11-17',
  durationSec: null, // real DB row has no duration_sec column
  exercises: [
    {
      id: 'ex-curl',
      name: 'Bicep Curl',
      sets: [{ setIndex: 0, weight: 20, actualReps: 10, done: true }]
    }
  ]
};

const realDbRes = compareWorkoutSessions(realDbSessionA, realDbSessionB);
assert.strictEqual(realDbRes.success, true);
assert.strictEqual(realDbRes.summary.macroDelta.durationSec.base, null);
assert.strictEqual(realDbRes.summary.macroDelta.durationSec.diff, null);
assert.strictEqual(realDbRes.summary.macroDelta.densityKgPerMin.base, null);
assert.strictEqual(realDbRes.summary.macroDelta.densityKgPerMin.diff, null);
assert.ok(!realDbRes.summary.summaryTextTh.includes('หนาแน่น'), 'Does not claim density without duration');
console.log('✓ Null durationSec handled gracefully with null density and clean summary.');

console.log('\n====================================================');
console.log('🎉 ALL WORKOUT COMPARISON UNIT TESTS PASSED!');
console.log('====================================================');
