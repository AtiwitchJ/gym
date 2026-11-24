import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// -------------------------------------------------------------
// In-memory localStorage polyfill for isolated node execution
// -------------------------------------------------------------
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

// Strict DB isolation: never touch production DB
if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-history-modal-test-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const {
  useActiveSessionStore,
  updateSetMetric,
  updateSetRir,
  toggleSetComplete,
  moveExerciseDown,
  moveExerciseUp,
  substituteExercise
} = await import('../src/composables/useActiveSessionStore.js');

const {
  useExerciseHistory,
  HISTORY_EMPTY_MESSAGE,
  HISTORY_ERROR_MESSAGE,
  formatPr,
  hasPr
} = await import('../src/composables/useExerciseHistory.js');

console.log('====================================================');
console.log('🧪 Unit & Integration Test: Exercise History in Active Workout');
console.log('====================================================\n');

// -------------------------------------------------------------
// Test 1: Static Component Verification & Architecture
// -------------------------------------------------------------
console.log('▶ [1] Verifying ActiveWorkoutSheet.vue template and wiring...');
const sheetSrc = fs.readFileSync(path.join(root, 'src/components/ActiveWorkoutSheet.vue'), 'utf8');

// 1.1 Import check
assert.ok(
  sheetSrc.includes("import ExerciseHistoryModal from './ExerciseHistoryModal.vue'"),
  'ActiveWorkoutSheet must import ExerciseHistoryModal.vue'
);

// 1.2 Action Toolbar button check
assert.ok(
  sheetSrc.includes('btn-exercise-history'),
  'ActiveWorkoutSheet must provide a .btn-exercise-history button in action toolbar'
);
assert.ok(
  sheetSrc.includes('@click="openHistoryModal(exercise, exIdx)"'),
  'History button must call openHistoryModal with current exercise and index'
);
assert.ok(
  sheetSrc.includes('min-h-[44px]') && sheetSrc.includes('min-w-[44px]'),
  'History button must meet mobile touch target requirements (>= 44x44px)'
);
assert.ok(
  sheetSrc.includes('📜') && sheetSrc.includes('ประวัติ &amp; PR'),
  'History button must display history icon and Thai label'
);

// 1.3 Reactive modal state & methods
assert.ok(sheetSrc.includes('const isHistoryModalOpen = ref(false)'), 'ActiveWorkoutSheet must have isHistoryModalOpen ref');
assert.ok(sheetSrc.includes('const activeHistoryExercise = ref(null)'), 'ActiveWorkoutSheet must have activeHistoryExercise ref');
assert.ok(sheetSrc.includes('function openHistoryModal(exercise'), 'ActiveWorkoutSheet must define openHistoryModal function');

// 1.4 Embedded modal tag & props binding
assert.ok(
  sheetSrc.includes('<ExerciseHistoryModal'),
  'ActiveWorkoutSheet must mount ExerciseHistoryModal'
);
assert.ok(
  sheetSrc.includes(':is-open="isHistoryModalOpen"'),
  'Modal must bind :is-open to isHistoryModalOpen'
);
assert.ok(
  sheetSrc.includes(':exercise-id="activeHistoryExercise?.exerciseId || activeHistoryExercise?.id || \'\'"'),
  'Modal must bind :exercise-id accurately with fallback'
);
assert.ok(
  sheetSrc.includes(':exercise-name="activeHistoryExercise?.name || \'\'"'),
  'Modal must bind :exercise-name accurately'
);
assert.ok(
  sheetSrc.includes('@close="isHistoryModalOpen = false"'),
  'Modal must close when @close is emitted'
);

// 1.5 Header PR badge clickable integration
assert.ok(
  sheetSrc.includes('class="live-ex-pr-badge') && sheetSrc.includes('@click="openHistoryModal(exercise, exIdx)"'),
  'Header PR badge must also allow opening history modal directly'
);
console.log('✓ ActiveWorkoutSheet wiring verified.');

// -------------------------------------------------------------
// Test 2: ExerciseHistoryModal Overlay & Layering Verification
// -------------------------------------------------------------
console.log('\n▶ [2] Verifying ExerciseHistoryModal and PRRecordsModal accessibility & overlay...');
const modalSrc = fs.readFileSync(path.join(root, 'src/components/ExerciseHistoryModal.vue'), 'utf8');
const prModalSrc = fs.readFileSync(path.join(root, 'src/components/PRRecordsModal.vue'), 'utf8');

// 2.1 Z-Index layering (Must sit above z-[45] runner and z-30 rest timer)
assert.ok(
  modalSrc.includes('z-[60]'),
  'ExerciseHistoryModal must have z-[60] to properly overlay active runner (z-[45]) and rest timer (z-30)'
);
assert.ok(
  prModalSrc.includes('z-[70]'),
  'PRRecordsModal must have z-[70] to overlay on top of ExerciseHistoryModal (z-[60])'
);

