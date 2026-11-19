import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { useWorkoutStore, markDayStarted, clearDayStarted, dayDurationSec } from '../src/composables/useWorkoutStore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: DURATION on the save path (regular item 1, duration part)');
console.log('====================================================\n');

console.log('▶ [1] The duration counts from the first ticked set...');
clearDayStarted('prog_a');
assert.strictEqual(dayDurationSec('prog_a', Date.now()), 0, 'not started -> 0');
markDayStarted('prog_a', Date.now() - 180000);
assert.strictEqual(dayDurationSec('prog_a'), 180, 'three minutes since the start');
markDayStarted('prog_a', Date.now() - 10000);
assert.strictEqual(dayDurationSec('prog_a'), 180, 'a second start does not move the first one');
console.log('✓ Start and elapsed time verified.');

console.log('▶ [2] Saving passes the real duration to the summary, then clears it...');
const store = useWorkoutStore();
store.currentDay.value = 'prog_a';
const ex = store.workoutData.prog_a.exercises[0];
clearDayStarted('prog_a');
markDayStarted('prog_a', Date.now() - 300000);
store.toggleSetDone('prog_a', ex.id, 1);
store.updateWeight('prog_a', ex.id, 1, '70');
store.updateReps('prog_a', ex.id, 1, '8');
await store.finishAndSaveWorkout();
const summary = store.lastSessionSummary.value;
assert.ok(summary.durationSec >= 299 && summary.durationSec <= 302, `duration about 300 s, got ${summary.durationSec}`);
assert.strictEqual(dayDurationSec('prog_a'), 0, 'the start is cleared after the save');
store.closeSessionSummary();
console.log('✓ Save path duration verified.');

console.log('▶ [3] The start survives a reload (stored, read back at start-up)...');
const src = fs.readFileSync(path.join(root, 'src/composables/useWorkoutStore.js'), 'utf8');
assert.ok(src.includes("const DAY_START_KEY = 'atiwitch_day_started';"), 'stored under its own key');
assert.ok(src.includes('dayStartMs = JSON.parse(storage.getItem(DAY_START_KEY)'), 'read back on start');
assert.ok(src.includes('async function resetDayData(day = currentDay.value) {\n  clearDayStarted(day);'), 'reset clears it');
console.log('✓ Persistence wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL DURATION TESTS PASSED!');
console.log('====================================================');
