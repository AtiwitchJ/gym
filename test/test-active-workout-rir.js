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
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-rir-test-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const {
  RIR_CHOICES,
  normalizeRir,
  nextRir,
  rirPlusFor,
  nextRirSelection,
  isRirChoiceSelected,
  rirLabel
} = await import('../src/composables/useRir.js');

const {
  useActiveSessionStore,
  updateSetRir,
  cloneSessionToActive,
  calculateTotalWorkingVolume
} = await import('../src/composables/useActiveSessionStore.js');

const { useWorkoutStore } = await import('../src/composables/useWorkoutStore.js');
const { evaluateExercisePrs } = await import('../src/composables/usePersonalRecords.js');

// Mock global fetch for Node.js environment
globalThis.fetch = async (url, options = {}) => {
  if (url === '/api/history' && options?.method === 'POST') {
    try {
      const payload = JSON.parse(options.body);
      repo.saveSession(payload);
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    } catch (e) {
      return { ok: false, status: 500, json: async () => ({ error: String(e) }) };
    }
  }
  return { ok: true, status: 200, json: async () => ({}) };
};

console.log('====================================================');
console.log('🧪 Unit & Integration Test: RIR in Active Workout');
console.log('====================================================\n');

// -------------------------------------------------------------
// Test 1: useRir pure functions & choices contract
// -------------------------------------------------------------
console.log('▶ [1] Testing pure RIR functions (useRir.js)...');
assert.strictEqual(RIR_CHOICES.length, 3, 'RIR_CHOICES must have exactly 3 options');
assert.deepStrictEqual(
  RIR_CHOICES.map(c => c.label),
  ['เหลือ 2+', 'เหลือ 1', 'ล้ม'],
  'Labels must be "เหลือ 2+", "เหลือ 1", "ล้ม"'
);

// normalizeRir
assert.strictEqual(normalizeRir(null), null);
assert.strictEqual(normalizeRir(undefined), null);
assert.strictEqual(normalizeRir(''), null);
assert.strictEqual(normalizeRir(-1), null);
assert.strictEqual(normalizeRir(0), 0);
assert.strictEqual(normalizeRir(1), 1);
assert.strictEqual(normalizeRir(2), 2);
assert.strictEqual(normalizeRir(3), 2, 'Values above 2 clamp to 2');

// nextRirSelection
const choice2Plus = RIR_CHOICES[0];
const choice1 = RIR_CHOICES[1];
const choice0 = RIR_CHOICES[2];

// Initial selection from null
let sel = nextRirSelection(null, false, choice2Plus);
assert.deepStrictEqual(sel, { rir: 2, rirPlus: true }, 'Picking เหลือ 2+ produces { rir: 2, rirPlus: true }');
assert.strictEqual(isRirChoiceSelected(sel.rir, sel.rirPlus, choice2Plus), true);
assert.strictEqual(isRirChoiceSelected(sel.rir, sel.rirPlus, choice1), false);
assert.strictEqual(rirLabel(sel.rir, sel.rirPlus), '2+');

// Tapping same choice clears it
let cleared = nextRirSelection(sel.rir, sel.rirPlus, choice2Plus);
assert.deepStrictEqual(cleared, { rir: null, rirPlus: false }, 'Tapping active choice clears to null, false');
assert.strictEqual(rirLabel(cleared.rir, cleared.rirPlus), '—');

// Switching from 2+ to 1
sel = nextRirSelection(2, true, choice1);
assert.deepStrictEqual(sel, { rir: 1, rirPlus: false }, 'Switching to เหลือ 1 gives { rir: 1, rirPlus: false }');
assert.strictEqual(isRirChoiceSelected(sel.rir, sel.rirPlus, choice1), true);
assert.strictEqual(rirLabel(sel.rir, sel.rirPlus), '1');

// Switching from 1 to 0 (ล้ม)
sel = nextRirSelection(1, false, choice0);
assert.deepStrictEqual(sel, { rir: 0, rirPlus: false }, 'Switching to ล้ม gives { rir: 0, rirPlus: false }');
assert.strictEqual(isRirChoiceSelected(sel.rir, sel.rirPlus, choice0), true);
assert.strictEqual(rirLabel(sel.rir, sel.rirPlus), '0');

console.log('  ✔ useRir pure functions verified.');

// -------------------------------------------------------------
// Test 2: Active Session Store & updateSetRir
// -------------------------------------------------------------
console.log('▶ [2] Testing ActiveSessionStore RIR state initialization & updateSetRir...');
const store = useActiveSessionStore();
store.discardSession();

// Start session from empty / routine
store.startEmptySession({ title: 'RIR Bench Routine' });
assert.strictEqual(store.isWorkoutActive.value, true);

// Add exercise
const ex = store.addExerciseToActiveSession('bench_press', [
  { type: 'warmup', targetWeight: 40, targetReps: 15, weight: 40, reps: 15, completed: false },
  { type: 'working', targetWeight: 80, targetReps: 8, weight: 80, reps: 8, completed: false },
  { type: 'working', targetWeight: 80, targetReps: 8, weight: 80, reps: 8, completed: false }
]);

assert.strictEqual(store.activeSession.value.exercises.length, 1);
const activeEx = store.activeSession.value.exercises[0];

// Default sets must have rir: null, rirPlus: false
assert.strictEqual(activeEx.sets[0].rir, null);
assert.strictEqual(activeEx.sets[0].rirPlus, false);
assert.strictEqual(activeEx.sets[1].rir, null);
assert.strictEqual(activeEx.sets[1].rirPlus, false);