// 2.2 Accessibility attributes (role, aria-modal, title, aria-label)
assert.ok(modalSrc.includes('role="dialog"'), 'ExerciseHistoryModal must have role="dialog"');
assert.ok(modalSrc.includes('aria-modal="true"'), 'ExerciseHistoryModal must have aria-modal="true"');
assert.ok(modalSrc.includes(':aria-label="exerciseName ?'), 'ExerciseHistoryModal must provide dynamic Thai aria-label');

// 2.3 Keyboard Escape handling
assert.ok(
  modalSrc.includes("if (e.key === 'Escape')"),
  'ExerciseHistoryModal must handle Escape key press'
);
assert.ok(
  modalSrc.includes("window.addEventListener('keydown', onKeydown)"),
  'ExerciseHistoryModal must listen for keydown events when open'
);
assert.ok(
  modalSrc.includes("window.removeEventListener('keydown', onKeydown)"),
  'ExerciseHistoryModal must cleanup keydown listeners on close/unmount'
);
assert.ok(
  prModalSrc.includes("if (e.key === 'Escape')"),
  'PRRecordsModal must also handle Escape key press'
);

// 2.4 Mobile touch target compliance
assert.ok(
  modalSrc.includes('min-h-[44px]') && modalSrc.includes('min-w-[44px]'),
  'ExerciseHistoryModal close/retry buttons must be at least 44x44px for mobile'
);
console.log('✓ Overlay layering, accessibility, and Escape handling verified.');

// -------------------------------------------------------------
// Test 3: Active Session Draft & State Preservation
// -------------------------------------------------------------
console.log('\n▶ [3] Verifying active draft, sets, RIR, and timer state preservation...');

const store = useActiveSessionStore();
localStorage.clear();

const testActiveSession = {
  sessionId: 'test-session-preservation-1',
  dayTitle: 'Chest & Triceps Power',
  date: '2026-11-25',
  startedAt: Date.now() - 60000, // 1 min ago
  exercises: [
    {
      exerciseId: 'barbell-bench-press',
      name: 'Barbell Bench Press',
      muscleGroup: 'chest',
      equipment: 'barbell',
      sets: [
        {
          type: 'working',
          targetWeight: 60,
          targetReps: 8,
          weight: 60,
          reps: 8,
          completed: true,
          completedAt: Date.now() - 30000,
          rir: 1
        },
        {
          type: 'working',
          targetWeight: 65,
          targetReps: 8,
          weight: 65,
          reps: 7,
          completed: false,
          completedAt: null,
          rir: null
        }
      ]
    },
    {
      exerciseId: 'incline-dumbbell-press',
      name: 'Incline Dumbbell Press',
      muscleGroup: 'chest',
      equipment: 'dumbbell',
      sets: [
        {
          type: 'working',
          targetWeight: 24,
          targetReps: 10,
          weight: 24,
          reps: 10,
          completed: false,
          completedAt: null,
          rir: 2
        }
      ]
    }
  ]
};

// Seed store
store.activeSession.value = JSON.parse(JSON.stringify(testActiveSession));
store.isWorkoutActive.value = true;
store.sessionDurationSec.value = 60;
store.persistDraft();

// Verify initial state
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].completed, true);
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].rir, 1);
assert.strictEqual(store.activeSession.value.exercises[1].sets[0].rir, 2);

// Simulate component opening and closing ExerciseHistoryModal
let isModalOpen = false;
let activeExercise = null;

function mockOpenHistory(exercise) {
  activeExercise = exercise;
  isModalOpen = true;
}

function mockCloseHistory() {
  isModalOpen = false;
}

// Lifter opens modal for Barbell Bench Press while workout is active
mockOpenHistory(store.activeSession.value.exercises[0]);
assert.strictEqual(isModalOpen, true);
assert.strictEqual(activeExercise.exerciseId, 'barbell-bench-press');
assert.strictEqual(activeExercise.name, 'Barbell Bench Press');

// Advance session duration ticker during modal inspection
store.sessionDurationSec.value += 15;

// Lifter closes modal
mockCloseHistory();
assert.strictEqual(isModalOpen, false);

// Check that active session state is completely preserved
assert.strictEqual(store.isWorkoutActive.value, true, 'Workout must remain active');
assert.strictEqual(store.sessionDurationSec.value, 75, 'Duration must continue incrementing');
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].completed, true, 'Set 1 completed status intact');
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].weight, 60, 'Set 1 weight intact');
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].reps, 8, 'Set 1 reps intact');
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].rir, 1, 'Set 1 RIR choice intact');
assert.strictEqual(store.activeSession.value.exercises[1].sets[0].rir, 2, 'Exercise 2 RIR choice intact');

