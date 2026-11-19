import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { usePinKeypad, MAX_WEIGHT_INPUT, MAX_REPS_INPUT } from '../src/composables/usePinKeypad.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: keypad entry (beginner tester item 1)');
console.log('====================================================\n');

const k = usePinKeypad();
const open = (mode, value) => k.openKeypad({ mode, currentValue: value, onConfirm: () => {} });

console.log('▶ [1] The first digit replaces the pre-filled value (35 + 1 was 351 before)...');
open('weight', 35);
k.append(1);
assert.strictEqual(k.displayValue.value, '1', 'first digit replaces 35');
k.append(2);
assert.strictEqual(k.displayValue.value, '12', 'later digits append');
console.log('✓ Fresh entry verified.');

console.log('▶ [2] A typo cannot grow past the limit (3510 kg was saved before)...');
open('weight', 350);
k.append(3); k.append(5); k.append(1); k.append(0);
assert.ok(Number(k.displayValue.value) <= MAX_WEIGHT_INPUT, `value stays at or below ${MAX_WEIGHT_INPUT}, got ${k.displayValue.value}`);
assert.strictEqual(MAX_WEIGHT_INPUT, 400);
open('weight', 0);
k.append(4); k.append(0); k.append(1);
assert.strictEqual(k.displayValue.value, '40', 'a digit that would go above 400 is refused');
console.log('✓ Limit verified.');

console.log('▶ [3] Reps have their own limit and no decimals...');
assert.strictEqual(MAX_REPS_INPUT, 99);
open('reps', 8);
k.append('.');
assert.strictEqual(k.displayValue.value, '8', 'a dot does not clear the reps value');
k.append(1); k.append(2); k.append(0);
assert.strictEqual(k.displayValue.value, '12', 'reps stop at 99');
console.log('✓ Reps rules verified.');

console.log('▶ [4] Backspace and clear still work after a fresh start...');
open('weight', 70);
k.backspace();
assert.strictEqual(k.displayValue.value, '7', 'backspace edits the pre-filled value');
k.clear();
assert.strictEqual(k.displayValue.value, '', 'clear empties it');
k.append(9);
assert.strictEqual(k.displayValue.value, '9', 'digits work after clear');
console.log('✓ Edit actions verified.');

console.log('▶ [5] The clear button is always shown and is 44 px...');
const pad = fs.readFileSync(path.join(root, 'src/components/PinKeypad.vue'), 'utf8');
assert.ok(!pad.includes('v-if="displayValue"\n              @click="clear"'), 'clear is not hidden when empty');
assert.ok(pad.includes('@click="clear"\n              class="min-h-[44px] min-w-[44px]'), 'clear is 44 px');
console.log('✓ Clear button verified.');

console.log('\n====================================================');
console.log('🎉 ALL KEYPAD ENTRY TESTS PASSED!');
console.log('====================================================');
