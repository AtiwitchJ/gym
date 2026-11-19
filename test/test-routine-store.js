import assert from 'node:assert';
import { useRoutineStore } from '../src/composables/useRoutineStore.js';
import { useExerciseStore } from '../src/composables/useExerciseStore.js';

console.log('Testing Routine Store...');
const store = useRoutineStore();
const exerciseStore = useExerciseStore();

// Test 1: Has default routines (3-Day A/B split: Program A and Program B only)
assert(store.routines.value.length >= 2, 'Should load Program A and Program B routines');
const defaultIds = store.routines.value.map(r => r.id);
assert(defaultIds.includes('atiwitch_prog_a'), 'Should have Program A routine');
assert(defaultIds.includes('atiwitch_prog_b'), 'Should have Program B routine');
for (const retired of ['atiwitch_mon_legs', 'atiwitch_tue_chest', 'atiwitch_wed_back', 'atiwitch_thu_shoulders']) {
  assert(!defaultIds.includes(retired), `Retired routine ${retired} must not be listed`);
}

// Test 2: Create a custom routine
const newRoutine = store.createRoutine({
  title: 'Upper Hypertrophy A',
  subtitle: 'Chest & Back Focus',
  exercises: [
    {
      exerciseId: 'barbell_bench_press',
      sets: [
        { type: 'warmup', targetReps: 15, targetWeight: 40 },
        { type: 'working', targetReps: 8, targetWeight: 70 },
        { type: 'working', targetReps: 8, targetWeight: 70 },
        { type: 'working', targetReps: 8, targetWeight: 70 }
      ]
    }
  ]
});
assert(newRoutine.id && newRoutine.title === 'Upper Hypertrophy A', 'Routine created');
assert(newRoutine.exercises[0].sets.length === 4, 'Should have 4 configured sets');
assert(newRoutine.exercises[0].sets[0].type === 'warmup', 'First set should be warmup');
assert(store.routines.value.some(r => r.id === newRoutine.id), 'Created routine is in routines list');

// Test 3: Get routine by ID
const fetched = store.getRoutineById(newRoutine.id);
assert(fetched !== null && fetched.title === 'Upper Hypertrophy A', 'Should fetch routine by ID');

// Test 4: Update routine
const updated = store.updateRoutine(newRoutine.id, {
  title: 'Upper Hypertrophy A (Updated)',
  subtitle: 'Heavy Focus'
});
assert(updated.title === 'Upper Hypertrophy A (Updated)', 'Should update routine title');
assert(updated.subtitle === 'Heavy Focus', 'Should update routine subtitle');
assert(store.getRoutineById(newRoutine.id).title === 'Upper Hypertrophy A (Updated)', 'Store reflects updated title');

// Test 5: Active routine selection
store.activeRoutine.value = updated;
assert(store.activeRoutine.value.id === newRoutine.id, 'Should set active routine');

// Test 6: Delete routine
const deleted = store.deleteRoutine(newRoutine.id);
assert(deleted === true, 'Delete operation should return true');
assert(store.getRoutineById(newRoutine.id) === null, 'Routine should no longer exist in store');
assert(store.activeRoutine.value === null, 'Active routine should be cleared if deleted');

// Test 7: Clone default routines
const cloned = store.cloneDefaultRoutines();
assert(Array.isArray(cloned) && cloned.length >= 2, 'cloneDefaultRoutines should return default routines array');
assert(cloned !== store.routines.value, 'Cloned routines should be a new array reference');

// Test 8: Integration with exercise store
const monLegs = store.getRoutineById('atiwitch_prog_a');
assert(monLegs !== null, 'Should get Program A routine');
assert(monLegs.exercises.length > 0, 'Monday routine should have exercises');
for (const ex of monLegs.exercises) {
  const resolved = exerciseStore.getExerciseById(ex.exerciseId);
  assert(resolved !== null, `Exercise ID ${ex.exerciseId} should exist in exercise catalog`);
  assert(ex.sets.length > 0, 'Each exercise should have configured sets');
  assert(ex.sets[0].type === 'warmup', 'First set should be warmup');
}

console.log('✓ All Routine Store tests passed successfully!');
