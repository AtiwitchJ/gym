import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { useWorkoutStore, flushPendingSave } from '../src/composables/useWorkoutStore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: unsent server copy is flushed when the app closes (beginner item 2)');
console.log('====================================================\n');

const store = useWorkoutStore();
store.currentDay.value = 'prog_a';
const ex = store.workoutData.prog_a.exercises[0];

console.log('▶ [1] A typed weight is kept locally at once...');
store.updateWeight('prog_a', ex.id, 1, '12');
assert.strictEqual(store.userState.prog_a[ex.id].wt_1, '12', 'the weight is in the day state right away');
console.log('✓ Local copy written.');

console.log('▶ [2] Closing the app sends the pending server copy, with keepalive...');
const calls = [];
const recordingFetch = async (url, options) => {
  calls.push({ url, options });
  return { ok: true, status: 200, json: async () => ({}) };
};
const sent = await flushPendingSave(recordingFetch);
assert.strictEqual(sent, true, 'the pending copy is sent on close');
assert.strictEqual(calls.length, 1, 'exactly one request');
assert.strictEqual(calls[0].url, '/api/state');
assert.strictEqual(calls[0].options.method, 'POST');
assert.strictEqual(calls[0].options.keepalive, true, 'keepalive so it finishes while the page closes');
const body = JSON.parse(calls[0].options.body);
assert.strictEqual(body.dayKey, 'prog_a');
assert.strictEqual(body.state[ex.id].wt_1, '12', 'the typed 12 kg is in the body');
console.log('✓ Pending copy sent on close.');

console.log('▶ [3] Nothing is sent twice...');
const again = await flushPendingSave(recordingFetch);
assert.strictEqual(again, false, 'a second flush has nothing to send');
assert.strictEqual(calls.length, 1, 'still one request');
console.log('✓ No double send.');

console.log('▶ [4] Wiring: the page-hide and tab-hidden listeners are registered...');
const src = fs.readFileSync(path.join(root, 'src/composables/useWorkoutStore.js'), 'utf8');
assert.ok(src.includes("window.addEventListener('pagehide'"), 'pagehide flushes the pending copy');
assert.ok(src.includes("document.visibilityState === 'hidden') flushPendingSave()"), 'a hidden tab flushes too');
console.log('✓ Listeners verified.');

console.log('\n====================================================');
console.log('🎉 ALL PENDING-SAVE TESTS PASSED!');
console.log('====================================================');