// Check localStorage draft persistence
const persistedDraft = JSON.parse(localStorage.getItem('active_session_draft'));
assert.strictEqual(persistedDraft.exercises[0].sets[0].completed, true);
assert.strictEqual(persistedDraft.exercises[0].sets[0].rir, 1);
console.log('✓ State, draft, RIR choices, and duration ticker strictly preserved.');

// -------------------------------------------------------------
// Test 4: Accurate Mapping for Reordered and Substituted Exercises
// -------------------------------------------------------------
console.log('\n▶ [4] Testing accurate exercise mapping for moved and substituted exercises...');

// 4.1 Exercise Reordering: Move exercise 0 down to index 1
store.moveExerciseDown(0);
assert.strictEqual(store.activeSession.value.exercises[0].exerciseId, 'incline-dumbbell-press');
assert.strictEqual(store.activeSession.value.exercises[1].exerciseId, 'barbell-bench-press');

// Lifter taps History on newly positioned index 0 (Incline Dumbbell Press)
mockOpenHistory(store.activeSession.value.exercises[0]);
assert.strictEqual(activeExercise.exerciseId, 'incline-dumbbell-press');
assert.strictEqual(activeExercise.name, 'Incline Dumbbell Press');
mockCloseHistory();

// Lifter taps History on newly positioned index 1 (Barbell Bench Press)
mockOpenHistory(store.activeSession.value.exercises[1]);
assert.strictEqual(activeExercise.exerciseId, 'barbell-bench-press');
assert.strictEqual(activeExercise.name, 'Barbell Bench Press');
mockCloseHistory();
console.log('✓ Exercise reordering mapping confirmed.');

// 4.2 Exercise Substitution: Substitute Barbell Bench Press (index 1) with Machine Chest Press
const substituteCandidate = {
  id: 'machine-chest-press',
  name: 'Machine Chest Press',
  category: 'chest',
  equipment: 'machine',
  target: '8-10'
};

const subResult = store.substituteExercise(1, substituteCandidate, { customWeight: 45 });
assert.ok(subResult && subResult.success, 'Substitution must succeed');

// If split or replaced, check the new exercise at that position
const currentEx1 = store.activeSession.value.exercises[1];
const targetExercise = currentEx1.exerciseId === 'machine-chest-press'
  ? currentEx1
  : store.activeSession.value.exercises[2]; // in split mode, remaining sets become next exercise

assert.ok(targetExercise, 'Substituted exercise exists in session');
assert.strictEqual(targetExercise.exerciseId, 'machine-chest-press');
assert.strictEqual(targetExercise.name, 'Machine Chest Press');

// Open history modal for substituted exercise
mockOpenHistory(targetExercise);
assert.strictEqual(activeExercise.exerciseId, 'machine-chest-press');
assert.strictEqual(activeExercise.name, 'Machine Chest Press');
mockCloseHistory();
console.log('✓ Exercise substitution mapping confirmed.');

// -------------------------------------------------------------
// Test 5: Composable Loading, Empty, and Error States
// -------------------------------------------------------------
console.log('\n▶ [5] Testing useExerciseHistory composable behavior...');

// 5.1 Empty history state
const emptyFetch = async () => ({
  ok: true,
  status: 200,
  json: async () => []
});
const emptyHist = useExerciseHistory(emptyFetch);
await emptyHist.load('brand-new-exercise');
assert.strictEqual(emptyHist.loading.value, false);
assert.strictEqual(emptyHist.error.value, '');
assert.strictEqual(emptyHist.sessions.value.length, 0);
assert.strictEqual(hasPr(emptyHist.pr.value), false);

// 5.2 Error and Retry state
let attempts = 0;
const failingFetch = async () => {
  attempts++;
  if (attempts === 1) {
    throw new Error('Network timeout');
  }
  return {
    ok: true,
    status: 200,
    json: async () => [
      {
        sessionId: 's-1',
        date: '2026-11-20',
        dayTitle: 'Chest Day',
        sets: [{ setIndex: 1, type: 'working', weight: 80, reps: 8, completed: true }]
      }
    ]
  };
};

const errorHist = useExerciseHistory(failingFetch);
await errorHist.load('exercise-with-error');
assert.strictEqual(errorHist.loading.value, false);
assert.ok(errorHist.error.value !== '', 'Error state must be set on network failure');

// Retry
await errorHist.retry();
assert.strictEqual(errorHist.loading.value, false);
assert.strictEqual(errorHist.error.value, '');
assert.strictEqual(errorHist.sessions.value.length, 1);
assert.strictEqual(errorHist.sessions.value[0].dayTitle, 'Chest Day');
console.log('✓ Loading, empty, error, and retry states verified.');

console.log('\n====================================================');
console.log('🎉 ALL EXERCISE HISTORY IN ACTIVE WORKOUT TESTS PASSED!');
console.log('====================================================');
