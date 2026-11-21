import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  setHasValues,
  findCopyTarget,
  sourceValues,
  planCopy,
  isHorizontalSwipe,
  copiedMessage,
  COPY_NO_SOURCE,
  COPY_NO_TARGET,
  SWIPE_MIN_PX
} from '../src/composables/setCopy.js';

/**
 * Swipe / tap "copy previous set": copies weight, reps and RIR into the next empty set of the same
 * exercise (same kind: warm-up to warm-up, working to working). A set with values is never overwritten.
 * Vertical scrolling must keep working: the row uses touch-action pan-y, and only a clearly horizontal
 * drag counts as a swipe.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const work = { type: 'work' };
const warm = { type: 'warm' };

// Apply a plan to a state object the same way the card does (empty fields are not written).
function applyPlan(state, plan) {
  const next = { ...state };
  if (plan.weight !== '') next[`wt_${plan.targetIdx}`] = plan.weight;
  if (plan.reps !== '') next[`reps_${plan.targetIdx}`] = plan.reps;
  if (plan.rir !== null) {
    next[`rir_${plan.targetIdx}`] = plan.rir;
    next[`rirPlus_${plan.targetIdx}`] = plan.rirPlus;
  }
  return next;
}

console.log('====================================================');
console.log('🧪 QA Test: Copy previous set (swipe and tap), no overwrite, scroll still works');
console.log('====================================================\n');

console.log('▶ [1] A set "has values" when it has a weight, reps, RIR (even 0), or is done...');
assert.strictEqual(setHasValues({}, 0), false, 'empty set');
assert.strictEqual(setHasValues({ wt_0: '60' }, 0), true, 'weight');
assert.strictEqual(setHasValues({ reps_0: '8' }, 0), true, 'reps');
assert.strictEqual(setHasValues({ rir_0: 0 }, 0), true, 'RIR 0 is a value (ล้ม)');
assert.strictEqual(setHasValues({ rir_0: '' }, 0), false, 'blank RIR is not a value');
assert.strictEqual(setHasValues({ set_0: true }, 0), true, 'done counts as a value');
assert.strictEqual(setHasValues(null, 0), false);
console.log('  ✓ value rules\n');

console.log('▶ [2] Target: next empty set of the same kind, never a filled set...');
const three = [work, work, work];
assert.strictEqual(findCopyTarget(three, { wt_0: '60' }, 0), 1, 'next empty is set 1');
assert.strictEqual(findCopyTarget(three, { wt_0: '60', reps_1: '8' }, 0), 2, 'set 1 is filled, so set 2');
assert.strictEqual(findCopyTarget(three, { wt_0: '60', reps_1: '8', rir_2: 1 }, 0), null, 'no empty set left');
assert.strictEqual(findCopyTarget(three, { wt_2: '60' }, 2), null, 'last set has no next set');
const mixed = [warm, work, work];
assert.strictEqual(findCopyTarget(mixed, { wt_0: '20' }, 0), null, 'warm-up does not copy into working sets');
assert.strictEqual(findCopyTarget(mixed, { wt_1: '60' }, 1), 2, 'working copies to working');
console.log('  ✓ same kind, empty only\n');

console.log('▶ [3] Source values: weight or reps needed; RIR and RIR 0 carried over...');
assert.strictEqual(sourceValues({}, 0), null, 'nothing to copy');
assert.strictEqual(sourceValues({ rir_0: 2 }, 0), null, 'RIR alone is not enough');
assert.deepStrictEqual(sourceValues({ wt_0: 60, reps_0: 8, rir_0: 0 }, 0), { weight: '60', reps: '8', rir: 0, rirPlus: false });
assert.deepStrictEqual(sourceValues({ wt_0: '70', reps_0: '6', rir_0: 2, rirPlus_0: true }, 0), { weight: '70', reps: '6', rir: 2, rirPlus: true });
console.log('  ✓ source values\n');

console.log('▶ [4] Plan and apply: copies to the next empty set; a filled set stays exactly as it was...');
const state = { wt_0: '60', reps_0: '8', rir_0: 1, wt_1: '70', reps_1: '5' }; // set 1 already has values
const plan = planCopy(three, state, 0);
assert.strictEqual(plan.ok, true);
assert.strictEqual(plan.targetIdx, 2, 'skips the filled set 1');
const after = applyPlan(state, plan);
assert.strictEqual(after.wt_2, '60');
assert.strictEqual(after.reps_2, '8');
assert.strictEqual(after.rir_2, 1, 'RIR copied');
assert.strictEqual(after.wt_1, '70', 'filled set 1 unchanged (weight)');
assert.strictEqual(after.reps_1, '5', 'filled set 1 unchanged (reps)');
assert.strictEqual(after.rir_1, undefined, 'filled set 1 gets no RIR');
console.log('  ✓ copies to set 2; set 1 untouched\n');

console.log('▶ [5] Plan messages: no source, no target (Thai)...');
const noSrc = planCopy(three, {}, 0);
assert.deepStrictEqual(noSrc, { ok: false, message: COPY_NO_SOURCE });
const noTgt = planCopy(three, { wt_0: '60', wt_1: '60', wt_2: '60' }, 0);
assert.deepStrictEqual(noTgt, { ok: false, message: COPY_NO_TARGET });
assert.strictEqual(copiedMessage(2), 'คัดลอกไปเซ็ตที่ 2 แล้ว');
console.log('  ✓ no source and no target messages\n');

console.log('▶ [6] Swipe rule: far enough and clearly horizontal; a vertical drag never copies...');
assert.strictEqual(SWIPE_MIN_PX, 56);
assert.strictEqual(isHorizontalSwipe(80, 10), true, 'right swipe');
assert.strictEqual(isHorizontalSwipe(-80, 10), true, 'left swipe');
assert.strictEqual(isHorizontalSwipe(80, 60), false, 'diagonal is not a swipe (scroll wins)');
assert.strictEqual(isHorizontalSwipe(0, 200), false, 'vertical scroll never copies');
assert.strictEqual(isHorizontalSwipe(30, 0), false, 'too short');
assert.strictEqual(isHorizontalSwipe(56, 0), true, 'exactly the threshold');
console.log('  ✓ swipe thresholds\n');

console.log('▶ [7] Wiring: ExerciseCard uses the pan-y row, the same copy path for swipe and button, and no mouse swipe...');
const card = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
const tpl = card.split('<script setup>')[0];
assert.ok(tpl.includes('touch-pan-y'), 'set row allows vertical scroll (touch-action pan-y)');
assert.ok(tpl.includes('@pointerdown="onRowPointerDown($event, sIdx)"'), 'row pointer down');
assert.ok(tpl.includes('@pointerup="onRowPointerUp($event, sIdx)"'), 'row pointer up');
assert.ok(tpl.includes('@pointercancel="onRowPointerCancel"'), 'row pointer cancel');
assert.ok(!tpl.includes('@pointermove'), 'no move handler (decision on pointer up)');
assert.ok(tpl.includes('@click="copySetTo(sIdx)"'), 'the tap button calls copySetTo');
assert.ok(/onRowPointerUp[\s\S]*?copySetTo\(sIdx\)/.test(card), 'the swipe calls the same copySetTo');
assert.ok(card.includes("if (e.pointerType === 'mouse') return;"), 'mouse does not start a swipe');
assert.ok(card.includes("e.target.closest('button, input, textarea, a')"), 'a drag from a button does not start a swipe');
assert.ok(card.includes('if (plan.weight !== \'\') updateWeight('), 'writes only non-empty fields');
assert.ok(card.includes('showToast(copiedMessage(plan.targetIdx))'), 'Thai toast after copy');
const clickAt = tpl.indexOf('@click="copySetTo(sIdx)"');
const btn = tpl.slice(tpl.lastIndexOf('<button', clickAt), tpl.indexOf('>คัดลอก</button>', clickAt));
assert.ok(btn.includes('min-h-[44px] min-w-[44px]'), 'copy button is 44 px');
console.log('  ✓ same path, pan-y, no mouse swipe, 44 px button\n');

console.log('✅ set copy checks passed');
