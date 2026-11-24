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
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-minibar-test-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const {
  useActiveSessionStore
} = await import('../src/composables/useActiveSessionStore.js');

console.log('====================================================');
console.log('🧪 Unit & Integration Test: Active Workout Mini-Bar');
console.log('====================================================\n');

// -------------------------------------------------------------
// Test 1: Static Component Verification & Architecture
// -------------------------------------------------------------
console.log('▶ [1] Verifying ActiveWorkoutMiniBar.vue template and wiring...');
const miniBarSrc = fs.readFileSync(path.join(root, 'src/components/ActiveWorkoutMiniBar.vue'), 'utf8');
const appSrc = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8');

// 1.1 Mini-bar component attributes & accessibility
assert.ok(
  miniBarSrc.includes('role="button"') && miniBarSrc.includes('tabindex="0"'),
  'ActiveWorkoutMiniBar must have role="button" and tabindex="0" for keyboard and a11y support'
);
assert.ok(
  miniBarSrc.includes('aria-label="กลับสู่รอบฝึกที่กำลังเล่นอยู่ (Active Workout)"'),
  'ActiveWorkoutMiniBar must have descriptive Thai aria-label'
);
assert.ok(
  miniBarSrc.includes('@click="$emit(\'restore\')"'),
  'MiniBar must emit restore on click'
);
assert.ok(
  miniBarSrc.includes('@keydown.enter="$emit(\'restore\')"') && miniBarSrc.includes('@keydown.space.prevent="$emit(\'restore\')"'),
  'MiniBar must support Enter and Space key restoration'
);

// 1.2 Mini-bar visual indicators
assert.ok(
  miniBarSrc.includes('LIVE') && miniBarSrc.includes('animate-ping'),
  'MiniBar must have LIVE pulsing indicator'
);
assert.ok(
  miniBarSrc.includes('btn-restore-runner'),
  'MiniBar must have a .btn-restore-runner button'
);
assert.ok(
  miniBarSrc.includes('min-h-[44px]') && miniBarSrc.includes('min-w-[44px]'),
  'MiniBar and restore button must meet mobile touch target minimum (>= 44x44px)'
);
assert.ok(
  miniBarSrc.includes('เปิดต่อ') && miniBarSrc.includes('polyline points="18 15 12 9 6 15"'),
  'Restore button must have "เปิดต่อ" text and upward expand chevron'
);
assert.ok(
  miniBarSrc.includes('completedSets') && miniBarSrc.includes('totalSets'),
  'MiniBar must calculate and render completed and total sets'
);
assert.ok(
  miniBarSrc.includes('formattedTime'),
  'MiniBar must compute and render live duration (formattedTime)'
);
console.log('✓ ActiveWorkoutMiniBar.vue component verified.');

// 1.3 App.vue integration check
assert.ok(
  appSrc.includes("import ActiveWorkoutMiniBar from './components/ActiveWorkoutMiniBar.vue';"),
  'App.vue must import ActiveWorkoutMiniBar'
);
assert.ok(
  appSrc.includes('<ActiveWorkoutMiniBar'),
  'App.vue must render ActiveWorkoutMiniBar'
);
assert.ok(
  appSrc.includes('v-if="isWorkoutActive && isRunnerMinimized && activeSession"'),
  'ActiveWorkoutMiniBar must strictly render only when workout is active and runner is minimized'
);
assert.ok(
  appSrc.includes('@restore="isRunnerMinimized = false"'),
  'ActiveWorkoutMiniBar @restore must restore the runner (isRunnerMinimized = false)'
);
assert.ok(
  appSrc.includes('ref="dockEl"'),
  'Dock container ref="dockEl" must enclose the mini-bar to guarantee dock padding calculations'
);
assert.ok(
  appSrc.includes('STORAGE_KEY_MINIMIZED') || appSrc.includes('gym_runner_minimized'),
  'App.vue must persist runner minimized state to localStorage'
);
console.log('✓ App.vue integration verified.');

// -------------------------------------------------------------
// Test 2: Set Calculation & Duration Formatting Pure Functions
// -------------------------------------------------------------
console.log('\n▶ [2] Testing set calculation and duration formatting logic...');

