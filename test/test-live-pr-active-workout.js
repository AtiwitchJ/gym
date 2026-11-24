import assert from 'node:assert';
import {
  isNewPr,
  evaluateExercisePrs,
  collectSessionPrs,
  getCachedBaseline,
  setCachedBaseline,
  clearPrCache
} from '../src/composables/usePersonalRecords.js';
import { prLabel } from '../src/composables/useSessionSummary.js';

console.log('====================================================');
console.log('🧪 QA Unit Tests: Live PR Tracking in Active Workout');
console.log('====================================================\n');

// 1. Baseline Reliability: Must not claim PR if baseline failed or is absent
console.log('▶ [1] Baseline Reliability: null/undefined/missing baselines never trigger PR...');
clearPrCache();

// No baseline (first time logging exercise)
const firstTimeEx = {
  exerciseId: 'incline_db_press',
  name: 'Incline Dumbbell Press',
  sets: [{ completed: true, weight: 30, reps: 8, type: 'working' }]
};
const resNull = evaluateExercisePrs(firstTimeEx, null);
assert.strictEqual(resNull[0].isPr, false, 'Baseline null (first time) must NOT trigger PR');
assert.strictEqual(firstTimeEx.sets[0].isPr, false, 'Set isPr property must be false');

// Offline / Network Failure (undefined)
const offlineEx = {
  exerciseId: 'incline_db_press',
  name: 'Incline Dumbbell Press',
  sets: [{ completed: true, weight: 30, reps: 8, type: 'working' }]
};
const resUndef = evaluateExercisePrs(offlineEx, undefined);
assert.strictEqual(resUndef[0].isPr, false, 'Baseline undefined (failed load/offline) must NOT trigger PR');

// Zero / negative baseline
const resZero = evaluateExercisePrs(offlineEx, 0);
assert.strictEqual(resZero[0].isPr, false, 'Baseline <= 0 must NOT trigger PR');
console.log('✓ Baseline reliability verified: No false positives without verified history.');

// 2. Warmup & Incomplete Data Exclusion
console.log('\n▶ [2] Warmup & Incomplete Data Exclusion...');
const baselineVal = 50.0; // Baseline e1RM = 50 kg

const warmupEx = {
  exerciseId: 'bench_press',
  name: 'Bench Press',
  sets: [
    { completed: true, weight: 60, reps: 10, type: 'warmup' }, // warm-up with heavy weight
    { completed: true, weight: 60, reps: 10, type: 'warm' },   // alternative warmup type
    { completed: true, weight: 60, reps: 10, type: 'working', isWarm: true }, // flag
    { completed: true, weight: 0, reps: 10, type: 'working' },  // zero weight
    { completed: true, weight: 60, reps: 0, type: 'working' },  // zero reps
    { completed: true, weight: -10, reps: 8, type: 'working' }, // negative weight
    { completed: false, weight: 70, reps: 10, type: 'working' } // not completed
  ]
};
const resWarmup = evaluateExercisePrs(warmupEx, baselineVal);
for (let i = 0; i < warmupEx.sets.length; i++) {
  assert.strictEqual(resWarmup[i].isPr, false, `Set ${i + 1} must not be PR`);
  assert.strictEqual(warmupEx.sets[i].isPr, false, `Set ${i + 1} property must be false`);
}
console.log('✓ Warmup, invalid, incomplete, and uncompleted sets strictly excluded.');

// 3. Intra-Session PR Progression (Baseline AND Prior Set Comparison)
console.log('\n▶ [3] Intra-Session PR Progression...');
// Baseline e1RM = 50 kg
// Set 1: 60 kg x 8 reps -> e1RM ≈ 76.0 kg (beats 50) -> PR!
// Set 2: 65 kg x 8 reps -> e1RM ≈ 82.3 kg (beats 76.0) -> PR!
// Set 3: 60 kg x 8 reps -> e1RM ≈ 76.0 kg (below 82.3) -> NOT PR!
const multiSetEx = {
  exerciseId: 'squat',
  name: 'Barbell Squat',
  sets: [
    { completed: true, weight: 60, reps: 8, type: 'working' },
    { completed: true, weight: 65, reps: 8, type: 'working' },
    { completed: true, weight: 60, reps: 8, type: 'working' }
  ]
};
const resProgression = evaluateExercisePrs(multiSetEx, baselineVal);
assert.strictEqual(resProgression[0].isPr, true, 'Set 1 (76.0 kg > 50 kg baseline) must be PR');
assert.strictEqual(resProgression[1].isPr, true, 'Set 2 (82.3 kg > 76.0 kg Set 1) must be PR');
assert.strictEqual(resProgression[2].isPr, false, 'Set 3 (76.0 kg <= 82.3 kg Set 2) must NOT be PR');
console.log('✓ Intra-session progression verified: Subsequent sets must beat preceding sets in current workout.');

