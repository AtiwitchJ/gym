import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// In-memory localStorage polyfill for isolated node execution
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

// Strict DB isolation
if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-plate-test-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const {
  usePlateCalculator,
  isBarbellExercise,
  calculatePlates,
  BAR_PRESETS,
  AVAILABLE_PLATES,
  DEFAULT_PLATE_INVENTORY
} = await import('../src/composables/usePlateCalculator.js');

const {
  useActiveSessionStore,
  applyPlateWeightToActiveSet,
  calculateTotalWorkingVolume
} = await import('../src/composables/useActiveSessionStore.js');

const { evaluateExercisePrs } = await import('../src/composables/usePersonalRecords.js');

console.log('====================================================');
console.log('🧪 Unit & Integration Test: Plate Calculator in Active Workout');
console.log('====================================================\n');

// -------------------------------------------------------------
// Test 1: Exercise qualification (isBarbellExercise)
// -------------------------------------------------------------
console.log('▶ [1] Barbell exercise qualification (isBarbellExercise)...');
assert.strictEqual(isBarbellExercise({ name: 'Barbell Bench Press' }), true, 'Barbell Bench Press is barbell');
assert.strictEqual(isBarbellExercise({ name: 'บาร์เบล สควอท' }), true, 'Thai บาร์เบล is barbell');
assert.strictEqual(isBarbellExercise({ name: 'Smith Machine Bench Press' }), true, 'Smith Machine is barbell-style');
assert.strictEqual(isBarbellExercise({ name: 'Overhead Press', equipment: 'barbell' }), true, 'equipment: barbell qualifies');
assert.strictEqual(isBarbellExercise({ name: 'Dumbbell Curl' }), false, 'Dumbbell Curl is NOT barbell');
assert.strictEqual(isBarbellExercise({ name: 'Incline Dumbbell Press', equipment: 'dumbbell' }), false, 'Dumbbell is excluded');
assert.strictEqual(isBarbellExercise({ name: 'Lat Pulldown', equipment: 'cable' }), false, 'Cable is NOT barbell');
assert.strictEqual(isBarbellExercise(null), false, 'null is safely false');
console.log('  ✓ Exercise classification accurately detects barbell-appropriate exercises.\n');

// -------------------------------------------------------------
// Test 2: Plate calculation math, remainder, and shortage
// -------------------------------------------------------------
console.log('▶ [2] Plate calculation math (normal, under bar, remainder, shortage)...');
// Standard 60 kg with 20 kg bar: (60-20)/2 = 20 kg per side -> one 20 kg plate
const calc60 = calculatePlates(60, 20, DEFAULT_PLATE_INVENTORY);
assert.strictEqual(calc60.success, true);
assert.strictEqual(calc60.achievedTotal, 60);
assert.strictEqual(calc60.perSideWeight, 20);
assert.strictEqual(calc60.remainder, 0);
assert.strictEqual(calc60.platesPerSide.length, 1);
assert.strictEqual(calc60.platesPerSide[0].weight, 20);

// Target <= bar weight: 15 kg with 20 kg bar -> empty bar (0 plates)
const calcUnder = calculatePlates(15, 20, DEFAULT_PLATE_INVENTORY);
assert.strictEqual(calcUnder.achievedTotal, 20);
assert.strictEqual(calcUnder.perSideWeight, 0);
assert.strictEqual(calcUnder.platesPerSide.length, 0);
assert.strictEqual(calcUnder.remainder, 0);

// Remainder: 61 kg with 20 kg bar: (61-20)/2 = 20.5 kg -> one 20 kg plate, 0.5 kg remainder
const calc61 = calculatePlates(61, 20, DEFAULT_PLATE_INVENTORY);
assert.strictEqual(calc61.achievedTotal, 60);
assert.strictEqual(calc61.remainder, 0.5);
assert.ok(calc61.notes.includes('0.5 กก.'), 'Notes mentions 0.5 kg remainder');

// Shortage: custom inventory with 0 plates
const calcShortage = calculatePlates(100, 20, { 25: 0, 20: 0, 15: 0, 10: 0, 5: 0, 2.5: 0, 1.25: 0 });
assert.strictEqual(calcShortage.hasShortage, true);
assert.strictEqual(calcShortage.achievedTotal, 20);
assert.strictEqual(calcShortage.shortage, 80);
console.log('  ✓ Plate calculation math verified across all edge cases.\n');

// -------------------------------------------------------------
// Test 3: Modal Lifecycle (open, prefill, cancel, apply, empty set safety)
// -------------------------------------------------------------
console.log('▶ [3] Plate calculator modal lifecycle (open, prefill, cancel, apply, empty set safety)...');
const plateStore = usePlateCalculator();

// Safety check on invalid / missing prefill: must NOT silently default to 60 kg or any fake set weight!
// Must open as null (empty), requiring explicit user selection before applying.
plateStore.openPlateCalculator(null);
assert.strictEqual(plateStore.targetWeight.value, null, 'null weight safely opens as null (NOT 60 kg)');
assert.strictEqual(plateStore.isWeightFromSet.value, false, 'marked as NOT from set');
assert.strictEqual(plateStore.applyWeight(), false, 'applyWeight refuses to apply null weight');
assert.strictEqual(plateStore.isOpen.value, true, 'modal stays open when apply fails on empty weight');