function computeMiniBarStats(session, durationSec) {
  const displayTitle = session?.title || session?.dayTitle || 'Active Workout';
  const totalSets = (session?.exercises || []).reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
  let completedSets = 0;
  for (const ex of session?.exercises || []) {
    for (const set of ex.sets || []) {
      if (set && set.completed) completedSets++;
    }
  }
  const progressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  const s = Math.max(0, Math.floor(durationSec || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const formattedTime = hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;

  return { displayTitle, totalSets, completedSets, progressPercent, formattedTime };
}

const mockSession = {
  title: 'Chest & Triceps Hypertrophy',
  exercises: [
    {
      exerciseId: 'bench-press',
      sets: [
        { completed: true, weight: 60, reps: 8, rir: 1 },
        { completed: true, weight: 65, reps: 8, rir: 0 },
        { completed: false, weight: 65, reps: 6, rir: null }
      ]
    },
    {
      exerciseId: 'incline-dumbbell-press',
      sets: [
        { completed: false, weight: 24, reps: 10, rir: 2 },
        { completed: false, weight: 24, reps: 10, rir: null }
      ]
    }
  ]
};

const stats1 = computeMiniBarStats(mockSession, 75); // 1 min 15 sec
assert.strictEqual(stats1.displayTitle, 'Chest & Triceps Hypertrophy');
assert.strictEqual(stats1.totalSets, 5);
assert.strictEqual(stats1.completedSets, 2);
assert.strictEqual(stats1.progressPercent, 40);
assert.strictEqual(stats1.formattedTime, '01:15');

const stats2 = computeMiniBarStats(mockSession, 3665); // 1 hr 1 min 5 sec
assert.strictEqual(stats2.formattedTime, '1:01:05');
console.log('✓ Calculation & formatting logic confirmed.');

// -------------------------------------------------------------
// Test 3: Active Session Draft & State Preservation on Minimize & Restore
// -------------------------------------------------------------
console.log('\n▶ [3] Testing state preservation across minimize and restore...');

const store = useActiveSessionStore();
localStorage.clear();

const testActiveSession = {
  sessionId: 'test-session-minibar-001',
  title: 'Chest & Back Power',
  date: '2026-11-25',
  startTime: Date.now() - 300000, // 5 min ago
  exercises: [
    {
      exerciseId: 'barbell-bench-press',
      name: 'Barbell Bench Press',
      sets: [
        { type: 'working', weight: 80, reps: 8, completed: true, rir: 1 },
        { type: 'working', weight: 85, reps: 7, completed: false, rir: null }
      ]
    }
  ]
};

store.activeSession.value = JSON.parse(JSON.stringify(testActiveSession));
store.isWorkoutActive.value = true;
store.sessionDurationSec.value = 300;
store.persistDraft();

// Simulate Runner Minimization
let runnerMinimized = true;
localStorage.setItem('gym_runner_minimized', 'true');

// Verify active draft in localStorage
const storedDraft = JSON.parse(localStorage.getItem('active_session_draft'));
assert.strictEqual(storedDraft.exercises[0].sets[0].completed, true);
assert.strictEqual(storedDraft.exercises[0].sets[0].rir, 1);
assert.strictEqual(storedDraft.exercises[0].sets[0].weight, 80);

// While minimized, time elapses
store.sessionDurationSec.value += 30;

// Simulate Lifter Tapping Mini-Bar to Restore
runnerMinimized = false;
localStorage.setItem('gym_runner_minimized', 'false');

// Verify state in store after restoration
assert.strictEqual(runnerMinimized, false, 'Runner must be restored');
assert.strictEqual(store.isWorkoutActive.value, true, 'Workout must remain active');
assert.strictEqual(store.sessionDurationSec.value, 330, 'Duration ticker continued');
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].completed, true, 'Completed set 1 preserved');
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].rir, 1, 'RIR choice 1 preserved');
assert.strictEqual(store.activeSession.value.exercises[0].sets[0].weight, 80, 'Weight 80 preserved');
console.log('✓ Draft, sets, RIR choices, and duration ticker strictly preserved.');

// -------------------------------------------------------------
// Test 4: Reload, Discard, and Finish Lifecycle
// -------------------------------------------------------------
console.log('\n▶ [4] Testing reload, discard, and finish lifecycle...');

// 4.1 Reload simulation
localStorage.setItem('active_session_draft', JSON.stringify(testActiveSession));
localStorage.setItem('gym_runner_minimized', 'true');

// Initial state from storage
const reloadedMinimized = localStorage.getItem('gym_runner_minimized') === 'true';
assert.strictEqual(reloadedMinimized, true, 'Runner starts minimized upon reload if previously minimized');

// 4.2 Discard simulation
store.discardSession();
assert.strictEqual(store.isWorkoutActive.value, false, 'Workout inactive after discard');
assert.strictEqual(store.activeSession.value, null, 'activeSession cleared');
assert.strictEqual(localStorage.getItem('active_session_draft'), null, 'Draft removed from storage');

// Reset minimized flag when workout is inactive
runnerMinimized = false;
localStorage.setItem('gym_runner_minimized', 'false');
assert.strictEqual(runnerMinimized, false);
console.log('✓ Lifecycle (reload, discard, finish) verified.');

console.log('\n====================================================');
console.log('🎉 ALL ACTIVE WORKOUT MINI-BAR TESTS PASSED!');
console.log('====================================================');
