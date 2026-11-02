import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { useExerciseStore } from '../src/composables/useExerciseStore.js';
import { useRoutineStore } from '../src/composables/useRoutineStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing Exercise Library & Routine Builder Modals Contract...');

// 1. Verify component files exist and have required template elements
const exModalPath = path.resolve(__dirname, '../src/components/ExerciseLibraryModal.vue');
const routineModalPath = path.resolve(__dirname, '../src/components/RoutineBuilderModal.vue');

assert(fs.existsSync(exModalPath), 'ExerciseLibraryModal.vue should exist');
assert(fs.existsSync(routineModalPath), 'RoutineBuilderModal.vue should exist');

const exModalContent = fs.readFileSync(exModalPath, 'utf8');
const routineModalContent = fs.readFileSync(routineModalPath, 'utf8');

// Verify ExerciseLibraryModal features
assert(exModalContent.includes('isOpen'), 'ExerciseLibraryModal accepts isOpen prop');
assert(exModalContent.includes('mode'), 'ExerciseLibraryModal accepts mode prop');
assert(exModalContent.includes('emit(\'close\')') || exModalContent.includes('emit("close")'), 'ExerciseLibraryModal emits close');
assert(exModalContent.includes('emit(\'select\'') || exModalContent.includes('emit("select"'), 'ExerciseLibraryModal emits select');
assert(exModalContent.includes('searchQuery'), 'ExerciseLibraryModal provides search input');
assert(exModalContent.includes('muscleChips'), 'ExerciseLibraryModal includes muscle filter chips');
assert(exModalContent.includes('createCustomExercise'), 'ExerciseLibraryModal integrates custom exercise creation');

// Verify RoutineBuilderModal features
assert(routineModalContent.includes('isOpen'), 'RoutineBuilderModal accepts isOpen prop');
assert(routineModalContent.includes('initialRoutine'), 'RoutineBuilderModal accepts initialRoutine prop');
assert(routineModalContent.includes('emit(\'close\')') || routineModalContent.includes('emit("close")'), 'RoutineBuilderModal emits close');
assert(routineModalContent.includes('emit(\'saved\'') || routineModalContent.includes('emit("saved"'), 'RoutineBuilderModal emits saved');
assert(routineModalContent.includes('ExerciseLibraryModal'), 'RoutineBuilderModal embeds ExerciseLibraryModal in picker mode');
assert(routineModalContent.includes('addSet'), 'RoutineBuilderModal supports adding sets');
assert(routineModalContent.includes('removeSet'), 'RoutineBuilderModal supports removing sets');
assert(routineModalContent.includes('removeExercise'), 'RoutineBuilderModal supports removing exercises');

// 2. Test Store Operations Driven by the Modals
const exerciseStore = useExerciseStore();
const routineStore = useRoutineStore();

// Custom Exercise Creation flow
const customEx = exerciseStore.createCustomExercise({
  name: 'Standing Overhead Cable Curl',
  muscleGroup: 'arms',
  equipment: 'cable',
  notes: 'High pulley position with dual D-handles'
});

assert(customEx.id && customEx.isCustom === true, 'Custom exercise created with isCustom=true');
assert.strictEqual(customEx.name, 'Standing Overhead Cable Curl', 'Custom exercise name matches');

// Verify custom exercise is retrievable by ID
const fetchedEx = exerciseStore.getExerciseById(customEx.id);
assert(fetchedEx !== null && fetchedEx.id === customEx.id, 'Created exercise is in catalog');

// Verify filter by muscle
exerciseStore.selectedMuscle.value = 'arms';
assert(
  exerciseStore.filteredExercises.value.some(e => e.id === customEx.id),
  'Exercise appears in filtered arms list'
);

// Verify search query filter
exerciseStore.selectedMuscle.value = '';
exerciseStore.searchQuery.value = 'Overhead Cable';
assert(
  exerciseStore.filteredExercises.value.some(e => e.id === customEx.id),
  'Exercise matches search query'
);
exerciseStore.searchQuery.value = '';

// Routine Builder Flow: Creating a routine with the custom exercise + multi-set configurations
const createdRoutine = routineStore.createRoutine({
  title: 'Custom Arm & Chest Blast',
  subtitle: 'Superset Focus',
  exercises: [
    {
      exerciseId: customEx.id,
      sets: [
        { type: 'warmup', targetReps: 15, targetWeight: 15 },
        { type: 'working', targetReps: 10, targetWeight: 25 },
        { type: 'dropset', targetReps: 12, targetWeight: 17.5 },
        { type: 'failure', targetReps: 10, targetWeight: 12.5 }
      ]
    }
  ]
});

assert(createdRoutine.id, 'Routine created with unique id');
assert.strictEqual(createdRoutine.title, 'Custom Arm & Chest Blast', 'Title matches');
assert.strictEqual(createdRoutine.exercises.length, 1, 'Routine has 1 exercise');
assert.strictEqual(createdRoutine.exercises[0].sets.length, 4, 'Routine exercise has 4 sets');
assert.strictEqual(createdRoutine.exercises[0].sets[0].type, 'warmup', 'Set 1 is warmup');
assert.strictEqual(createdRoutine.exercises[0].sets[1].type, 'working', 'Set 2 is working');
assert.strictEqual(createdRoutine.exercises[0].sets[2].type, 'dropset', 'Set 3 is dropset');
assert.strictEqual(createdRoutine.exercises[0].sets[3].type, 'failure', 'Set 4 is failure');

// Clean up created routine
routineStore.deleteRoutine(createdRoutine.id);
assert(routineStore.getRoutineById(createdRoutine.id) === null, 'Routine successfully cleaned up');

console.log('✓ All Exercise Library & Routine Builder contract tests passed successfully!');