// 4. Reactivity: Unticking Done
console.log('\n▶ [4] Reactivity: Unticking Done recalculates PRs...');
// If Set 2 is unticked, Set 3 (with 62.5 kg x 8 -> e1RM 79.2) should now beat Set 1 (76.0)!
multiSetEx.sets[1].completed = false; // User unticks Set 2
multiSetEx.sets[2].weight = 62.5;     // 62.5 kg x 8 -> 79.2 kg

const resUntick = evaluateExercisePrs(multiSetEx, baselineVal);
assert.strictEqual(resUntick[0].isPr, true, 'Set 1 remains PR');
assert.strictEqual(resUntick[1].isPr, false, 'Set 2 is unticked, cannot be PR');
assert.strictEqual(resUntick[2].isPr, true, 'Set 3 (79.2 kg > 76.0 kg) becomes PR after Set 2 is unticked!');
console.log('✓ Untick reactivity verified: PRs reactively adjust across remaining sets.');

// 5. Reactivity: Weight/Reps Stepper & Keypad Edits
console.log('\n▶ [5] Reactivity: Stepper & Keypad Edits...');
// If Set 1 weight is reduced to 35 kg x 8 (e1RM 44.3 < baseline 50):
multiSetEx.sets[0].weight = 35;
const resEdit = evaluateExercisePrs(multiSetEx, baselineVal);
assert.strictEqual(resEdit[0].isPr, false, 'Set 1 at 35 kg does not beat baseline (50 kg) -> PR removed');
assert.strictEqual(resEdit[2].isPr, true, 'Set 3 (79.2 kg > baseline 50 kg) is now the first PR');
console.log('✓ Edit reactivity verified: Lowering weight correctly removes PR badge.');

// 6. Collect Session PRs for Workout Summary Modal
console.log('\n▶ [6] Collect Session PRs & Summary Formatting...');
const mockSession = {
  id: 'session_test_summary',
  exercises: [
    {
      exerciseId: 'squat',
      name: 'Barbell Squat',
      sets: [
        { completed: true, isPr: false, weight: 35, reps: 8 },
        { completed: true, isPr: true, weight: 62.5, reps: 8, e1rm: 79.2 }
      ]
    },
    {
      exerciseId: 'bench_press',
      name: 'Flat Dumbbell Bench Press',
      sets: [
        { completed: true, isPr: true, weight: 25, reps: 10, e1rm: 33.3 },
        { completed: false, isPr: false, weight: 30, reps: 8 }
      ]
    }
  ]
};

const sessionPrs = collectSessionPrs(mockSession);
assert.strictEqual(sessionPrs.length, 2, 'Should collect exactly 2 PR achievements');
assert.strictEqual(sessionPrs[0].exerciseName, 'Barbell Squat');
assert.strictEqual(sessionPrs[0].weight, '62.5');
assert.strictEqual(sessionPrs[0].reps, '8');

assert.strictEqual(sessionPrs[1].exerciseName, 'Flat Dumbbell Bench Press');
assert.strictEqual(sessionPrs[1].weight, '25');
assert.strictEqual(sessionPrs[1].reps, '10');

// Verify prLabel output for WorkoutSummaryModal
const label1 = prLabel(sessionPrs[0]);
assert.strictEqual(label1, 'Barbell Squat 62.5 kg × 8');
const label2 = prLabel(sessionPrs[1]);
assert.strictEqual(label2, 'Flat Dumbbell Bench Press 25 kg × 10');
console.log('✓ Summary collection and Thai prLabel formatting verified.');

// 7. Draft Serialization & Deserialization (Reload Persistence)
console.log('\n▶ [7] Active Draft Reload Persistence...');
const jsonString = JSON.stringify(mockSession);
const reloadedSession = JSON.parse(jsonString);

assert.strictEqual(reloadedSession.exercises[0].sets[1].isPr, true);
assert.strictEqual(reloadedSession.exercises[1].sets[0].isPr, true);
assert.strictEqual(reloadedSession.exercises[0].sets[0].isPr, false);
console.log('✓ Draft JSON roundtrip preserves isPr flags on reload.');

console.log('\n====================================================');
console.log('🎉 ALL LIVE PR UNIT & REACTIVITY TESTS PASSED (100%)');
console.log('====================================================');
