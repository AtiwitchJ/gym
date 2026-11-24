import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    clear: () => data.clear(),
    raw: data
  };
}
if (!globalThis.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true, writable: true });
}

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-sub-test-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const {
  useActiveSessionStore,
  substituteExercise
} = await import('../src/composables/useActiveSessionStore.js');

console.log('====================================================');
console.log('🧪 Unit & Integration Test: Exercise Substitution in Active Workout');
console.log('====================================================\n');

const store = useActiveSessionStore();

// Reset initial store state
store.discardSession();
assert.strictEqual(store.isWorkoutActive.value, false, 'Workout initially inactive');

// -------------------------------------------------------------
// Test 1: Store exports and function signatures
// -------------------------------------------------------------
console.log('▶ [1] Store exports and function signatures...');
assert.strictEqual(typeof substituteExercise, 'function', 'substituteExercise is exported as named function');
assert.strictEqual(typeof store.substituteExercise, 'function', 'store.substituteExercise is available on store instance');
console.log('  ✓ substituteExercise function signature verified.');

// -------------------------------------------------------------
// Test 2: Inactive workout and parameter validation guards
// -------------------------------------------------------------
console.log('▶ [2] Validation guards (inactive session, invalid indices, missing data)...');
const noSessionRes = substituteExercise(0, { id: 'dumbbell_bench_press' });
assert.strictEqual(noSessionRes.success, false, 'Refuses substitution when workout inactive');
assert.strictEqual(noSessionRes.reason, 'no_active_workout');

// Start an active test session
store.startEmptySession({ title: 'Test Workout Session' });
assert.strictEqual(store.isWorkoutActive.value, true, 'Active workout started');

// Add 2 initial exercises
store.addExerciseToActiveSession('barbell_bench_press', [
  { type: 'working', targetReps: 8, weight: 80, reps: 8, completed: false },
  { type: 'working', targetReps: 8, weight: 80, reps: 8, completed: false },
  { type: 'working', targetReps: 8, weight: 80, reps: 8, completed: false }
]);
store.addExerciseToActiveSession('incline_dumbbell_press', [
  { type: 'working', targetReps: 10, weight: 26, reps: 10, completed: false }
]);

assert.strictEqual(store.activeSession.value.exercises.length, 2, 'Initial session has 2 exercises');

// Out of bounds tests
const negativeIdxRes = substituteExercise(-1, { id: 'dumbbell_bench_press' });
assert.strictEqual(negativeIdxRes.success, false, 'Negative index refused');

const outOfBoundsRes = substituteExercise(99, { id: 'dumbbell_bench_press' });
assert.strictEqual(outOfBoundsRes.success, false, 'Out-of-bounds index refused');

const missingDataRes = substituteExercise(0, null);
assert.strictEqual(missingDataRes.success, false, 'Missing substitute data refused');

const sameExerciseRes = substituteExercise(0, { id: 'barbell_bench_press' });
assert.strictEqual(sameExerciseRes.success, false, 'Substituting same exercise refused');
console.log('  ✓ Validation guards verified.');

// -------------------------------------------------------------
// Test 3: In-Place Substitution when 0 sets are completed
// -------------------------------------------------------------
console.log('▶ [3] In-place substitution when NO sets are completed...');
// Substitute Incline Dumbbell Press (index 1) with Machine Incline Chest Press
const inPlaceSub = {
  id: 'machine_chest_press',
  name: 'Machine Chest Press',
  equipment: 'machine',
  muscleGroup: 'chest',
  restSec: 90
};

