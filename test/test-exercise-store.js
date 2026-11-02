import assert from 'node:assert';
import { useExerciseStore } from '../src/composables/useExerciseStore.js';

console.log('Testing Exercise Store...');
const store = useExerciseStore();

// Test 1: Pre-loaded exercises count > 30
assert(store.exercises.value.length >= 30, 'Should load pre-seeded exercise library');

// Test 2: Filter by muscle
store.selectedMuscle.value = 'chest';
assert(store.filteredExercises.value.length > 0, 'Should find chest exercises');
assert(store.filteredExercises.value.every(e => e.muscleGroup === 'chest'), 'Should filter exercises by chest');

// Test 3: Create custom exercise
const custom = store.createCustomExercise({
  name: 'Cable Fly High-to-Low',
  muscleGroup: 'chest',
  equipment: 'cable',
  notes: 'Squeeze at bottom'
});
assert(custom.id && custom.isCustom === true, 'Custom exercise should have id and isCustom flag');
assert(store.getExerciseById(custom.id).name === 'Cable Fly High-to-Low', 'Should retrieve created custom exercise');

// Test 4: Search query filter
store.selectedMuscle.value = '';
store.searchQuery.value = 'bench press';
assert(store.filteredExercises.value.length > 0, 'Should find exercises matching "bench press"');
assert(store.filteredExercises.value.some(e => e.id === 'barbell_bench_press'), 'Should include barbell bench press in search');

// Test 5: Retrieve standard catalog exercise by ID
const bench = store.getExerciseById('barbell_bench_press');
assert(bench !== null && bench.name === 'Barbell Bench Press', 'Should retrieve default exercise by ID');
assert(bench.isCustom === false, 'Default exercise should have isCustom: false');

// Test 6: Non-existent ID returns null
assert(store.getExerciseById('unknown_id_xyz') === null, 'Unknown ID should return null');

// Reset filters
store.selectedMuscle.value = '';
store.searchQuery.value = '';

console.log('✓ All Exercise Store tests passed successfully!');
