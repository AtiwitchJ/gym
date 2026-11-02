import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { useActiveSessionStore, calculateTotalWorkingVolume } from '../src/composables/useActiveSessionStore.js';
import { useWeightAdvisor } from '../src/composables/useWeightAdvisor.js';
import { useTimer } from '../src/composables/useTimer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing Active Workout Sheet & Summary Modal Contract...');

// 1. Component File Existence Checks
const sheetPath = path.resolve(__dirname, '../src/components/ActiveWorkoutSheet.vue');
const summaryPath = path.resolve(__dirname, '../src/components/WorkoutSummaryModal.vue');
const appPath = path.resolve(__dirname, '../src/App.vue');

assert(fs.existsSync(sheetPath), 'ActiveWorkoutSheet.vue must exist');
assert(fs.existsSync(summaryPath), 'WorkoutSummaryModal.vue must exist');
assert(fs.existsSync(appPath), 'App.vue must exist');

const sheetContent = fs.readFileSync(sheetPath, 'utf8');
const summaryContent = fs.readFileSync(summaryPath, 'utf8');
const appContent = fs.readFileSync(appPath, 'utf8');

// 2. ActiveWorkoutSheet Contract Checks
assert(sheetContent.includes('useActiveSessionStore'), 'ActiveWorkoutSheet consumes useActiveSessionStore');
assert(sheetContent.includes('usePinKeypad'), 'ActiveWorkoutSheet consumes usePinKeypad');
assert(sheetContent.includes('openKeypad'), 'ActiveWorkoutSheet invokes openKeypad on tap targets');
assert(sheetContent.includes('useWeightAdvisor'), 'ActiveWorkoutSheet integrates useWeightAdvisor for overload advice');
assert(sheetContent.includes('ExerciseLibraryModal'), 'ActiveWorkoutSheet integrates ExerciseLibraryModal');
assert(sheetContent.includes('sessionDurationSec') || sheetContent.includes('formatTime'), 'ActiveWorkoutSheet includes stopwatch timer');
assert(sheetContent.includes('discardSession') || sheetContent.includes('handleDiscard'), 'ActiveWorkoutSheet supports discarding session with confirmation');
assert(sheetContent.includes('finishSession') || sheetContent.includes('handleFinish'), 'ActiveWorkoutSheet supports finishing session');
assert(sheetContent.includes('toggleSetComplete'), 'ActiveWorkoutSheet supports checkmark toggling set completion');
assert(sheetContent.includes('addSet'), 'ActiveWorkoutSheet supports adding sets to exercises');
assert(sheetContent.includes('bg-emerald'), 'ActiveWorkoutSheet uses emerald color for completed checkmarks');

// Table column headers check: SET, PREV, KG, REPS, checkmark
assert(sheetContent.includes('SET') || sheetContent.includes('เซ็ต'), 'ActiveWorkoutSheet has SET column header');
assert(sheetContent.includes('PREV') || sheetContent.includes('ครั้งก่อน'), 'ActiveWorkoutSheet has PREV column header');
assert(sheetContent.includes('KG') || sheetContent.includes('นน.'), 'ActiveWorkoutSheet has KG column header');
assert(sheetContent.includes('REPS') || sheetContent.includes('ครั้ง'), 'ActiveWorkoutSheet has REPS column header');

// 3. WorkoutSummaryModal Contract Checks
assert(summaryContent.includes('isOpen'), 'WorkoutSummaryModal accepts isOpen prop');
assert(summaryContent.includes('summary'), 'WorkoutSummaryModal accepts summary prop');
assert(summaryContent.includes('emit(\'close\')') || summaryContent.includes('emit("close")'), 'WorkoutSummaryModal emits close');
assert(summaryContent.includes('totalVolumeKg') || summaryContent.includes('Volume'), 'WorkoutSummaryModal displays total volume lifted');
assert(summaryContent.includes('durationSec') || summaryContent.includes('Duration'), 'WorkoutSummaryModal displays duration');
assert(summaryContent.includes('completedSets') || summaryContent.includes('totalSets'), 'WorkoutSummaryModal displays completed sets');
assert(summaryContent.includes('บันทึกและกลับสู่หน้าหลัก') || summaryContent.includes('Save & Close'), 'WorkoutSummaryModal has save & close button');

// 4. App.vue Wiring Checks
assert(appContent.includes('ActiveWorkoutSheet'), 'App.vue includes ActiveWorkoutSheet');
assert(appContent.includes('WorkoutSummaryModal'), 'App.vue includes WorkoutSummaryModal');
assert(appContent.includes('isWorkoutActive'), 'App.vue conditionally renders ActiveWorkoutSheet based on isWorkoutActive');
assert(appContent.includes('lastWorkoutSummary') || appContent.includes('summary'), 'App.vue handles workout summary state');

// 5. Store finishSession contract enriched fields verification
const store = useActiveSessionStore();
store.discardSession();

store.startSessionFromRoutine({
  id: 'test_contract_routine',
  title: 'Legs & Calves Hypertrophy',
  exercises: [
    {
      exerciseId: 'barbell_squat',
      sets: [
        { type: 'warmup', targetReps: 15, targetWeight: 50, weight: 50, reps: 15 },
        { type: 'working', targetReps: 8, targetWeight: 100, weight: 100, reps: 8 },
        { type: 'working', targetReps: 8, targetWeight: 100, weight: 100, reps: 8 }
      ]
    }
  ]
});

// User completes all 3 sets during workout
store.toggleSetComplete(0, 0); // warmup
store.toggleSetComplete(0, 1); // working 100 * 8 = 800 kg
store.toggleSetComplete(0, 2); // working 100 * 8 = 800 kg

const timer = useTimer();
timer.pauseTimer();
timer.resetTimer();

const summary = store.finishSession();
assert(summary !== null, 'finishSession should return summary object');
assert.strictEqual(summary.title, 'Legs & Calves Hypertrophy', 'Summary has title');
assert(typeof summary.durationSec === 'number', 'Summary has numeric durationSec');
assert.strictEqual(summary.totalVolumeKg, 1600, 'Summary totalVolumeKg excludes warmups (100*8 + 100*8 = 1600)');
assert.strictEqual(summary.completedSetsCount, 3, 'Summary has completedSetsCount');
assert.strictEqual(summary.totalSetsCount, 3, 'Summary has totalSetsCount');
assert(summary.startedAt, 'Summary has startedAt timestamp');
assert(summary.completedAt || summary.finishedAt, 'Summary has completedAt timestamp');

console.log('✓ All Active Workout Sheet & Summary Modal contract tests passed successfully!');
