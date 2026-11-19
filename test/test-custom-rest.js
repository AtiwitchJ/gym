import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { useTimer, clampRestSeconds, REST_MIN_SECONDS, REST_MAX_SECONDS } from '../src/composables/useTimer.js';
import {
  parseRestInput,
  getCustomRest,
  saveCustomRest,
  readRestMap,
  CUSTOM_REST_STORAGE_KEY
} from '../src/composables/useCustomRest.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// A fake storage that outlives module state, so "reload" = read again from it.
function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    raw: data
  };
}

console.log('====================================================');
console.log('🧪 QA Test: Custom rest per exercise (gap item 5)');
console.log('====================================================\n');

console.log('▶ [1] Accept 10–600 whole seconds, reject everything else...');
assert.strictEqual(REST_MIN_SECONDS, 10);
assert.strictEqual(REST_MAX_SECONDS, 600);
assert.deepStrictEqual(parseRestInput('10'), { ok: true, seconds: 10 });
assert.deepStrictEqual(parseRestInput('600'), { ok: true, seconds: 600 });
assert.deepStrictEqual(parseRestInput(' 120 '), { ok: true, seconds: 120 }, 'spaces are trimmed');
for (const bad of ['9', '0', '601', '-10', '', '   ', 'abc', '90.5', '1e2', '12s']) {
  assert.strictEqual(parseRestInput(bad).ok, false, `"${bad}" must be rejected`);
}
console.log('✓ Input range and format verified.');

console.log('▶ [2] The timer clamps every duration to 10–600...');
assert.strictEqual(clampRestSeconds(5), 10);
assert.strictEqual(clampRestSeconds(9999), 600);
assert.strictEqual(clampRestSeconds(120), 120);
assert.strictEqual(clampRestSeconds(NaN), 90, 'not a number falls back to 90');
const timer = useTimer();
timer.setTimerDuration(5);
assert.strictEqual(timer.timerDuration.value, 10, 'setTimerDuration clamps low');
assert.strictEqual(timer.timerRemaining.value, 10);
timer.setTimerDuration(5000);
assert.strictEqual(timer.timerDuration.value, 600, 'setTimerDuration clamps high');
console.log('✓ Clamp verified.');

console.log('▶ [3] +30s and -15s still work on a custom value...');
timer.setTimerDuration(120);
timer.adjustRemaining(30);
assert.strictEqual(timer.timerRemaining.value, 150);
timer.adjustRemaining(-15);
assert.strictEqual(timer.timerRemaining.value, 135);
console.log('✓ Steppers verified.');

console.log('▶ [4] Stored per exercise and still there after a reload...');
const storage = memoryStorage();
assert.strictEqual(getCustomRest('a1', storage), null, 'nothing saved yet');
assert.deepStrictEqual(saveCustomRest('a1', '150', storage), { ok: true, seconds: 150 });
assert.deepStrictEqual(saveCustomRest('b2', '60', storage), { ok: true, seconds: 60 });
// "reload": read the value again from storage only
assert.strictEqual(getCustomRest('a1', storage), 150, 'a1 survives reload');
assert.strictEqual(getCustomRest('b2', storage), 60, 'b2 survives reload');
assert.strictEqual(getCustomRest('c3', storage), null, 'other exercises are unaffected');
assert.ok(storage.raw.has(CUSTOM_REST_STORAGE_KEY), 'stored under the localStorage key');
console.log('✓ Per-exercise storage verified.');

console.log('▶ [5] Invalid input is not saved; broken storage is ignored...');
assert.strictEqual(saveCustomRest('a1', '5', storage).ok, false);
assert.strictEqual(getCustomRest('a1', storage), 150, 'old value kept after a rejected save');
assert.strictEqual(saveCustomRest(null, '120', storage).ok, false, 'no exercise, no save');
storage.setItem(CUSTOM_REST_STORAGE_KEY, '{not json');
assert.deepStrictEqual(readRestMap(storage), {}, 'broken JSON gives an empty map');
storage.setItem(CUSTOM_REST_STORAGE_KEY, JSON.stringify({ a1: 9999 }));
assert.strictEqual(getCustomRest('a1', storage), null, 'a stored value outside the range is ignored');
assert.strictEqual(getCustomRest('a1', null), null, 'no storage at all is safe');
console.log('✓ Rejections and broken storage handled.');

console.log('▶ [6] Wiring: RestTimer input, ExerciseCard applies the saved value on Done...');
const rest = fs.readFileSync(path.join(root, 'src/components/RestTimer.vue'), 'utf8');
assert.ok(rest.includes('v-model="restInput"') && rest.includes('@click="saveRest"'), 'custom input and save button');
assert.ok(rest.includes('min-h-[44px] w-20'), 'input is 44 px tall');
assert.ok(rest.includes('min-h-[44px] min-w-[44px] px-2.5 rounded-xl'), 'save button is 44 px');
assert.ok(rest.includes("import { getCustomRest, saveCustomRest } from '../composables/useCustomRest.js';"), 'RestTimer uses the storage helpers');
assert.ok(rest.includes('{{ preset }}s') && rest.includes('[60, 90, 120, 180]'), 'presets are unchanged');
const card = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
assert.ok(card.includes('const saved = getCustomRest(props.exercise.id);') && card.includes('if (saved) setTimerDuration(saved);'), 'Done applies this exercise\'s saved rest');
console.log('✓ Wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL CUSTOM-REST TESTS PASSED!');
console.log('====================================================');
