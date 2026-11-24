import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { useExerciseStore, STANDARD_EQUIPMENT_TYPES } from '../src/composables/useExerciseStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('🧪 QA Test: Exercise Library Equipment Filter (AND Logic & Compatibility)');
console.log('====================================================\n');

const store = useExerciseStore();

// Reset all filters before starting
store.resetFilters();

// -------------------------------------------------------------
// Test 1: Equipment Types and Store Exports
// -------------------------------------------------------------
console.log('▶ [1] Store exports and default equipment constants...');
assert.ok(Array.isArray(STANDARD_EQUIPMENT_TYPES), 'STANDARD_EQUIPMENT_TYPES is exported as an array');
assert.ok(STANDARD_EQUIPMENT_TYPES.includes('barbell'), 'includes barbell');
assert.ok(STANDARD_EQUIPMENT_TYPES.includes('dumbbell'), 'includes dumbbell');
assert.ok(STANDARD_EQUIPMENT_TYPES.includes('cable'), 'includes cable');
assert.ok(STANDARD_EQUIPMENT_TYPES.includes('machine'), 'includes machine');
assert.ok(STANDARD_EQUIPMENT_TYPES.includes('smith_machine'), 'includes smith_machine');
assert.ok(STANDARD_EQUIPMENT_TYPES.includes('bodyweight'), 'includes bodyweight');

assert.ok(store.selectedEquipment, 'selectedEquipment ref is exported');
assert.strictEqual(store.selectedEquipment.value, '', 'Initial selectedEquipment is empty');
assert.strictEqual(typeof store.resetFilters, 'function', 'resetFilters is exported');
console.log('  ✓ Equipment constants and store exports verified.');

// -------------------------------------------------------------
// Test 2: Standard Equipment Filtering
// -------------------------------------------------------------
console.log('▶ [2] Filtering by standard equipment types...');
const totalCount = store.exercises.value.length;
assert.strictEqual(store.filteredExercises.value.length, totalCount, 'Empty filter returns all exercises');

// Barbell
store.selectedEquipment.value = 'barbell';
const barbells = store.filteredExercises.value;
assert.ok(barbells.length > 0, 'Found barbell exercises');
assert.ok(barbells.every(e => (e.equipment || '').toLowerCase() === 'barbell'), 'All barbell exercises have equipment === barbell');

// Dumbbell
store.selectedEquipment.value = 'dumbbell';
const dumbbells = store.filteredExercises.value;
assert.ok(dumbbells.length > 0, 'Found dumbbell exercises');
assert.ok(dumbbells.every(e => (e.equipment || '').toLowerCase() === 'dumbbell'), 'All dumbbell exercises have equipment === dumbbell');

// Cable
store.selectedEquipment.value = 'cable';
const cables = store.filteredExercises.value;
assert.ok(cables.length > 0, 'Found cable exercises');
assert.ok(cables.every(e => (e.equipment || '').toLowerCase() === 'cable'), 'All cable exercises have equipment === cable');

// Machine
store.selectedEquipment.value = 'machine';
const machines = store.filteredExercises.value;
assert.ok(machines.length > 0, 'Found machine exercises');
assert.ok(machines.every(e => (e.equipment || '').toLowerCase() === 'machine'), 'All machine exercises have equipment === machine');

// Smith Machine
store.selectedEquipment.value = 'smith_machine';
const smiths = store.filteredExercises.value;
assert.ok(smiths.length > 0, 'Found smith machine exercises');
assert.ok(smiths.every(e => (e.equipment || '').toLowerCase() === 'smith_machine'), 'All smith exercises have equipment === smith_machine');

// Bodyweight
store.selectedEquipment.value = 'bodyweight';
const bodyweights = store.filteredExercises.value;
assert.ok(bodyweights.length > 0, 'Found bodyweight exercises');
assert.ok(bodyweights.every(e => (e.equipment || '').toLowerCase() === 'bodyweight'), 'All bodyweight exercises have equipment === bodyweight');

console.log('  ✓ Standard equipment filtering verified.');

// -------------------------------------------------------------
// Test 3: Non-standard, Missing, and 'Other' Equipment
// -------------------------------------------------------------
console.log('▶ [3] Non-standard and "other" equipment handling...');
const customKettlebell = store.createCustomExercise({
  name: 'Kettlebell Goblet Squat',
  muscleGroup: 'quads',
  equipment: 'kettlebell',
  notes: 'Custom equipment'
});

const customNoEquip = store.createCustomExercise({
  name: 'Stretching Routine',
  muscleGroup: 'other',
  equipment: '',
  notes: 'No equipment specified'
});

const customOther = store.createCustomExercise({
  name: 'Resistance Band Pull Apart',
  muscleGroup: 'delts',
  equipment: 'other',
  notes: 'Other equipment'
});

store.selectedEquipment.value = 'other';
const others = store.filteredExercises.value;
assert.ok(others.length >= 3, 'Found exercises under other');
assert.ok(others.some(e => e.id === customKettlebell.id), 'Kettlebell matches other');
assert.ok(others.some(e => e.id === customNoEquip.id), 'Empty equipment matches other');
assert.ok(others.some(e => e.id === customOther.id), 'Other equipment matches other');
assert.ok(others.every(e => {
  const eq = (e.equipment || '').toLowerCase().trim();
  return !STANDARD_EQUIPMENT_TYPES.includes(eq) || eq === 'other';
}), 'No standard equipment exercises leak into "other"');
console.log('  ✓ Non-standard and "other" equipment handling verified.');

