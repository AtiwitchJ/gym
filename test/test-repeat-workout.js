import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  useActiveSessionStore,
  cloneSessionToActive
} from '../src/composables/useActiveSessionStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: Repeat Workout Session from History');
console.log('====================================================\n');

const store = useActiveSessionStore();

// Reset initial store state
store.discardSession();
assert.strictEqual(store.isWorkoutActive.value, false, 'Workout initially inactive');
assert.strictEqual(store.activeSession.value, null, 'Active session initially null');

// -------------------------------------------------------------
// Test 1: Store exports and helper functions
// -------------------------------------------------------------
console.log('▶ [1] Store exports and function signatures...');
assert.strictEqual(typeof cloneSessionToActive, 'function', 'cloneSessionToActive is exported');
assert.strictEqual(typeof store.startSessionFromHistory, 'function', 'startSessionFromHistory is exported on store');
console.log('  ✓ cloneSessionToActive and startSessionFromHistory functions verified.');

// -------------------------------------------------------------
// Test 2: Cloning from standard historical session
// -------------------------------------------------------------
console.log('▶ [2] Cloning from standard historical session...');
const mockHistorySession = {
  id: '2026-11-20_runner_1732100000',
  date: '2026-11-20',
  time: '18:30',
  dayKey: 'prog_a',
  dayTitle: 'Program A (Push + Quads)',
  totalSetsDone: 4,
  durationSec: 3600,
  exercises: [
    {
      id: 'barbell_bench_press',
      name: 'Barbell Bench Press',
      category: 'chest',
      canonicalId: 'bench_press',
      sets: [
        {
          setIndex: 1,
          type: 'วอร์ม',
          target: 15,
          weight: 40.0,
          actualReps: 15,
          done: true,
          rir: null,
          rirPlus: false
        },
        {
          setIndex: 2,
          type: 'เล่นจริง',
          target: '6-8',
          weight: 75.0,
          actualReps: 8,
          done: true,
          rir: 2,
          rirPlus: false
        },
        {
          setIndex: 3,
          type: 'เล่นจริง',
          target: '6-8',
          weight: 75.0,
          actualReps: 7,
          done: true,
          rir: 1,
          rirPlus: true
        }
      ]
    },
    {
      id: 'incline_dumbbell_press',
      name: 'Incline Dumbbell Press',
      category: 'chest',
      canonicalId: 'incline_dumbbell_press',
      sets: [
        {
          setIndex: 1,
          type: 'working',
          target: 8,
          weight: 26.0,
          actualReps: 8,
          done: true,
          rir: 1
        }
      ]
    }
  ]
};

const cloned = cloneSessionToActive(mockHistorySession);

// Assert new session metadata
assert.ok(cloned.id && cloned.id.startsWith('session_'), 'New unique session ID generated');
assert.notStrictEqual(cloned.id, mockHistorySession.id, 'Session ID differs from historical session ID');
assert.strictEqual(cloned.title, 'Program A (Push + Quads)', 'Title matches dayTitle');
assert.ok(cloned.subtitle.includes('2026-11-20'), 'Subtitle references historical date');
assert.strictEqual(cloned.routineId, 'prog_a', 'routineId mapped from dayKey');
assert.ok(cloned.startTime > 0, 'startTime is populated');
assert.ok(cloned.startedAt, 'startedAt ISO string is populated');

// Assert exercises
assert.strictEqual(cloned.exercises.length, 2, '2 exercises cloned');
const ex1 = cloned.exercises[0];
assert.strictEqual(ex1.exerciseId, 'barbell_bench_press', 'Exercise ID mapped correctly');
assert.strictEqual(ex1.name, 'Barbell Bench Press', 'Exercise name mapped');
assert.strictEqual(ex1.sets.length, 3, '3 sets cloned');

// Assert set 0 (warmup)
assert.strictEqual(ex1.sets[0].type, 'warmup', 'Type "วอร์ม" mapped to "warmup"');
assert.strictEqual(ex1.sets[0].targetWeight, 40, 'Target weight mapped to 40');
assert.strictEqual(ex1.sets[0].weight, 40, 'Working weight preset to 40');
assert.strictEqual(ex1.sets[0].targetReps, 15, 'Target reps mapped to 15');
assert.strictEqual(ex1.sets[0].reps, 15, 'Working reps preset to 15');
assert.strictEqual(ex1.sets[0].completed, false, 'Set completed is RESET to false');
assert.strictEqual(ex1.sets[0].completedAt, null, 'Set completedAt is RESET to null');

