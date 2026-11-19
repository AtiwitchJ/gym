import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  saveKeypadDraft,
  readKeypadDraft,
  clearKeypadDraft,
  applyKeypadDraft,
  KEYPAD_DRAFT_KEY
} from '../src/composables/usePinKeypad.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    raw: data
  };
}

console.log('====================================================');
console.log('🧪 QA Test: a reload restores the typed value and never writes history (data-integrity item 1)');
console.log('====================================================\n');

console.log('▶ [1] A typed value survives a reload (stored while typing, read back)...');
const storage = memoryStorage();
const draft = { draftKey: { dayKey: 'prog_a', exId: 'a1_chest_press', field: 'wt', setIdx: 1 }, mode: 'weight', value: '47.5' };
saveKeypadDraft(draft, storage);
assert.ok(storage.raw.has(KEYPAD_DRAFT_KEY), 'the draft is stored');
const back = readKeypadDraft(storage);
assert.deepStrictEqual(back, draft, 'the draft reads back the same after a reload');
console.log('✓ Draft survives reload.');

console.log('▶ [2] Restoring fills the set row with the typed value, not the old one...');
const state = { prog_a: { a1_chest_press: { wt_1: '60', reps_1: '12' } } };
assert.strictEqual(applyKeypadDraft(state, back), true);
assert.strictEqual(state.prog_a.a1_chest_press.wt_1, '47.5', 'typed 47.5 wins over stale 60');
assert.strictEqual(state.prog_a.a1_chest_press.reps_1, '12', 'other fields are untouched');
const repsDraft = { draftKey: { dayKey: 'prog_a', exId: 'a1_chest_press', field: 'reps', setIdx: 1 }, value: '9' };
assert.strictEqual(applyKeypadDraft(state, repsDraft), true);
assert.strictEqual(state.prog_a.a1_chest_press.reps_1, '9', 'typed reps 9 wins over stale 12');
console.log('✓ Restored values verified.');

console.log('▶ [3] Nothing is restored from an empty or broken draft, and the draft is cleared...');
assert.strictEqual(applyKeypadDraft(state, { draftKey: { dayKey: 'prog_a', exId: 'a1', field: 'wt', setIdx: 1 }, value: '' }), false);
assert.strictEqual(applyKeypadDraft(state, { draftKey: { dayKey: 'prog_a', exId: 'a1', field: 'bogus', setIdx: 1 }, value: '5' }), false);
assert.strictEqual(applyKeypadDraft(state, null), false);
clearKeypadDraft(storage);
assert.strictEqual(readKeypadDraft(storage), null, 'cleared after the restore');
storage.setItem(KEYPAD_DRAFT_KEY, '{broken');
assert.strictEqual(readKeypadDraft(storage), null, 'a broken draft is ignored');
console.log('✓ Empty and broken drafts ignored.');

console.log('▶ [4] Wiring: the day-view keypads name their target; closing clears the draft...');
const card = read('src/components/ExerciseCard.vue');
assert.ok(card.includes("draftKey: { dayKey: currentDay.value, exId: props.exercise.id, field: 'wt', setIdx: sIdx }"), 'weight keypad names its set');
assert.ok(card.includes("draftKey: { dayKey: currentDay.value, exId: props.exercise.id, field: 'reps', setIdx: sIdx }"), 'reps keypad names its set');
const keypad = read('src/composables/usePinKeypad.js');
assert.ok(keypad.includes('function closeKeypad() {\n  isOpen.value = false;\n  currentDraftKey = null;\n  clearKeypadDraft();'), 'closing clears the draft');
console.log('✓ Wiring verified.');

console.log('▶ [5] The reload path never writes history: only recordSessionToHistory posts to /api/history...');
const store = read('src/composables/useWorkoutStore.js');
const historyPosts = [...store.matchAll(/fetch\('\/api\/history', \{\s*method: 'POST'/g)].map((m) => m.index);
const recordStart = store.indexOf('async function recordSessionToHistory');
const recordEnd = store.indexOf('\n}\n', recordStart);
assert.ok(historyPosts.length >= 1, 'a history write exists');
assert.ok(historyPosts.every((i) => i > recordStart && i < recordEnd), 'every history write (POST) is inside recordSessionToHistory');
const restoreBlock = store.slice(store.indexOf('// Restore a value that was being typed'), store.indexOf('// Initial heal pass on store startup'));
assert.ok(!restoreBlock.includes('recordSessionToHistory') && !restoreBlock.includes('/api/history'), 'the restore never writes history');
console.log('✓ No history write on reload.');

console.log('\n====================================================');
console.log('🎉 ALL RELOAD-DRAFT TESTS PASSED!');
console.log('====================================================');