// -------------------------------------------------------------
// Test 4: Combined AND Filter Logic (Muscle + Equipment + Search)
// -------------------------------------------------------------
console.log('▶ [4] Combined AND logic: Muscle + Equipment + Search query...');
// Case A: Chest + Dumbbell
store.selectedMuscle.value = 'chest';
store.selectedEquipment.value = 'dumbbell';
store.searchQuery.value = '';

const chestDumbbells = store.filteredExercises.value;
assert.ok(chestDumbbells.length > 0, 'Found chest dumbbell exercises');
assert.ok(chestDumbbells.every(e => e.muscleGroup === 'chest' && (e.equipment || '').toLowerCase() === 'dumbbell'),
  'All results strictly match both chest AND dumbbell');

// Case B: Chest + Dumbbell + Search Query "Incline"
store.searchQuery.value = 'incline';
const chestDbIncline = store.filteredExercises.value;
assert.ok(chestDbIncline.length > 0, 'Found incline chest dumbbell exercises');
assert.ok(chestDbIncline.every(e => e.muscleGroup === 'chest' && (e.equipment || '').toLowerCase() === 'dumbbell' && /incline/i.test(e.name)),
  'All results strictly match chest AND dumbbell AND incline');

// Case C: Mutually exclusive AND condition produces empty results
store.selectedMuscle.value = 'back';
store.selectedEquipment.value = 'dumbbell';
store.searchQuery.value = 'bench press'; // Bench press is chest
assert.strictEqual(store.filteredExercises.value.length, 0, 'Mutually exclusive AND conditions return empty array');
console.log('  ✓ Combined AND filtering verified.');

// -------------------------------------------------------------
// Test 5: Reset Filters
// -------------------------------------------------------------
console.log('▶ [5] Reset filters functionality...');
store.resetFilters();
assert.strictEqual(store.selectedMuscle.value, '', 'selectedMuscle reset to empty');
assert.strictEqual(store.selectedEquipment.value, '', 'selectedEquipment reset to empty');
assert.strictEqual(store.searchQuery.value, '', 'searchQuery reset to empty');
assert.strictEqual(store.filteredExercises.value.length, store.exercises.value.length, 'Reset returns all exercises');
console.log('  ✓ Reset filters verified.');

// -------------------------------------------------------------
// Test 6: ExerciseLibraryModal.vue Contract & Accessibility Checks
// -------------------------------------------------------------
console.log('▶ [6] ExerciseLibraryModal.vue UI Contract and Accessibility...');
const modalPath = path.join(root, 'src/components/ExerciseLibraryModal.vue');
const modalSrc = fs.readFileSync(modalPath, 'utf8');

// Filter chips & helpers
assert.ok(modalSrc.includes('equipmentChips'), 'Modal defines equipmentChips');
assert.ok(modalSrc.includes('isEquipmentActive'), 'Modal defines isEquipmentActive');
assert.ok(modalSrc.includes('selectEquipmentFilter'), 'Modal defines selectEquipmentFilter');
assert.ok(modalSrc.includes('selectedEquipment'), 'Modal binds selectedEquipment');
assert.ok(modalSrc.includes('hasActiveFilters'), 'Modal defines hasActiveFilters');
assert.ok(modalSrc.includes('resetFilters'), 'Modal connects resetFilters');

// Thai labels
assert.ok(modalSrc.includes('บาร์เบล') && modalSrc.includes('ดัมเบล') && modalSrc.includes('เคเบิล'), 'Modal has Thai equipment labels');
assert.ok(modalSrc.includes('อุปกรณ์ (Equipment)'), 'Modal has Equipment section header');

// Preservation of existing card badge
assert.ok(modalSrc.includes("exercise.equipment || 'อุปกรณ์ทั่วไป'"), 'Modal preserves existing card equipment tag');

// Accessibility: no forbidden focus:outline-none
assert.ok(!modalSrc.includes('focus:outline-none'), 'No forbidden focus:outline-none');
assert.ok(!modalSrc.includes('text-ink-muted/80'), 'No forbidden text-ink-muted/80');

// All buttons have touch-manipulation and min-h-[44px] (or touch-friendly chip styling)
const buttons = modalSrc.match(/<button\b[\s\S]*?>/g) || [];
assert.ok(buttons.length >= 10, 'Modal has interactive buttons');
for (const btn of buttons) {
  if (btn.includes('selectMuscleFilter') || btn.includes('selectEquipmentFilter') || btn.includes('ล้างทั้งหมด')) {
    assert.ok(btn.includes('min-h-[44px]') || btn.includes('min-h-[36px]'), `Filter button has touch target: ${btn.slice(0, 100)}`);
    assert.ok(btn.includes('touch-manipulation'), `Filter button has touch-manipulation: ${btn.slice(0, 100)}`);
  }
}
console.log('  ✓ ExerciseLibraryModal.vue contract, accessibility, and styling verified.');

console.log('\n====================================================');
console.log('🎉 ALL EQUIPMENT FILTER TESTS PASSED 100%!');
console.log('====================================================');
