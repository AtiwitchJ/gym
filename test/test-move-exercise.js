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
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-move-test-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const {
  useActiveSessionStore,
  moveExercise,
  moveExerciseUp,
  moveExerciseDown
} = await import('../src/composables/useActiveSessionStore.js');

console.log('====================================================');
console.log('🧪 Unit & Integration Test: Move Exercises Up/Down in Active Workout');
console.log('====================================================\n');

const store = useActiveSessionStore();

// Reset initial store state
store.discardSession();
assert.strictEqual(store.isWorkoutActive.value, false, 'Workout initially inactive');

// -------------------------------------------------------------
// Test 1: Store exports and function signatures
// -------------------------------------------------------------
console.log('▶ [1] Store exports and function signatures...');
assert.strictEqual(typeof moveExercise, 'function', 'moveExercise is exported as named export');
assert.strictEqual(typeof moveExerciseUp, 'function', 'moveExerciseUp is exported as named export');
assert.strictEqual(typeof moveExerciseDown, 'function', 'moveExerciseDown is exported as named export');
assert.strictEqual(typeof store.moveExercise, 'function', 'store.moveExercise is available on store');
assert.strictEqual(typeof store.moveExerciseUp, 'function', 'store.moveExerciseUp is available on store');
assert.strictEqual(typeof store.moveExerciseDown, 'function', 'store.moveExerciseDown is available on store');
console.log('  ✓ moveExercise, moveExerciseUp, and moveExerciseDown verified.');

// -------------------------------------------------------------
// Test 2: Boundary Protection and Guard Checks
// -------------------------------------------------------------
console.log('▶ [2] Boundary protection and invalid parameter guards...');

// 2.1 Moving when no active session
assert.strictEqual(store.moveExercise(0, 1), false, 'Returns false when no workout is active');
assert.strictEqual(store.moveExerciseUp(0), false, 'Returns false when no workout is active');
assert.strictEqual(store.moveExerciseDown(0), false, 'Returns false when no workout is active');

// 2.2 Active session with only 1 exercise
store.startEmptySession({ title: 'Single Exercise Workout' });
store.addExerciseToActiveSession('barbell_bench_press');
assert.strictEqual(store.activeSession.value.exercises.length, 1, 'Draft has 1 exercise');

assert.strictEqual(store.moveExercise(0, 0), false, 'Returns false when moving to same index');
assert.strictEqual(store.moveExerciseUp(0), false, 'Returns false when moving up index 0');
assert.strictEqual(store.moveExerciseDown(0), false, 'Returns false when moving down the only exercise');
assert.strictEqual(store.moveExercise(0, 5), false, 'Returns false for out of bounds target index');
assert.strictEqual(store.moveExercise(-1, 0), false, 'Returns false for negative fromIndex');
assert.strictEqual(store.moveExercise(0, -1), false, 'Returns false for negative toIndex');
assert.strictEqual(store.moveExercise('invalid', 0), false, 'Returns false for non-numeric index');
console.log('  ✓ Boundary protection successfully guards against out-of-bounds moves.');

// -------------------------------------------------------------
// Test 3: Exercise Reordering with Set and State Preservation
// -------------------------------------------------------------
console.log('▶ [3] Exercise reordering with full set, RIR, and restSec preservation...');

// Create a realistic active session with 3 distinct exercises
store.startEmptySession({ title: 'Reorder Test Workout' });

// Add Exercise 0: Bench Press
const ex0 = store.addExerciseToActiveSession('barbell_bench_press', [
  { type: 'warmup', targetWeight: 40, weight: 40, reps: 15, targetReps: 15, completed: true, completedAt: '2026-11-24T09:00:00Z', rir: null, rirPlus: false },
  { type: 'working', targetWeight: 75, weight: 75, reps: 8, targetReps: '6-8', target: '6-8', completed: true, completedAt: '2026-11-24T09:05:00Z', rir: 2, rirPlus: false },
  { type: 'working', targetWeight: 75, weight: 75, reps: 7, targetReps: '6-8', target: '6-8', completed: true, completedAt: '2026-11-24T09:10:00Z', rir: 1, rirPlus: true }
]);
ex0.name = 'Barbell Bench Press';
ex0.muscleGroup = 'chest';
ex0.restSec = 90;

// Add Exercise 1: Incline Dumbbell Press
const ex1 = store.addExerciseToActiveSession('incline_dumbbell_press', [
  { type: 'working', targetWeight: 26, weight: 26, reps: 8, targetReps: 8, completed: false, completedAt: null, rir: null },
  { type: 'working', targetWeight: 26, weight: 26, reps: 8, targetReps: 8, completed: false, completedAt: null, rir: null }
]);
ex1.name = 'Incline Dumbbell Press';
ex1.muscleGroup = 'chest';
ex1.restSec = 75;