// Select RIR on set 1: เหลือ 2+
const ok1 = store.updateSetRir(0, 1, 2, true);
assert.strictEqual(ok1, true);
assert.strictEqual(activeEx.sets[1].rir, 2);
assert.strictEqual(activeEx.sets[1].rirPlus, true);

// Check draft persistence in localStorage
const draftJson = localStorage.getItem('active_session_draft');
assert.ok(draftJson, 'Draft must be saved in localStorage');
const draftParsed = JSON.parse(draftJson);
assert.strictEqual(draftParsed.exercises[0].sets[1].rir, 2);
assert.strictEqual(draftParsed.exercises[0].sets[1].rirPlus, true);

// Select RIR on set 2: ล้ม (0)
const ok2 = store.updateSetRir(0, 2, 0, false);
assert.strictEqual(ok2, true);
assert.strictEqual(activeEx.sets[2].rir, 0);
assert.strictEqual(activeEx.sets[2].rirPlus, false);

// Warmup set compatibility: can optionally set or leave empty
assert.strictEqual(activeEx.sets[0].rir, null);
const okWarm = store.updateSetRir(0, 0, 2, true);
assert.strictEqual(okWarm, true);
assert.strictEqual(activeEx.sets[0].rir, 2);
// Clear warmup RIR back to null
store.updateSetRir(0, 0, null, false);
assert.strictEqual(activeEx.sets[0].rir, null);

console.log('  ✔ updateSetRir and draft persistence verified.');

// -------------------------------------------------------------
// Test 3: Set completion toggle preserves RIR
// -------------------------------------------------------------
console.log('▶ [3] Testing set completion toggle preserves RIR...');
// Complete set 1
store.toggleSetComplete(0, 1);
assert.strictEqual(activeEx.sets[1].completed, true);
assert.strictEqual(activeEx.sets[1].rir, 2, 'Completed set retains RIR 2');
assert.strictEqual(activeEx.sets[1].rirPlus, true, 'Completed set retains rirPlus true');

// Untick set 1
store.toggleSetComplete(0, 1);
assert.strictEqual(activeEx.sets[1].completed, false);
assert.strictEqual(activeEx.sets[1].rir, 2, 'Unticked set retains RIR 2');
assert.strictEqual(activeEx.sets[1].rirPlus, true, 'Unticked set retains rirPlus true');

// Re-tick set 1 and complete set 2
store.toggleSetComplete(0, 1);
store.toggleSetComplete(0, 2);
assert.strictEqual(activeEx.sets[1].completed, true);
assert.strictEqual(activeEx.sets[2].completed, true);

console.log('  ✔ Set completion toggle preserves RIR.');

// -------------------------------------------------------------
// Test 4: finishSession and SQLite sync
// -------------------------------------------------------------
console.log('▶ [4] Testing finishSession saves RIR to history, lastWeights, and SQLite...');
const workoutStore = useWorkoutStore();

const summary = store.finishSession();
assert.ok(summary, 'finishSession returned summary');
assert.strictEqual(store.isWorkoutActive.value, false, 'Workout active state reset');

// Check summary.exercises
const sumEx = summary.exercises[0];
assert.strictEqual(sumEx.sets[1].rir, 2);
assert.strictEqual(sumEx.sets[1].rirPlus, true);
assert.strictEqual(sumEx.sets[2].rir, 0);
assert.strictEqual(sumEx.sets[2].rirPlus, false);

// Check lastWeights in workoutStore
const exId = activeEx.exerciseId;
assert.ok(workoutStore.lastWeights[exId], 'lastWeights has record for exercise');
assert.strictEqual(workoutStore.lastWeights[exId].rir_1, 2, 'lastWeights recorded rir_1');
assert.strictEqual(workoutStore.lastWeights[exId].rirPlus_1, 1, 'lastWeights recorded rirPlus_1 = 1');
assert.strictEqual(workoutStore.lastWeights[exId].rir_2, 0, 'lastWeights recorded rir_2 = 0');
assert.strictEqual(workoutStore.lastWeights[exId].rirPlus_2, 0, 'lastWeights recorded rirPlus_2 = 0');

// Verify SQLite database persistence directly via repo
const dbHistory = repo.getHistory();
assert.ok(dbHistory && dbHistory.length > 0, 'History saved to DB');
const savedDbSession = dbHistory.find(s => s.id === summary.id);
assert.ok(savedDbSession, 'Found session in DB history');
const savedDbEx = savedDbSession.exercises.find(e => e.id === exId);
assert.ok(savedDbEx, 'Found exercise in DB session');
assert.strictEqual(savedDbEx.sets[1].rir, 2, 'DB session set 1 has rir = 2');
assert.strictEqual(savedDbEx.sets[1].rirPlus, true, 'DB session set 1 has rirPlus = true');
assert.strictEqual(savedDbEx.sets[2].rir, 0, 'DB session set 2 has rir = 0');
assert.strictEqual(savedDbEx.sets[2].rirPlus, false, 'DB session set 2 has rirPlus = false');

// Verify cloneSessionToActive resets RIR
console.log('▶ [5] Testing cloneSessionToActive resets RIR for fresh workout...');
const cloned = cloneSessionToActive(savedDbSession);
assert.strictEqual(cloned.exercises[0].sets[1].completed, false, 'Cloned set completed is false');
assert.strictEqual(cloned.exercises[0].sets[1].rir, null, 'Cloned set rir reset to null');
assert.strictEqual(cloned.exercises[0].sets[1].rirPlus, false, 'Cloned set rirPlus reset to false');

console.log('  ✔ finishSession, SQLite persistence, and cloneSessionToActive verified.');

console.log('\n====================================================');
console.log('🎉 ALL RIR UNIT & INTEGRATION TESTS PASSED (100%)');
console.log('====================================================');