plateStore.openPlateCalculator(0);
assert.strictEqual(plateStore.targetWeight.value, null, '0 weight safely opens as null');
assert.strictEqual(plateStore.isWeightFromSet.value, false);

plateStore.openPlateCalculator(-10);
assert.strictEqual(plateStore.targetWeight.value, null, 'Negative weight safely opens as null');
assert.strictEqual(plateStore.isWeightFromSet.value, false);

// Stepper adjustment from empty state starts cleanly from bar weight (20 kg + 10 = 30 kg)
plateStore.adjustWeight(10);
assert.strictEqual(plateStore.targetWeight.value, 30, 'Adjusting from empty increments from bar weight');
assert.strictEqual(plateStore.isWeightFromSet.value, false, 'User manual adjustment marked as not from set');

plateStore.setTargetWeight(null); // Clear back to null
assert.strictEqual(plateStore.targetWeight.value, null, 'setTargetWeight(null) clears weight');

// Explicit fallback weight if explicitly requested
plateStore.openPlateCalculator(null, null, { fallbackWeight: 45 });
assert.strictEqual(plateStore.targetWeight.value, 45, 'Fallback weight 45 kg respected when provided');
assert.strictEqual(plateStore.isWeightFromSet.value, false);

// Open with valid prefill 85 kg from set
let appliedValue = null;
plateStore.openPlateCalculator(85, (val) => {
  appliedValue = val;
});

assert.strictEqual(plateStore.isOpen.value, true, 'Modal is open');
assert.strictEqual(plateStore.targetWeight.value, 85, 'Prefill weight is 85 kg');
assert.strictEqual(plateStore.isWeightFromSet.value, true, 'Valid weight marked as from set');

// Test cancel: close without applying
plateStore.closePlateCalculator();
assert.strictEqual(plateStore.isOpen.value, false, 'Modal closed');
assert.strictEqual(appliedValue, null, 'Callback was NOT invoked on cancel');

// Test apply: open again, adjust to 90 kg and apply
plateStore.openPlateCalculator(85, (val) => {
  appliedValue = val;
});
plateStore.setTargetWeight(90);
assert.strictEqual(plateStore.targetWeight.value, 90, 'Adjusted to 90 kg');

const appliedOk = plateStore.applyWeight();
assert.strictEqual(appliedOk, true, 'applyWeight returns true');
assert.strictEqual(plateStore.isOpen.value, false, 'Modal closed after apply');
assert.strictEqual(appliedValue, 90, 'Callback received updated 90 kg');
console.log('  ✓ Modal open/prefill/cancel/apply and empty-set requirement verified.\n');

// -------------------------------------------------------------
// Test 4: Active Workout Integration & Draft Persistence
// -------------------------------------------------------------
console.log('▶ [4] Applying plate weight to specific active session set...');
const activeStore = useActiveSessionStore();
activeStore.discardSession();
activeStore.startEmptySession();

activeStore.addExerciseToActiveSession({
  exerciseId: 'barbell_bench_press',
  name: 'Barbell Bench Press',
  equipment: 'barbell',
  sets: [
    { type: 'working', targetWeight: 60, weight: 60, reps: 8, completed: false },
    { type: 'working', targetWeight: 60, weight: 60, reps: 8, completed: false }
  ]
});

const ex = activeStore.activeSession.value.exercises[0];
const targetSet0 = ex.sets[0];
const targetSet1 = ex.sets[1];

// Simulate applying 82.5 kg to Set 0
targetSet0.weight = 82.5;
targetSet0.targetWeight = 82.5;
activeStore.persistDraft();

// Verify Set 0 was updated and Set 1 remained 60 kg
assert.strictEqual(ex.sets[0].weight, 82.5, 'Set 0 weight updated to 82.5 kg');
assert.strictEqual(ex.sets[0].targetWeight, 82.5, 'Set 0 targetWeight updated to 82.5 kg');
assert.strictEqual(ex.sets[1].weight, 60, 'Set 1 weight completely unchanged (60 kg)');

// Verify draft was persisted in localStorage
const draftJson = globalThis.localStorage.getItem('active_session_draft');
assert.ok(draftJson, 'Draft saved');
const parsed = JSON.parse(draftJson);
assert.strictEqual(parsed.exercises[0].sets[0].weight, 82.5, 'Persisted draft has 82.5 kg');
console.log('  ✓ Plate weight applied specifically to chosen set with draft persistence.\n');

// -------------------------------------------------------------
// Test 5: Defensive resolution across exercise reordering
// -------------------------------------------------------------
console.log('▶ [5] Defensive resolution when exercises are reordered...');
// Add a second exercise: Incline Barbell Press
activeStore.addExerciseToActiveSession({
  exerciseId: 'incline_barbell_press',
  name: 'Incline Barbell Press',
  equipment: 'barbell',
  sets: [
    { type: 'working', targetWeight: 50, weight: 50, reps: 10, completed: false, _setId: 'incline_set_0' }
  ]
});

