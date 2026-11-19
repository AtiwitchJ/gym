import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSessionSummary, prLabel } from '../src/composables/useSessionSummary.js';
import { useWorkoutStore } from '../src/composables/useWorkoutStore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: Session summary after Save with PR list (step 6b)');
console.log('====================================================\n');

const dayData = {
  title: 'Fixture Day',
  exercises: [
    { id: 'e1', name: 'Bench', sets: [{ type: 'warm' }, { type: 'working' }, { type: 'working' }] },
    { id: 'e2', name: 'Row', sets: [{ type: 'working' }, { type: 'working' }] }
  ],
  bonusExercises: [{ id: 'b1', name: 'Curl', sets: [{ type: 'working' }] }]
};

console.log('▶ [1] Counts sets done out of all sets (main + bonus)...');
const state = {
  e1: { set_0: true, set_1: true, wt_1: '40', reps_1: '9', pr_1: true },
  e2: { set_0: true, wt_0: '30', reps_0: '10' },
  b1: {}
};
const summary = buildSessionSummary(dayData, state);
assert.strictEqual(summary.title, 'Fixture Day');
assert.strictEqual(summary.setsTotal, 6, '3 + 2 main sets + 1 bonus set');
assert.strictEqual(summary.setsDone, 3);
console.log('✓ Set counts verified.');

console.log('▶ [2] Lists the PRs of the session with their values...');
assert.strictEqual(summary.prs.length, 1);
assert.deepStrictEqual(summary.prs[0], {
  exerciseId: 'e1', exerciseName: 'Bench', setIndex: 1, weight: '40', reps: '9'
});
assert.strictEqual(prLabel(summary.prs[0]), 'Bench 40 kg × 9');
assert.strictEqual(prLabel({ exerciseName: 'X', weight: '', reps: '' }), 'X —');
assert.strictEqual(buildSessionSummary(dayData, {}).prs.length, 0, 'no PR flags -> empty list');
assert.strictEqual(buildSessionSummary(null, {}).setsTotal, 0, 'missing day is safe');
console.log('✓ PR list verified.');

console.log('▶ [3] Store: the summary is built on save, before the reset, and closes...');
const store = useWorkoutStore();
store.currentDay.value = 'prog_a';
const firstA = store.workoutData.prog_a.exercises[0];
store.toggleSetDone('prog_a', firstA.id, 0);
store.updateWeight('prog_a', firstA.id, 0, '22.5');
store.updateReps('prog_a', firstA.id, 0, '9');
store.setPrFlag('prog_a', firstA.id, 0, true);
await store.finishAndSaveWorkout();
const saved = store.lastSessionSummary.value;
assert.ok(saved, 'summary is set after save');
assert.strictEqual(saved.setsDone, 1, 'one set was done');
assert.strictEqual(saved.prs.length, 1, 'the PR is in the summary');
assert.strictEqual(saved.prs[0].exerciseId, firstA.id);
assert.strictEqual(saved.prs[0].weight, '22.5', 'values are read before the reset');
assert.strictEqual(store.userState.prog_a[firstA.id].set_0, undefined, 'the day was reset after the summary was built');
store.closeSessionSummary();
assert.strictEqual(store.lastSessionSummary.value, null, 'closing clears the summary');
console.log('✓ Store path verified.');

console.log('▶ [4] App and modal wiring...');
const app = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8');
assert.ok(app.includes('<SessionSummaryModal') && app.includes(':summary="lastSessionSummary"'), 'App shows the session summary');
assert.ok(app.includes('closeSessionSummary'), 'App closes the summary');
const modal = fs.readFileSync(path.join(root, 'src/components/SessionSummaryModal.vue'), 'utf8');
assert.ok(modal.includes('เซ็ตที่ทำเสร็จ') && modal.includes('🏆 PR ในรอบนี้'), 'modal shows sets done and PRs');
assert.ok(modal.includes("defineEmits(['close'])"), 'modal emits close');
console.log('✓ Wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL SESSION-SUMMARY TESTS PASSED!');
console.log('====================================================');