const inPlaceRes = substituteExercise(1, inPlaceSub, { customWeight: 45 });
assert.strictEqual(inPlaceRes.success, true, 'In-place substitution succeeded');
assert.strictEqual(inPlaceRes.mode, 'replaced', 'Mode is replaced');
assert.strictEqual(store.activeSession.value.exercises.length, 2, 'Total exercises count unchanged in in-place replacement');
assert.strictEqual(store.activeSession.value.exercises[1].exerciseId, 'machine_chest_press', 'Exercise ID updated');
assert.strictEqual(store.activeSession.value.exercises[1].name, 'Machine Chest Press', 'Exercise name updated');
assert.strictEqual(store.activeSession.value.exercises[1].equipment, 'machine', 'Equipment updated');
assert.strictEqual(store.activeSession.value.exercises[1].sets[0].weight, 45, 'Custom weight applied to sets');
assert.strictEqual(store.activeSession.value.exercises[1].sets[0].completed, false, 'Completion state remains false');
console.log('  ✓ In-place substitution verified with custom weight.');

// -------------------------------------------------------------
// Test 4: Split Substitution when SOME sets are completed (Preserve History)
// -------------------------------------------------------------
console.log('▶ [4] Split substitution when SOME sets are completed (Completed sets preserved in original exercise)...');
// Exercise 0 is Barbell Bench Press with 3 sets.
// Mark set 0 as completed (80kg x 8 reps).
const benchEx = store.activeSession.value.exercises[0];
benchEx.sets[0].completed = true;
benchEx.sets[0].completedAt = new Date().toISOString();
benchEx.sets[0].rir = 2;
benchEx.sets[0].rirPlus = false;

// Sets 1 and 2 remain uncompleted
assert.strictEqual(benchEx.sets[0].completed, true, 'Set 0 completed');
assert.strictEqual(benchEx.sets[1].completed, false, 'Set 1 uncompleted');
assert.strictEqual(benchEx.sets[2].completed, false, 'Set 2 uncompleted');

// Substitute Barbell Bench Press with Dumbbell Bench Press
const dbBenchSub = {
  id: 'dumbbell_bench_press',
  name: 'Dumbbell Bench Press',
  equipment: 'dumbbell',
  muscleGroup: 'chest',
  restSec: 90
};

// User defines custom weight 24kg per dumbbell (NOT automatic unverified ratio)
const splitRes = substituteExercise(0, dbBenchSub, { customWeight: 24 });
assert.strictEqual(splitRes.success, true, 'Split substitution succeeded');
assert.strictEqual(splitRes.mode, 'split', 'Mode is split');
assert.strictEqual(store.activeSession.value.exercises.length, 3, 'Exercise count increased from 2 to 3');

// Verify original exercise at index 0
const originalAfterSplit = store.activeSession.value.exercises[0];
assert.strictEqual(originalAfterSplit.exerciseId, 'barbell_bench_press', 'Original exerciseId strictly preserved');
assert.strictEqual(originalAfterSplit.name, 'Barbell Bench Press', 'Original name preserved');
assert.strictEqual(originalAfterSplit.sets.length, 1, 'Original exercise trimmed to completed sets only');
assert.strictEqual(originalAfterSplit.sets[0].completed, true, 'Completed set 0 preserved');
assert.strictEqual(originalAfterSplit.sets[0].weight, 80, 'Original weight 80kg preserved');
assert.strictEqual(originalAfterSplit.sets[0].rir, 2, 'Original RIR preserved');

// Verify newly created substituted exercise at index 1
const newExAfterSplit = store.activeSession.value.exercises[1];
assert.strictEqual(newExAfterSplit.exerciseId, 'dumbbell_bench_press', 'New exercise has substitute ID');
assert.strictEqual(newExAfterSplit.name, 'Dumbbell Bench Press', 'New exercise has substitute name');
assert.strictEqual(newExAfterSplit.equipment, 'dumbbell', 'New exercise has substitute equipment');
assert.strictEqual(newExAfterSplit.sets.length, 2, 'New exercise has the 2 remaining sets');
assert.strictEqual(newExAfterSplit.sets[0].completed, false, 'New sets are uncompleted');
assert.strictEqual(newExAfterSplit.sets[0].weight, 24, 'User-defined weight 24kg applied to new sets');
assert.strictEqual(newExAfterSplit.sets[1].weight, 24, 'User-defined weight 24kg applied to second set');

