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
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-warmup-test-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const {
  useActiveSessionStore,
  insertWarmupSetsToActiveExercise,
  hasWarmupSets,
  getExerciseWorkingWeight,
  calculateTotalWorkingVolume
} = await import('../src/composables/useActiveSessionStore.js');

const { evaluateExercisePrs, setCachedBaseline } = await import('../src/composables/usePersonalRecords.js');
const { buildWarmupSets, isWarmSetType } = await import('../src/composables/warmupCalc.js');

console.log('====================================================');
console.log('🧪 Unit & Integration Test: Warmup Sets in Active Workout');
console.log('====================================================\n');

const store = useActiveSessionStore();

// Reset initial store state
store.discardSession();
assert.strictEqual(store.isWorkoutActive.value, false, 'Workout initially inactive');

// -------------------------------------------------------------
// Test 1: Function signatures & composable exports
// -------------------------------------------------------------
console.log('▶ [1] Composable exports and function signatures...');
assert.strictEqual(typeof insertWarmupSetsToActiveExercise, 'function', 'insertWarmupSetsToActiveExercise is exported');
assert.strictEqual(typeof store.insertWarmupSetsToActiveExercise, 'function', 'store.insertWarmupSetsToActiveExercise is available');
assert.strictEqual(typeof hasWarmupSets, 'function', 'hasWarmupSets is exported');
assert.strictEqual(typeof getExerciseWorkingWeight, 'function', 'getExerciseWorkingWeight is exported');
assert.strictEqual(typeof calculateTotalWorkingVolume, 'function', 'calculateTotalWorkingVolume is exported');
console.log('  ✓ All warmup functions properly exported and available.\n');

// -------------------------------------------------------------
// Test 2: Validation guards (inactive session, invalid index)
// -------------------------------------------------------------
console.log('▶ [2] Inactive session and parameter validation guards...');
const resInactive = store.insertWarmupSetsToActiveExercise(0);
assert.strictEqual(resInactive.success, false, 'Refuses when workout inactive');
assert.strictEqual(resInactive.reason, 'no_active_session');

// Start an empty session for tests
store.startEmptySession();
assert.strictEqual(store.isWorkoutActive.value, true, 'Workout active');

const resBadIndex = store.insertWarmupSetsToActiveExercise(99);
assert.strictEqual(resBadIndex.success, false, 'Refuses out-of-range exercise index');
assert.strictEqual(resBadIndex.reason, 'invalid_index');
console.log('  ✓ Inactive workout and invalid index safely guarded.\n');

// -------------------------------------------------------------
// Test 3: Weight validation (missing, zero, or invalid weight)
// -------------------------------------------------------------
console.log('▶ [3] Working weight validation (zero/missing weight rejection)...');
// Add an exercise with 0 weight
store.addExerciseToActiveSession({
  exerciseId: 'barbell_bench_press',
  name: 'Barbell Bench Press',
  muscleGroup: 'chest',
  equipment: 'barbell',
  sets: [
    { type: 'working', targetReps: 8, targetWeight: 0, weight: 0, reps: 8, completed: false },
    { type: 'working', targetReps: 8, targetWeight: 0, weight: 0, reps: 8, completed: false }
  ]
});

const exZeroWeight = store.activeSession.value.exercises[0];
assert.strictEqual(getExerciseWorkingWeight(exZeroWeight), 0, 'Zero working weight identified');
assert.strictEqual(hasWarmupSets(exZeroWeight), false, 'No warmup sets yet');

const resZeroWeight = store.insertWarmupSetsToActiveExercise(0);
assert.strictEqual(resZeroWeight.success, false, 'Refuses when working weight is 0');
assert.strictEqual(resZeroWeight.reason, 'invalid_weight');
assert.strictEqual(exZeroWeight.sets.length, 2, 'Sets array unchanged after rejection');
console.log('  ✓ Zero/invalid weight safely rejected without corrupting exercise.\n');