// Assert set 1 (working)
assert.strictEqual(ex1.sets[1].type, 'working', 'Type "เล่นจริง" mapped to "working"');
assert.strictEqual(ex1.sets[1].target, '6-8', 'Target preserves "6-8"');
assert.strictEqual(ex1.sets[1].targetReps, '6-8', 'Target reps preserves "6-8"');
assert.strictEqual(ex1.sets[1].targetWeight, 75, 'Target weight mapped to 75');
assert.strictEqual(ex1.sets[1].reps, 8, 'Working reps prefilled with 8');
assert.strictEqual(ex1.sets[1].completed, false, 'Working set completed is RESET to false');
assert.strictEqual(ex1.sets[1].completedAt, null, 'Working set completedAt is RESET to null');
assert.strictEqual(ex1.sets[1].rir, null, 'RIR is RESET to null');
assert.strictEqual(ex1.sets[1].rirPlus, false, 'rirPlus is RESET to false');

// Assert set 2 (working with actualReps = 7 vs target = '6-8')
assert.strictEqual(ex1.sets[2].type, 'working', 'Type "เล่นจริง" mapped to "working"');
assert.strictEqual(ex1.sets[2].target, '6-8', 'Target "6-8" PRESERVED over actual reps 7');
assert.strictEqual(ex1.sets[2].targetReps, '6-8', 'Target reps "6-8" PRESERVED over actual reps 7');
assert.notStrictEqual(ex1.sets[2].target, 7, 'Target is NOT overwritten with actualReps 7');
assert.notStrictEqual(ex1.sets[2].targetReps, 7, 'Target reps is NOT overwritten with actualReps 7');
assert.strictEqual(ex1.sets[2].targetWeight, 75, 'Target weight mapped to 75');
assert.strictEqual(ex1.sets[2].weight, 75, 'Weight mapped to 75');
assert.strictEqual(ex1.sets[2].completed, false, 'Set 2 completed is RESET to false');

console.log('  ✓ Standard session cloned with reset states and new session identity.');

// -------------------------------------------------------------
// Test 3: Edge cases (empty session, legacy data, dropsets, strings)
// -------------------------------------------------------------
console.log('▶ [3] Handling edge cases (empty exercises, legacy strings, missing fields)...');

// 3.1 Empty session
const emptySession = { id: 'empty_1' };
const clonedEmpty = cloneSessionToActive(emptySession);
assert.ok(clonedEmpty.id, 'Empty session gets an ID');
assert.strictEqual(clonedEmpty.exercises.length, 0, 'Empty session has 0 exercises');

// 3.2 Null / undefined inputs
const clonedNull = cloneSessionToActive(null);
assert.ok(clonedNull.id, 'Null session gets an ID');
assert.strictEqual(clonedNull.exercises.length, 0, 'Null session has 0 exercises');

// 3.3 Dropset and Thai text parsing
const legacySession = {
  dayTitle: 'Old Legacy Session',
  exercises: [
    {
      id: 'leg_extension',
      sets: [
        { type: 'ดรอป', weight: '45.5', target: '10-12', actualReps: '12', done: 1 },
        { type: 'ล้มเหลว', weight: '50', target: 'Failure', done: 1 },
        { weight: '', actualReps: '' } // missing fields
      ]
    }
  ]
};

const clonedLegacy = cloneSessionToActive(legacySession);
assert.strictEqual(clonedLegacy.exercises[0].sets[0].type, 'dropset', 'Type "ดรอป" mapped to "dropset"');
assert.strictEqual(clonedLegacy.exercises[0].sets[0].weight, 45.5, 'Parsed float weight 45.5');
assert.strictEqual(clonedLegacy.exercises[0].sets[0].reps, 12, 'Parsed actual reps 12');
assert.strictEqual(clonedLegacy.exercises[0].sets[0].completed, false, 'completed is reset');

assert.strictEqual(clonedLegacy.exercises[0].sets[1].type, 'failure', 'Type "ล้มเหลว" mapped to "failure"');
assert.strictEqual(clonedLegacy.exercises[0].sets[1].weight, 50, 'Parsed float weight 50');

assert.strictEqual(clonedLegacy.exercises[0].sets[2].weight, 0, 'Empty weight defaults to 0');
assert.strictEqual(clonedLegacy.exercises[0].sets[2].reps, 8, 'Empty reps defaults to 8');

console.log('  ✓ Edge cases and legacy formats handled safely.');

// -------------------------------------------------------------
// Test 4: Draft Protection and Confirmation Guard
// -------------------------------------------------------------
console.log('▶ [4] Ongoing Active Workout draft protection...');