// Verify index 2 is still Machine Chest Press
assert.strictEqual(store.activeSession.value.exercises[2].exerciseId, 'machine_chest_press', 'Next exercise retained at index 2');
console.log('  ✓ Split substitution verified: original exercise retained completed sets, new exercise created for remaining sets.');

// -------------------------------------------------------------
// Test 5: Guard Refusing Substitution when ALL sets are completed
// -------------------------------------------------------------
console.log('▶ [5] Refusing substitution when ALL sets are completed...');
// Exercise 0 now has only 1 set, and it is completed
const allDoneRes = substituteExercise(0, { id: 'push_ups', name: 'Push Ups' });
assert.strictEqual(allDoneRes.success, false, 'Refused substitution when all sets completed');
assert.strictEqual(allDoneRes.reason, 'all_sets_completed', 'Reason matches all_sets_completed');
console.log('  ✓ Prevention of substitution on fully completed exercises verified.');

// -------------------------------------------------------------
// Test 6: Draft Persistence & Reload Simulation
// -------------------------------------------------------------
console.log('▶ [6] Local draft persistence and reload simulation...');
const draftJson = localStorage.getItem('active_session_draft');
assert.ok(draftJson, 'Draft was written to localStorage');
const parsedDraft = JSON.parse(draftJson);
assert.strictEqual(parsedDraft.exercises.length, 3, 'Draft contains 3 exercises');
assert.strictEqual(parsedDraft.exercises[0].exerciseId, 'barbell_bench_press', 'Draft has barbell_bench_press at index 0');
assert.strictEqual(parsedDraft.exercises[0].sets[0].completed, true, 'Draft has completed set in exercise 0');
assert.strictEqual(parsedDraft.exercises[1].exerciseId, 'dumbbell_bench_press', 'Draft has dumbbell_bench_press at index 1');
assert.strictEqual(parsedDraft.exercises[1].sets[0].weight, 24, 'Draft has user-defined weight in exercise 1');
assert.strictEqual(parsedDraft.exercises[2].exerciseId, 'machine_chest_press', 'Draft has machine_chest_press at index 2');
console.log('  ✓ Draft persistence and reload simulation confirmed 100%.');

// -------------------------------------------------------------
// Test 7: Finish Session & Recording into Isolated SQLite Database
// -------------------------------------------------------------
console.log('▶ [7] SQLite history recording with original & substituted exercises preserved...');
// Complete 1 set on Dumbbell Bench Press as well
store.activeSession.value.exercises[1].sets[0].completed = true;
store.activeSession.value.exercises[1].sets[0].completedAt = new Date().toISOString();

// Finish session in store
const finishedSummary = store.finishSession();
assert.ok(finishedSummary, 'Finished session summary generated');
assert.strictEqual(finishedSummary.exercises.length, 3, 'Summary includes all 3 exercises');

// Save to isolated SQLite DB via repo.saveSession
assert.notStrictEqual(
  path.resolve(repo.getDbPath()),
  path.resolve('data/gym.db'),
  'Must never touch production data/gym.db'
);

const sessionToSave = {
  id: finishedSummary.id,
  date: '2026-11-24',
  time: '17:00',
  dayKey: 'custom_sub_test',
  dayTitle: finishedSummary.title,
  totalSetsDone: 2,
  exercises: finishedSummary.exercises.map(ex => ({
    id: ex.exerciseId,
    name: ex.name,
    category: ex.category || ex.muscleGroup || 'chest',
    sets: ex.sets.map((s, idx) => ({
      setIndex: idx + 1,
      type: s.type,
      target: String(s.target || s.reps || 8),
      weight: s.weight,
      actualReps: s.reps,
      done: s.completed ? 1 : 0,
      rir: s.rir,
      rirPlus: s.rirPlus ? 1 : 0
    }))
  }))
};