// -------------------------------------------------------------
// Test 4: Successful warmup generation and insertion
// -------------------------------------------------------------
console.log('▶ [4] Warmup sets generation & prepending before working sets...');
// Set working weight to 80 kg
exZeroWeight.sets[0].weight = 80;
exZeroWeight.sets[0].targetWeight = 80;
exZeroWeight.sets[1].weight = 80;
exZeroWeight.sets[1].targetWeight = 80;

assert.strictEqual(getExerciseWorkingWeight(exZeroWeight), 80, 'Reference weight detected as 80 kg');

const resSuccess = store.insertWarmupSetsToActiveExercise(0);
assert.strictEqual(resSuccess.success, true, 'Warmup sets inserted successfully');
assert.strictEqual(resSuccess.count, 3, '3 warmup sets generated');
assert.strictEqual(resSuccess.referenceWeight, 80, 'Reference weight was 80 kg');

// Total sets should now be 3 warmup + 2 working = 5 sets
assert.strictEqual(exZeroWeight.sets.length, 5, 'Total 5 sets');
assert.strictEqual(hasWarmupSets(exZeroWeight), true, 'hasWarmupSets returns true');

// Check warmup sets (40% of 80 = 32 kg x 5, 60% of 80 = 48 kg x 5, 80% of 80 = 64 kg x 3)
const w1 = exZeroWeight.sets[0];
const w2 = exZeroWeight.sets[1];
const w3 = exZeroWeight.sets[2];
const ws1 = exZeroWeight.sets[3];
const ws2 = exZeroWeight.sets[4];

assert.strictEqual(w1.type, 'warmup', 'Set 1 is warmup');
assert.strictEqual(w1.weight, 32, 'Set 1 weight is 32 kg (40%)');
assert.strictEqual(w1.reps, 5, 'Set 1 reps is 5');
assert.strictEqual(w1.isWarm, true, 'Set 1 has isWarm=true');
assert.strictEqual(w1._generatedWarmup, true, 'Set 1 has _generatedWarmup=true');

assert.strictEqual(w2.type, 'warmup', 'Set 2 is warmup');
assert.strictEqual(w2.weight, 48, 'Set 2 weight is 48 kg (60%)');
assert.strictEqual(w2.reps, 5, 'Set 2 reps is 5');

assert.strictEqual(w3.type, 'warmup', 'Set 3 is warmup');
assert.strictEqual(w3.weight, 64, 'Set 3 weight is 64 kg (80%)');
assert.strictEqual(w3.reps, 3, 'Set 3 reps is 3');

// Verify existing working sets remain intact
assert.strictEqual(ws1.type, 'working', 'Set 4 is original working set 1');
assert.strictEqual(ws1.weight, 80, 'Working set 1 weight preserved');
assert.strictEqual(ws2.type, 'working', 'Set 5 is original working set 2');
assert.strictEqual(ws2.weight, 80, 'Working set 2 weight preserved');
console.log('  ✓ Warmup sets calculated accurately and prepended without disturbing working sets.\n');

// -------------------------------------------------------------
// Test 5: Duplicate insertion protection
// -------------------------------------------------------------
console.log('▶ [5] Duplicate insertion protection...');
const resDup = store.insertWarmupSetsToActiveExercise(0);
assert.strictEqual(resDup.success, false, 'Refuses duplicate warmup insertion');
assert.strictEqual(resDup.reason, 'already_exists');
assert.strictEqual(exZeroWeight.sets.length, 5, 'Sets array remains at 5 sets (no duplicate stacked)');
console.log('  ✓ Duplicate insertion prevented.\n');

// -------------------------------------------------------------
// Test 6: Working volume calculation exclusion
// -------------------------------------------------------------
console.log('▶ [6] Working volume calculation isolation...');
// Mark all warmup sets completed
w1.completed = true;
w2.completed = true;
w3.completed = true;