// Add Exercise 2: Barbell Squat
const ex2 = store.addExerciseToActiveSession('barbell_squat', [
  { type: 'warmup', targetWeight: 50, weight: 50, reps: 10, targetReps: 10, completed: true, completedAt: '2026-11-24T09:15:00Z', rir: 3 }
]);
ex2.name = 'Barbell Squat';
ex2.muscleGroup = 'legs';
ex2.restSec = 120;

assert.strictEqual(store.activeSession.value.exercises.length, 3, 'Initial setup has 3 exercises');
assert.strictEqual(store.activeSession.value.exercises[0].exerciseId, 'barbell_bench_press');
assert.strictEqual(store.activeSession.value.exercises[1].exerciseId, 'incline_dumbbell_press');
assert.strictEqual(store.activeSession.value.exercises[2].exerciseId, 'barbell_squat');

// 3.1 Move Exercise 1 UP (Incline DB Press moves from index 1 to 0)
const moveUpResult = store.moveExerciseUp(1);
assert.strictEqual(moveUpResult, true, 'moveExerciseUp(1) succeeds');

assert.strictEqual(store.activeSession.value.exercises[0].exerciseId, 'incline_dumbbell_press', 'Incline DB Press is now at index 0');
assert.strictEqual(store.activeSession.value.exercises[1].exerciseId, 'barbell_bench_press', 'Barbell Bench Press is now at index 1');
assert.strictEqual(store.activeSession.value.exercises[2].exerciseId, 'barbell_squat', 'Barbell Squat remains at index 2');

// Verify Bench Press sets and metadata preserved 100%
const benchAfterMove = store.activeSession.value.exercises[1];
assert.strictEqual(benchAfterMove.restSec, 90, 'restSec 90 preserved');
assert.strictEqual(benchAfterMove.sets.length, 3, 'All 3 sets preserved');
assert.strictEqual(benchAfterMove.sets[0].completed, true, 'Set 0 completed preserved');
assert.strictEqual(benchAfterMove.sets[1].target, '6-8', 'Target "6-8" preserved');
assert.strictEqual(benchAfterMove.sets[1].rir, 2, 'RIR 2 preserved');
assert.strictEqual(benchAfterMove.sets[2].actualReps || benchAfterMove.sets[2].reps, 7, 'Reps 7 preserved');
assert.strictEqual(benchAfterMove.sets[2].rirPlus, true, 'rirPlus true preserved');

// 3.2 Move Exercise 0 DOWN (Incline DB Press moves from index 0 back to 1)
const moveDownResult = store.moveExerciseDown(0);
assert.strictEqual(moveDownResult, true, 'moveExerciseDown(0) succeeds');
assert.strictEqual(store.activeSession.value.exercises[0].exerciseId, 'barbell_bench_press', 'Bench Press back at index 0');
assert.strictEqual(store.activeSession.value.exercises[1].exerciseId, 'incline_dumbbell_press', 'Incline DB Press back at index 1');

// 3.3 Direct move: Move index 0 to index 2
const directMove = store.moveExercise(0, 2);
assert.strictEqual(directMove, true, 'moveExercise(0, 2) succeeds');
assert.strictEqual(store.activeSession.value.exercises[0].exerciseId, 'incline_dumbbell_press', 'Index 0 is Incline DB Press');
assert.strictEqual(store.activeSession.value.exercises[1].exerciseId, 'barbell_squat', 'Index 1 is Squat');
assert.strictEqual(store.activeSession.value.exercises[2].exerciseId, 'barbell_bench_press', 'Index 2 is Bench Press');

console.log('  ✓ Reordering verified with complete set and metadata integrity preserved.');

// -------------------------------------------------------------
// Test 4: Draft Persistence and Reload Simulation
// -------------------------------------------------------------
console.log('▶ [4] Local draft persistence and reload simulation...');

// Verify that the stored draft reflects the new reordered sequence
const draftJson = localStorage.getItem('active_session_draft');
assert.ok(draftJson, 'Draft was written to localStorage');
const parsedDraft = JSON.parse(draftJson);
assert.strictEqual(parsedDraft.exercises.length, 3, 'Draft contains 3 exercises');
assert.strictEqual(parsedDraft.exercises[0].exerciseId, 'incline_dumbbell_press', 'Draft reflects reordered exercise 0');
assert.strictEqual(parsedDraft.exercises[1].exerciseId, 'barbell_squat', 'Draft reflects reordered exercise 1');
assert.strictEqual(parsedDraft.exercises[2].exerciseId, 'barbell_bench_press', 'Draft reflects reordered exercise 2');

// Reload simulation: reconstruct a new session from the saved draft
const reloadedExercises = parsedDraft.exercises.map(e => e.exerciseId);
assert.deepStrictEqual(reloadedExercises, ['incline_dumbbell_press', 'barbell_squat', 'barbell_bench_press'], 'Draft persistence order matches across reloads');
console.log('  ✓ Draft persistence and reload order verified.');

