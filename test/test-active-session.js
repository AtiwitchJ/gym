import assert from 'node:assert';
import { useActiveSessionStore } from '../src/composables/useActiveSessionStore.js';
import { useTimer } from '../src/composables/useTimer.js';

console.log('Testing Active Session Store...');
const store = useActiveSessionStore();
const timer = useTimer();

// Reset any state before starting
store.discardSession();
assert(store.isWorkoutActive.value === false, 'Workout should initially be inactive');
assert(store.activeSession.value === null, 'Active session should initially be null');

// Test 1: Start session from routine
const routine = {
  id: 'test_routine_1',
  title: 'Chest & Triceps Hypertrophy',
  exercises: [
    {
      exerciseId: 'barbell_bench_press',
      restSec: 90,
      sets: [
        { type: 'warmup', targetReps: 15, targetWeight: 40 },
        { type: 'working', targetReps: 8, targetWeight: 70 },
        { type: 'working', targetReps: 8, targetWeight: 70 }
      ]
    }
  ]
};

store.startSessionFromRoutine(routine);
assert(store.isWorkoutActive.value === true, 'Workout should be active');
assert(store.activeSession.value !== null, 'Active session should be populated');
assert.strictEqual(store.activeSession.value.title, 'Chest & Triceps Hypertrophy', 'Title matches routine');
assert.strictEqual(store.activeSession.value.exercises.length, 1, 'Should have 1 exercise');
assert.strictEqual(store.activeSession.value.exercises[0].sets.length, 3, 'Should have 3 sets');
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].completed, false, 'Initial set completed is false');

// Test 2: Add exercise to active session
store.addExerciseToActiveSession('cable_crossover');
assert.strictEqual(store.activeSession.value.exercises.length, 2, 'Should have 2 exercises after adding');
assert.strictEqual(store.activeSession.value.exercises[1].exerciseId, 'cable_crossover', 'Exercise ID matches');
assert(store.activeSession.value.exercises[1].sets.length >= 1, 'New exercise should have default set');

// Test 3: Add set and remove set
const initialSetCount = store.activeSession.value.exercises[1].sets.length;
store.addSet(1);
assert.strictEqual(store.activeSession.value.exercises[1].sets.length, initialSetCount + 1, 'Set count increased');
store.removeSet(1, initialSetCount);
assert.strictEqual(store.activeSession.value.exercises[1].sets.length, initialSetCount, 'Set count decreased back');

// Test 4: Remove exercise from active session
store.removeExerciseFromActiveSession(1);
assert.strictEqual(store.activeSession.value.exercises.length, 1, 'Should have 1 exercise after removal');

// Test 5: updateSetMetric and toggleSetComplete
store.updateSetMetric(0, 0, 'weight', 40);
store.updateSetMetric(0, 0, 'reps', 15);
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].weight, 40, 'Weight updated');
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].reps, 15, 'Reps updated');

// Toggle complete set 0 (warmup)
store.toggleSetComplete(0, 0);
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].completed, true, 'Set 0 should be completed');
assert(timer.isRunning.value === true, 'Timer should automatically start when set completes');
timer.pauseTimer();

// Complete working sets for volume verification
// Set 1: working, 70kg x 8 reps
store.updateSetMetric(0, 1, 'weight', 70);
store.updateSetMetric(0, 1, 'reps', 8);
store.toggleSetComplete(0, 1);
timer.pauseTimer();

// Set 2: working, 70kg x 8 reps
store.updateSetMetric(0, 2, 'weight', 70);
store.updateSetMetric(0, 2, 'reps', 8);
store.toggleSetComplete(0, 2);
timer.pauseTimer();

// Test 6: Volume calculation
// Only working/drop/failure sets count toward working volume: 70*8 + 70*8 = 1120 kg.
// (Warmup 40*15 = 600 kg is warmup, total working volume = 1120).
assert.strictEqual(store.activeSession.value.exercises[0].sets[1].completed, true, 'Working set 1 completed');
assert.strictEqual(store.activeSession.value.exercises[0].sets[2].completed, true, 'Working set 2 completed');

// Test 7: Finish session
const summary = store.finishSession();
assert(summary !== null, 'Summary should be returned');
assert.strictEqual(summary.routineId, 'test_routine_1', 'Summary retains routineId');
assert.strictEqual(summary.totalVolumeKg, 1120, `Working volume should be 1120kg, got ${summary.totalVolumeKg}`);
assert.strictEqual(store.isWorkoutActive.value, false, 'Workout should no longer be active');
assert.strictEqual(store.activeSession.value, null, 'Active session should be null after finish');

// Test 8: Start empty session and discard
store.startEmptySession();
assert.strictEqual(store.isWorkoutActive.value, true, 'Empty session is active');
assert(store.activeSession.value.exercises.length === 0, 'Empty session has 0 exercises initially');
store.addExerciseToActiveSession('push_up');
assert.strictEqual(store.activeSession.value.exercises.length, 1, 'Can add exercise to empty session');

store.discardSession();
assert.strictEqual(store.isWorkoutActive.value, false, 'Workout inactive after discard');
assert.strictEqual(store.activeSession.value, null, 'Active session is null after discard');

// Test 9: Progressive overload advisor integration
// When previous session has weights and reps, recommended weight should be calculated
const previousHistory = [
  {
    routineId: 'test_routine_1',
    finishedAt: new Date().toISOString(),
    exercises: [
      {
        exerciseId: 'barbell_bench_press',
        sets: [
          { type: 'working', weight: 70, reps: 10, completed: true } // > 8 reps -> +2 kg
        ]
      }
    ]
  }
];

// Start routine again with history context
store.startSessionFromRoutine(routine, { history: previousHistory });
const recommendedSet = store.activeSession.value.exercises[0].sets[1];
assert(recommendedSet.suggestedWeight !== undefined, 'Suggested weight should be provided');
assert.strictEqual(recommendedSet.suggestedWeight, 72, `Suggested weight should be 72 kg (+2kg for 10 reps), got ${recommendedSet.suggestedWeight}`);
store.discardSession();

console.log('✓ All Active Session Store tests passed successfully!');