// With ONLY warmup sets completed, volume MUST be 0!
const warmupOnlyVolume = calculateTotalWorkingVolume([exZeroWeight]);
assert.strictEqual(warmupOnlyVolume, 0, 'Warmup sets do NOT count towards working volume');

// Now complete working set 1: 80 kg x 8 reps = 640 kg
ws1.completed = true;
const withWorkSetVolume = calculateTotalWorkingVolume([exZeroWeight]);
assert.strictEqual(withWorkSetVolume, 640, 'Only working sets contribute to working volume (640 kg)');

// Complete working set 2: 80 kg x 8 reps = 640 kg -> Total 1280 kg
ws2.completed = true;
const fullVolume = calculateTotalWorkingVolume([exZeroWeight]);
assert.strictEqual(fullVolume, 1280, 'Total working volume is exactly 1280 kg');
console.log('  ✓ Warmup sets strictly excluded from working volume calculation.\n');

// -------------------------------------------------------------
// Test 7: Personal Record (PR) evaluation isolation
// -------------------------------------------------------------
console.log('▶ [7] PR evaluation isolation...');
// Set an artificially low baseline for the exercise (e.g. e1RM = 20 kg)
setCachedBaseline('barbell_bench_press', 20);

// Working set 2 lifts heavier: 85 kg x 8 reps
ws2.weight = 85;
ws2.targetWeight = 85;

// Evaluate PRs for exZeroWeight
evaluateExercisePrs(exZeroWeight, 20);

// Verify warmup sets never receive PR badge
assert.strictEqual(Boolean(w1.isPr), false, 'Warmup set 1 has isPr=false');
assert.strictEqual(Boolean(w2.isPr), false, 'Warmup set 2 has isPr=false');
assert.strictEqual(Boolean(w3.isPr), false, 'Warmup set 3 has isPr=false');

// Working sets exceeding baseline DO receive PR badge
assert.strictEqual(Boolean(ws1.isPr), true, 'Working set 1 qualifies for PR badge');
assert.strictEqual(Boolean(ws2.isPr), true, 'Working set 2 qualifies for PR badge');
console.log('  ✓ Warmup sets never trigger PR badges.\n');

// -------------------------------------------------------------
// Test 8: Draft reload & persistence
// -------------------------------------------------------------
console.log('▶ [8] Draft reload and state persistence...');
// Read raw draft from storage
const rawDraft = globalThis.localStorage.getItem('active_session_draft');
assert.ok(rawDraft, 'Draft exists in localStorage');
const parsedDraft = JSON.parse(rawDraft);
const draftEx = parsedDraft.exercises[0];
assert.strictEqual(draftEx.sets.length, 5, 'Persisted draft has 5 sets');
assert.strictEqual(draftEx.sets[0].type, 'warmup', 'Persisted draft set 0 is warmup');
assert.strictEqual(draftEx.sets[0].isWarm, true, 'Persisted draft set 0 has isWarm=true');
assert.strictEqual(draftEx.sets[3].type, 'working', 'Persisted draft set 3 is working');

console.log('  ✓ Warmup sets survive draft reload and persistence.\n');

// -------------------------------------------------------------
// Test 9: Finishing workout session with warmup sets
// -------------------------------------------------------------
console.log('▶ [9] Finishing session and summary verification...');
const summary = store.finishSession();
assert.ok(summary, 'finishSession returned summary');
assert.strictEqual(summary.totalVolumeKg, 1320, 'Summary totalVolumeKg excludes warmup sets');
assert.strictEqual(summary.totalSetsCount, 5, 'Total sets count includes warmup sets');
assert.strictEqual(summary.completedSetsCount, 5, 'All 5 sets marked completed');
assert.strictEqual(store.isWorkoutActive.value, false, 'Workout marked inactive');
console.log('  ✓ Session finished cleanly with accurate volume and set counts.\n');

console.log('====================================================');
console.log('🎉 ALL WARMUP ACTIVE WORKOUT UNIT TESTS PASSED!');
console.log('====================================================\n');