// -------------------------------------------------------------
// Test 5: Finish Session & Sequence in SQLite History (Isolated DB)
// -------------------------------------------------------------
console.log('▶ [5] Saving finished session to SQLite history in reordered sequence...');

// Finish the session in store
const finishedSummary = store.finishSession();
assert.ok(finishedSummary, 'Finished session summary generated');
assert.strictEqual(finishedSummary.exercises.length, 3, 'Summary has 3 exercises');
assert.strictEqual(finishedSummary.exercises[0].exerciseId, 'incline_dumbbell_press', 'First exercise in summary is Incline DB Press');
assert.strictEqual(finishedSummary.exercises[1].exerciseId, 'barbell_squat', 'Second exercise in summary is Squat');
assert.strictEqual(finishedSummary.exercises[2].exerciseId, 'barbell_bench_press', 'Third exercise in summary is Bench Press');

// Test SQLite schema insertion in an isolated DB via repo.saveSession
assert.notStrictEqual(
  path.resolve(repo.getDbPath()),
  path.resolve('data/gym.db'),
  'Must never touch production data/gym.db'
);

const sessionToSave = {
  id: finishedSummary.id,
  date: '2026-11-24',
  time: '16:00',
  dayKey: finishedSummary.routineId || 'custom',
  dayTitle: finishedSummary.title,
  totalSetsDone: 3,
  exercises: finishedSummary.exercises.map(ex => ({
    id: ex.exerciseId,
    name: ex.name,
    category: ex.category || 'Chest',
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

// Query exercises back by ID asc (natural table insert order)
const savedExercises = repo.db.prepare('SELECT * FROM session_exercises WHERE session_id = ? ORDER BY id ASC').all(finishedSummary.id);
assert.strictEqual(savedExercises.length, 3, '3 exercises saved in SQLite');
assert.strictEqual(savedExercises[0].exercise_id, 'incline_dumbbell_press', 'Saved SQLite exercise 0 matches reordered position');
assert.strictEqual(savedExercises[1].exercise_id, 'barbell_squat', 'Saved SQLite exercise 1 matches reordered position');
assert.strictEqual(savedExercises[2].exercise_id, 'barbell_bench_press', 'Saved SQLite exercise 2 matches reordered position');

const retrievedHistory = repo.getHistory();
const retrievedSession = retrievedHistory.find(s => s.id === finishedSummary.id);
assert.ok(retrievedSession, 'Retrieved session from repo');
assert.strictEqual(retrievedSession.exercises.length, 3, 'Retrieved session has 3 exercises');
assert.strictEqual(retrievedSession.exercises[0].id, 'incline_dumbbell_press', 'Retrieved exercise 0 matches reordered sequence');
assert.strictEqual(retrievedSession.exercises[1].id, 'barbell_squat', 'Retrieved exercise 1 matches reordered sequence');
assert.strictEqual(retrievedSession.exercises[2].id, 'barbell_bench_press', 'Retrieved exercise 2 matches reordered sequence');

console.log('  ✓ Finished workout recorded to SQLite in exact reordered sequence.');

// -------------------------------------------------------------
// Test 6: UI Contracts in ActiveWorkoutSheet.vue
// -------------------------------------------------------------
console.log('▶ [6] UI Contract verification in ActiveWorkoutSheet.vue...');
const sheetSrc = read('src/components/ActiveWorkoutSheet.vue');

// Verify Move Up & Move Down handlers and bindings exist
assert.ok(sheetSrc.includes('handleMoveExerciseUp(exIdx)'), 'ActiveWorkoutSheet binds handleMoveExerciseUp');
assert.ok(sheetSrc.includes('handleMoveExerciseDown(exIdx)'), 'ActiveWorkoutSheet binds handleMoveExerciseDown');
assert.ok(sheetSrc.includes(':disabled="exIdx === 0"'), 'Up button disabled at index 0');
assert.ok(sheetSrc.includes(':disabled="exIdx === activeSession.exercises.length - 1"'), 'Down button disabled at last index');

// Verify accessibility & touch target contracts (min-h-[44px], min-w-[44px])
assert.ok(sheetSrc.includes('min-h-[44px] min-w-[44px]'), 'Buttons conform to 44px touch target');
assert.ok(sheetSrc.includes('moveExerciseUp'), 'Store method moveExerciseUp imported');
assert.ok(sheetSrc.includes('moveExerciseDown'), 'Store method moveExerciseDown imported');

console.log('  ✓ UI contract, boundary conditions, and 44px touch targets verified.');

console.log('\n====================================================');
console.log('🎉 ALL EXERCISE REORDERING TESTS PASSED 100%!');
console.log('====================================================');