repo.saveSession(sessionToSave);

// Verify records in session_exercises table
const savedExercises = repo.db.prepare('SELECT * FROM session_exercises WHERE session_id = ? ORDER BY id ASC').all(finishedSummary.id);
assert.strictEqual(savedExercises.length, 3, '3 exercises recorded in SQLite database');
assert.strictEqual(savedExercises[0].exercise_id, 'barbell_bench_press', 'Exercise #1 is barbell_bench_press with original ID');
assert.strictEqual(savedExercises[1].exercise_id, 'dumbbell_bench_press', 'Exercise #2 is dumbbell_bench_press');
assert.strictEqual(savedExercises[2].exercise_id, 'machine_chest_press', 'Exercise #3 is machine_chest_press');

// Verify sets recorded for barbell_bench_press
const benchSets = repo.db.prepare('SELECT * FROM session_sets WHERE session_exercise_id = ?').all(savedExercises[0].id);
assert.strictEqual(benchSets.length, 1, 'barbell_bench_press has exactly 1 completed set recorded');
assert.strictEqual(benchSets[0].weight, 80, 'barbell_bench_press set recorded with original 80kg');

// Verify sets recorded for dumbbell_bench_press
const dbSets = repo.db.prepare('SELECT * FROM session_sets WHERE session_exercise_id = ?').all(savedExercises[1].id);
assert.strictEqual(dbSets.length, 2, 'dumbbell_bench_press has 2 sets recorded');
assert.strictEqual(dbSets[0].weight, 24, 'dumbbell_bench_press set 1 has user weight 24kg');

console.log('  ✓ SQLite history saved with accurate exercise IDs, separated sets, and user-defined weights.');

// -------------------------------------------------------------
// Test 8: UI Contracts in ActiveWorkoutSheet.vue and ExerciseSubstitutionModal.vue
// -------------------------------------------------------------
console.log('▶ [8] UI contracts verification (44px touch targets, bindings, manual weight input)...');
const sheetSrc = read('src/components/ActiveWorkoutSheet.vue');
const modalSrc = read('src/components/ExerciseSubstitutionModal.vue');

// Verify ActiveWorkoutSheet has substitute button with boundary guards
assert.ok(sheetSrc.includes('openSubstituteModal(exIdx)'), 'ActiveWorkoutSheet binds openSubstituteModal');
assert.ok(sheetSrc.includes(':disabled="isAllSetsDone(exercise)"'), 'Substitute button disabled when all sets completed');
assert.ok(sheetSrc.includes('min-h-[44px] min-w-[44px]'), 'Buttons meet 44px touch target contract');
assert.ok(sheetSrc.includes('<ExerciseSubstitutionModal'), 'ExerciseSubstitutionModal is embedded in ActiveWorkoutSheet');
assert.ok(sheetSrc.includes('mode="active_session"'), 'Modal passed mode="active_session"');
assert.ok(sheetSrc.includes('substituteExercise'), 'Store substituteExercise imported');

// Verify ExerciseSubstitutionModal has user-defined weight input and active session alert
assert.ok(modalSrc.includes('customWeightInput'), 'Modal includes customWeightInput for manual weight entry');
assert.ok(modalSrc.includes('mode === \'active_session\''), 'Modal checks mode === active_session');
assert.ok(modalSrc.includes('confirm-active'), 'Modal emits confirm-active');
assert.ok(modalSrc.includes('ผู้ใช้กำหนดเอง (ไม่แปลงอัตโนมัติ)'), 'Modal states user defined weight (no unverified conversion)');

console.log('  ✓ UI contracts verified 100%.');

console.log('\n====================================================');
console.log('🎉 ALL EXERCISE SUBSTITUTION TESTS PASSED 100%!');
console.log('====================================================');
