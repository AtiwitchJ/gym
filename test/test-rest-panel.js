import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setLabel, nextUndoneSet, restHint } from '../src/composables/useRestPanel.js';
import { useTimer } from '../src/composables/useTimer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: Rest panel — next set, hint, skip (step 4)');
console.log('====================================================\n');

// Fixture day: two main exercises (warm-up + 2 working), one bonus exercise with 1 set.
const dayData = {
  exercises: [
    { id: 'e1', name: 'Bench', sets: [{ type: 'warm' }, { type: 'working' }, { type: 'working' }] },
    { id: 'e2', name: 'Row', sets: [{ type: 'working' }, { type: 'working' }] }
  ],
  bonusExercises: [{ id: 'b1', name: 'Curl', sets: [{ type: 'working' }] }]
};

console.log('▶ [1] Set labels: warm-up is วอร์ม, working sets are เซ็ต <index>...');
assert.strictEqual(setLabel({ type: 'warm' }, 0), 'วอร์ม');
assert.strictEqual(setLabel({ type: 'working' }, 2), 'เซ็ต 2');
console.log('✓ Labels verified.');

console.log('▶ [2] Next undone set walks in order, then bonus, then null...');
let state = {};
assert.deepStrictEqual(nextUndoneSet(dayData, state), { exerciseId: 'e1', exerciseName: 'Bench', setIndex: 0, label: 'วอร์ม' });
state = { e1: { set_0: true } };
assert.strictEqual(nextUndoneSet(dayData, state).label, 'เซ็ต 1', 'after the warm-up, next is เซ็ต 1');
state = { e1: { set_0: true, set_1: true, set_2: true } };
assert.deepStrictEqual(nextUndoneSet(dayData, state).exerciseId, 'e2', 'next exercise after all of Bench');
state = { e1: { set_0: true, set_1: true, set_2: true }, e2: { set_0: true, set_1: true } };
assert.strictEqual(nextUndoneSet(dayData, state).exerciseId, 'b1', 'bonus exercise comes after the main ones');
state = { e1: { set_0: true, set_1: true, set_2: true }, e2: { set_0: true, set_1: true }, b1: { set_0: true } };
assert.strictEqual(nextUndoneSet(dayData, state), null, 'all sets done -> null (last set)');
assert.strictEqual(nextUndoneSet(null, {}), null, 'missing day is safe');
console.log('✓ Next-set order verified.');

console.log('▶ [3] Hint text...');
assert.strictEqual(restHint(null), 'จบทุกท่าแล้ว — ข้ามพักได้เลย');
assert.strictEqual(restHint({ exerciseName: 'Row', label: 'เซ็ต 1' }), 'ต่อไป: Row · เซ็ต 1');
console.log('✓ Hint verified.');

console.log('▶ [4] Skip stops the countdown and sets it to 0...');
const timer = useTimer();
timer.setTimerDuration(90);
assert.strictEqual(timer.timerRemaining.value, 90);
timer.skipTimer();
assert.strictEqual(timer.timerRemaining.value, 0, 'skip sets remaining to 0');
assert.strictEqual(timer.isRunning.value, false, 'skip stops the timer');
console.log('✓ Skip verified.');

console.log('▶ [5] RestTimer wiring: skip button, next-set hint, larger controls...');
const rest = fs.readFileSync(path.join(root, 'src/components/RestTimer.vue'), 'utf8');
assert.ok(rest.includes('@click="onSkip"') && rest.includes('ข้ามพัก') && rest.includes('skipTimer();'), 'skip button present (collapses the compact panel)');
assert.ok(rest.includes('{{ nextHint }}'), 'next-set hint shown under the timer');
assert.ok(rest.includes("import { restHint } from '../composables/useRestPanel.js';"), 'RestTimer uses the rest panel helpers');
assert.ok(rest.includes("import { nextUndoneWithGroups, doneFromState } from '../composables/supersetRound.js';"), 'RestTimer "ต่อไป" is group-aware (superset round rule)');
assert.ok(rest.includes('min-h-[44px]'), 'controls are at least 44 px tall');
assert.ok(rest.includes('text-xl sm:text-3xl font-extrabold'), 'larger timer readout on desktop, compact on phones');
console.log('✓ RestTimer wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL REST-PANEL TESTS PASSED!');
console.log('====================================================');