// 4.1 Start an active workout draft
store.startEmptySession({ title: 'My Ongoing In-Progress Workout' });
assert.strictEqual(store.isWorkoutActive.value, true, 'Workout is active');
store.addExerciseToActiveSession('barbell_bench_press');
assert.strictEqual(store.activeSession.value.exercises.length, 1, 'Draft has 1 exercise');

// Modify draft (e.g. tick a set)
store.updateSetMetric(0, 0, 'weight', 99);
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].weight, 99, 'Draft set updated');

// 4.2 Attempt to startSessionFromHistory WITHOUT force when confirm returns false
let confirmPromptCount = 0;
const cancelConfirm = (msg) => {
  confirmPromptCount++;
  assert.ok(msg.includes('Active Workout'), 'Prompt warning message mentions active workout');
  return false; // User cancels!
};

const rejectResult = store.startSessionFromHistory(mockHistorySession, { confirm: cancelConfirm });
assert.strictEqual(rejectResult.started, false, 'Session start rejected when user cancels');
assert.strictEqual(rejectResult.reason, 'cancelled_by_user', 'Reason is cancelled_by_user');
assert.strictEqual(confirmPromptCount, 1, 'Confirm was called once');

// Confirm ongoing draft was NOT overwritten
assert.strictEqual(store.isWorkoutActive.value, true, 'Original workout remains active');
assert.strictEqual(store.activeSession.value.title, 'My Ongoing In-Progress Workout', 'Original title preserved');
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].weight, 99, 'Original draft values preserved untouched');
console.log('  ✓ Active draft protection successfully blocked overwrite on user cancel.');

// 4.3 Attempt to startSessionFromHistory when user approves (confirm returns true)
let approvePromptCount = 0;
const approveConfirm = (msg) => {
  approvePromptCount++;
  return true; // User accepts!
};

const approveResult = store.startSessionFromHistory(mockHistorySession, { confirm: approveConfirm });
assert.strictEqual(approveResult.started, true, 'Session started when user approves');
assert.strictEqual(approvePromptCount, 1, 'Confirm was called once');
assert.strictEqual(store.activeSession.value.title, 'Program A (Push + Quads)', 'Active session replaced with cloned session');
assert.strictEqual(store.activeSession.value.exercises.length, 2, 'Cloned session exercises loaded');

// 4.4 Start with force: true (already confirmed by UI)
const forceResult = store.startSessionFromHistory(mockHistorySession, { force: true });
assert.strictEqual(forceResult.started, true, 'Session started immediately with force: true');

store.discardSession();
assert.strictEqual(store.isWorkoutActive.value, false, 'Store cleaned up');
console.log('  ✓ Overwrite with confirmation and force option verified.');

// -------------------------------------------------------------
// Test 5: UI Contracts in HistoryView.vue and App.vue
// -------------------------------------------------------------
console.log('▶ [5] UI Contract verification in HistoryView.vue and App.vue...');
const historyViewSrc = read('src/components/HistoryView.vue');
const appSrc = read('src/App.vue');

// Assert repeat button exists in HistoryView
assert.ok(historyViewSrc.includes('handleRepeatSession(session)'), 'HistoryView includes handleRepeatSession');
assert.ok(historyViewSrc.includes('min-h-[44px]'), 'Repeat button has min-h-[44px]');
assert.ok(historyViewSrc.includes('touch-manipulation'), 'Repeat button has touch-manipulation');
assert.ok(historyViewSrc.includes('focus-visible:ring-2 focus-visible:ring-plate'), 'Repeat button has accessible focus ring');
assert.ok(historyViewSrc.includes('startSessionFromHistory'), 'HistoryView uses startSessionFromHistory');
assert.ok(historyViewSrc.includes("defineEmits(['open-runner'])"), 'HistoryView emits open-runner');

// Assert App.vue listens to open-runner on HistoryView
assert.ok(appSrc.includes('<HistoryView'), 'App mounts HistoryView');
assert.ok(appSrc.includes('@open-runner="isRunnerMinimized = false"'), 'App connects @open-runner on HistoryView');

console.log('  ✓ UI contract and accessibility standards verified.');

// -------------------------------------------------------------
// Test 6: QA Regression: Target preservation ('6-8' vs actual 7),
//         fallback to actualReps when target is absent/empty,
//         and weight fallback (targetWeight = targetWeight ?? weight ?? 0).
// -------------------------------------------------------------
console.log('▶ [6] QA Regression: Target preservation vs actual reps and weight fallbacks...');