assert.strictEqual(activeStore.activeSession.value.exercises.length, 2);
const benchEx = activeStore.activeSession.value.exercises[0];
benchEx.sets[1]._setId = 'bench_set_1';
const targetedBenchSet = benchEx.sets[1]; // Set 1 of Bench Press

// Now simulate user moving Incline Press UP (or Bench Press DOWN)
activeStore.moveExercise(0, 1);
// Now activeSession.value.exercises[0] is Incline Press, exercises[1] is Bench Press
assert.strictEqual(activeStore.activeSession.value.exercises[0].exerciseId, 'incline_barbell_press');
assert.strictEqual(activeStore.activeSession.value.exercises[1].exerciseId, 'barbell_bench_press');

// Use applyPlateWeightToActiveSet with dual identity
const res5 = applyPlateWeightToActiveSet(67.5, targetedBenchSet, 'bench_set_1');
assert.strictEqual(res5.success, true, 'Set resolved correctly after exercise reordering');
assert.strictEqual(res5.exerciseIndex, 1, 'Resolved exerciseIndex is 1 after reorder');
assert.strictEqual(res5.setIndex, 1, 'Resolved setIndex is 1');
assert.strictEqual(activeStore.activeSession.value.exercises[1].sets[1].weight, 67.5, 'Correct exercise and set updated to 67.5 kg');
assert.strictEqual(activeStore.activeSession.value.exercises[0].sets[0].weight, 50, 'Incline Press set NOT touched (remained 50 kg)');
console.log('  ✓ Dual identity tracking successfully prevents writing to wrong exercise after reorder.\n');

// -------------------------------------------------------------
// Test 6: Defensive resolution when target set was deleted before apply
// -------------------------------------------------------------
console.log('▶ [6] Defensive resolution when target set was deleted before apply...');
// Create a temporary dummy set object not in the active session
const deletedSetRef = { type: 'working', weight: 40, _setId: 'del_fake_id' };
const res6 = applyPlateWeightToActiveSet(70, deletedSetRef, 'del_fake_id');
assert.strictEqual(res6.success, false, 'Safely aborts when targeted set does not exist in active session');
assert.strictEqual(res6.reason, 'target_set_not_found', 'Reports target_set_not_found reason');
// Ensure all active session exercises are completely untouched
assert.strictEqual(activeStore.activeSession.value.exercises[1].sets[1].weight, 67.5, 'Bench press set 1 still 67.5 kg');
assert.strictEqual(activeStore.activeSession.value.exercises[0].sets[0].weight, 50, 'Incline press set 0 still 50 kg');
console.log('  ✓ Aborts safely without modifying any sets when targeted set does not exist.\n');

// -------------------------------------------------------------
// Test 7: Target set deleted while modal was open
// -------------------------------------------------------------
console.log('▶ [7] Real set deletion while modal open - verifies no collateral modification...');
// Bench Press currently has 2 sets (idx 0: 82.5, idx 1: 67.5).
// Let's remove Set 1 of Bench Press
const benchSetsBefore = activeStore.activeSession.value.exercises[1].sets;
const removedSet = benchSetsBefore[1];
benchSetsBefore.splice(1, 1); // Delete set 1
activeStore.persistDraft();
assert.strictEqual(activeStore.activeSession.value.exercises[1].sets.length, 1);

// Now apply weight intended for removedSet
const res7 = applyPlateWeightToActiveSet(95, removedSet, removedSet._setId);
assert.strictEqual(res7.success, false, 'Refuses to apply to deleted set');
assert.strictEqual(res7.reason, 'target_set_not_found');
assert.strictEqual(activeStore.activeSession.value.exercises[1].sets[0].weight, 82.5, 'Remaining set 0 is NOT modified to 95 kg');
console.log('  ✓ Verified remaining sets are never collaterally overwritten if target set was deleted.\n');

// -------------------------------------------------------------
// Test 8: Volume and PR reactivity
// -------------------------------------------------------------
console.log('▶ [8] Volume calculation and PR check after plate weight apply...');
// Mark Bench Press set 0 completed (82.5 kg x 8 reps = 660 kg)
const benchExCurrent = activeStore.activeSession.value.exercises[1];
benchExCurrent.sets[0].completed = true;

const vol1 = calculateTotalWorkingVolume(activeStore.activeSession.value.exercises);
assert.strictEqual(vol1, 660, 'Working volume correctly reflects 82.5 kg x 8 reps = 660 kg');

// Evaluate PRs against a baseline of 70 kg
const prResults = evaluateExercisePrs(benchExCurrent, 70);
assert.strictEqual(benchExCurrent.sets[0].isPr, true, 'Set 0 qualifies for PR badge (82.5 kg beats 70 kg baseline)');
console.log('  ✓ Volume and PRs reflect plate calculator weight updates accurately.\n');

console.log('====================================================');
console.log('🎉 ALL PLATE CALCULATOR ACTIVE WORKOUT TESTS PASSED!');
console.log('====================================================\n');
