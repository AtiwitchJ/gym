import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  setHasValues,
  isSetDone,
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
 * Swipe / tap "copy set": copies weight, reps and RIR into the next set of the same exercise
 * (same kind: warm-up to warm-up, working to working) that is NOT ticked done.
 * Auto-filled values of that target are written over on purpose (harmonize fills sets 2-3 from set 1),
 * a ticked set is never touched, and a RIR the target already has is kept.
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
console.log('🧪 QA Test: Copy set (swipe and tap) into the next set that is not done');
console.log('====================================================\n');

console.log('▶ [1] A set "has values" when it has a weight, reps, RIR (even 0), or is done...');
assert.strictEqual(setHasValues({}, 0), false, 'empty set');
assert.strictEqual(setHasValues({ wt_0: '60' }, 0), true, 'weight');
assert.strictEqual(setHasValues({ reps_0: '8' }, 0), true, 'reps');
assert.strictEqual(setHasValues({ rir_0: 0 }, 0), true, 'RIR 0 is a value (ล้ม)');
assert.strictEqual(setHasValues({ rir_0: '' }, 0), false, 'blank RIR is not a value');
assert.strictEqual(setHasValues({ set_0: true }, 0), true, 'done counts as a value');
assert.strictEqual(setHasValues(null, 0), false);
assert.strictEqual(isSetDone({ set_1: true }, 1), true, 'ticked set is done');
assert.strictEqual(isSetDone({ set_1: false }, 1), false);
assert.strictEqual(isSetDone({ wt_1: '60' }, 1), false, 'a filled but unticked set is not done');
assert.strictEqual(isSetDone(null, 1), false);
console.log('  ✓ value and done rules\n');

console.log('▶ [2] Target: next set of the same kind that is not ticked done...');
const three = [work, work, work];
assert.strictEqual(findCopyTarget(three, { wt_0: '60' }, 0), 1, 'next unticked set is set 1');
assert.strictEqual(findCopyTarget(three, { wt_0: '60', reps_1: '8' }, 0), 1, 'auto-filled set 1 is still the target');
assert.strictEqual(findCopyTarget(three, { wt_0: '60', set_1: true }, 0), 2, 'ticked set 1 is skipped');
assert.strictEqual(findCopyTarget(three, { wt_0: '60', set_1: true, set_2: true }, 0), null, 'no unticked set left');
assert.strictEqual(findCopyTarget(three, { wt_2: '60' }, 2), null, 'last set has no next set');
const mixed = [warm, work, work];
assert.strictEqual(findCopyTarget(mixed, { wt_0: '20' }, 0), null, 'warm-up does not copy into working sets');
assert.strictEqual(findCopyTarget(mixed, { wt_1: '60' }, 1), 2, 'working copies to working');
const warmPair = [warm, warm, work];
assert.strictEqual(findCopyTarget(warmPair, { wt_0: '20' }, 0), 1, 'warm-up copies to warm-up');
console.log('  ✓ same kind, unticked only, auto-filled values do not block\n');

console.log('▶ [3] Source values: weight or reps needed; RIR and RIR 0 carried over...');
assert.strictEqual(sourceValues({}, 0), null, 'nothing to copy');
assert.strictEqual(sourceValues({ rir_0: 2 }, 0), null, 'RIR alone is not enough');
assert.deepStrictEqual(sourceValues({ wt_0: 60, reps_0: 8, rir_0: 0 }, 0), { weight: '60', reps: '8', rir: 0, rirPlus: false });
assert.deepStrictEqual(sourceValues({ wt_0: '70', reps_0: '6', rir_0: 2, rirPlus_0: true }, 0), { weight: '70', reps: '6', rir: 2, rirPlus: true });
console.log('  ✓ source values\n');

console.log('▶ [4] Plan and apply: set 2 values go into set 3, over the auto-filled numbers...');
// Harmonize put 100 x 8 into sets 2 and 3 from set 1; the user then did set 2 at 105 x 6.
const harmonized = { wt_1: '100', reps_1: '8', set_1: true, wt_2: '100', reps_2: '8' };
const plan = planCopy(three, harmonized, 1);
assert.strictEqual(plan.ok, true);
assert.strictEqual(plan.targetIdx, 2, 'set 2 is ticked, so the target is set 3');
const after = applyPlan(harmonized, plan);
assert.strictEqual(after.wt_2, '100', 'weight copied from set 2');
assert.strictEqual(after.reps_2, '8', 'reps copied from set 2');
assert.strictEqual(after.wt_1, '100', 'the source set is unchanged (weight)');
assert.strictEqual(after.reps_1, '8', 'the source set is unchanged (reps)');
assert.strictEqual(after.set_2, undefined, 'the target is not ticked done by the copy');

// The user typed set 2 as 105 x 6 with no tick yet; the copy still overwrites set 3.
const typed = { wt_1: '105', reps_1: '6', wt_2: '100', reps_2: '8' };
const plan2 = planCopy(three, typed, 1);
assert.strictEqual(plan2.targetIdx, 2, 'an unticked filled set is a valid target');
const after2 = applyPlan(typed, plan2);
assert.strictEqual(after2.wt_2, '105');
assert.strictEqual(after2.reps_2, '6');

// RIR: carried over when the target has none, the target's own RIR is kept when it has one.
const withRir = applyPlan({ wt_1: '60', reps_1: '8', rir_1: 1, wt_2: '60' }, planCopy(three, { wt_1: '60', reps_1: '8', rir_1: 1, wt_2: '60' }, 1));
assert.strictEqual(withRir.rir_2, 1, 'RIR copied to a target without one');
const keepRir = planCopy(three, { wt_1: '60', reps_1: '8', rir_1: 1, wt_2: '60', rir_2: 0 }, 1);
assert.strictEqual(keepRir.ok, true);
assert.strictEqual(keepRir.rir, null, 'a target RIR of 0 is kept (nothing written)');
console.log('  ✓ overwrites unticked auto-filled sets, never a ticked set, keeps a target RIR\n');

console.log('▶ [5] Plan messages: no source, no target (Thai)...');
const noSrc = planCopy(three, {}, 0);
assert.deepStrictEqual(noSrc, { ok: false, message: COPY_NO_SOURCE });
const noTgt = planCopy(three, { wt_0: '60', set_1: true, set_2: true }, 0);
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