const regressionSession = {
  id: 'regression_hist_1',
  dayTitle: 'Target & Weight Regression Session',
  exercises: [
    {
      id: 'bench_press',
      sets: [
        // Case 6.1: Historical target is '6-8', actual reps was 7, weight 80 (no targetWeight specified)
        {
          setIndex: 1,
          type: 'playing',
          target: '6-8',
          actualReps: 7,
          weight: 80,
          done: true
        },
        // Case 6.2: Historical target is missing/null, actual reps was 7, weight 70
        {
          setIndex: 2,
          type: 'playing',
          target: null,
          actualReps: 7,
          weight: 70,
          done: true
        },
        // Case 6.3: Historical target is empty string '', actual reps was 10, weight 60
        {
          setIndex: 3,
          type: 'playing',
          target: '',
          actualReps: 10,
          weight: 60,
          done: true
        },
        // Case 6.4: Explicit targetWeight exists and differs from weight
        {
          setIndex: 4,
          type: 'playing',
          target: '8-10',
          actualReps: 9,
          targetWeight: 85,
          weight: 80,
          done: true
        },
        // Case 6.5: Both target and actualReps missing -> defaults to 8 (or 15 for warm)
        {
          setIndex: 5,
          type: 'warmup',
          weight: 30,
          done: true
        }
      ]
    }
  ]
};

const clonedReg = cloneSessionToActive(regressionSession);
const regSets = clonedReg.exercises[0].sets;

// Verify Case 6.1: target '6-8' preserved, not overwritten by actual reps 7
assert.strictEqual(regSets[0].target, '6-8', 'Case 6.1: target preserves historical "6-8"');
assert.strictEqual(regSets[0].targetReps, '6-8', 'Case 6.1: targetReps preserves historical "6-8"');
assert.notStrictEqual(regSets[0].target, 7, 'Case 6.1: target is NOT 7');
assert.notStrictEqual(regSets[0].targetReps, 7, 'Case 6.1: targetReps is NOT 7');
assert.strictEqual(regSets[0].targetWeight, 80, 'Case 6.1: targetWeight falls back to s.weight (80)');
assert.strictEqual(regSets[0].weight, 80, 'Case 6.1: weight is 80');
assert.strictEqual(regSets[0].reps, 8, 'Case 6.1: working reps prefilled from target upper bound 8');

// Verify Case 6.2: target is null -> falls back to actualReps 7
assert.strictEqual(regSets[1].target, 7, 'Case 6.2: target falls back to actualReps (7)');
assert.strictEqual(regSets[1].targetReps, 7, 'Case 6.2: targetReps falls back to actualReps (7)');
assert.strictEqual(regSets[1].reps, 7, 'Case 6.2: reps is 7');
assert.strictEqual(regSets[1].targetWeight, 70, 'Case 6.2: targetWeight falls back to s.weight (70)');
assert.strictEqual(regSets[1].weight, 70, 'Case 6.2: weight is 70');

// Verify Case 6.3: target is '' -> falls back to actualReps 10
assert.strictEqual(regSets[2].target, 10, 'Case 6.3: empty target falls back to actualReps (10)');
assert.strictEqual(regSets[2].targetReps, 10, 'Case 6.3: targetReps falls back to actualReps (10)');
assert.strictEqual(regSets[2].reps, 10, 'Case 6.3: reps is 10');

// Verify Case 6.4: explicit targetWeight 85 vs weight 80
assert.strictEqual(regSets[3].targetWeight, 85, 'Case 6.4: targetWeight preserves explicit 85');
assert.strictEqual(regSets[3].weight, 80, 'Case 6.4: weight preserves 80');
assert.strictEqual(regSets[3].target, '8-10', 'Case 6.4: target preserves "8-10"');
assert.strictEqual(regSets[3].targetReps, '8-10', 'Case 6.4: targetReps preserves "8-10"');
assert.strictEqual(regSets[3].reps, 10, 'Case 6.4: reps prefilled with 10');

// Verify Case 6.5: Warmup set with no target and no actualReps
assert.strictEqual(regSets[4].type, 'warmup', 'Case 6.5: warmup type identified');
assert.strictEqual(regSets[4].target, 15, 'Case 6.5: target defaults to 15 for warmup');
assert.strictEqual(regSets[4].targetReps, 15, 'Case 6.5: targetReps defaults to 15 for warmup');
assert.strictEqual(regSets[4].reps, 15, 'Case 6.5: reps defaults to 15 for warmup');

console.log('  ✓ Target preservation and weight fallback regression tests passed.');

console.log('\n====================================================');
console.log('🎉 ALL REPEAT WORKOUT TESTS PASSED 100%!');
console.log('====================================================');
