import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rest = fs.readFileSync(path.join(root, 'src/components/RestTimer.vue'), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: rest bar fits a 375 px phone (phone item 1)');
console.log('====================================================\n');

console.log('▶ [1] The bar wraps instead of overflowing sideways...');
assert.ok(rest.includes('flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5'), 'outer bar wraps');
assert.ok(!rest.includes('overflow-x-auto scrollbar-none">'), 'presets no longer hide overflow off-screen');
assert.ok(rest.includes('<div class="flex flex-wrap items-center gap-1 sm:gap-1.5">'), 'the presets wrap inside the expanded panel');
assert.ok(rest.includes('<div class="flex flex-wrap items-center gap-1 flex-shrink-0">'), 'steppers wrap');
assert.ok(rest.includes('<div class="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-shrink-0">'), 'controls wrap');
console.log('✓ Wrapping verified.');

console.log('\n====================================================');
console.log('🎉 ALL PHONE REST-BAR TESTS PASSED!');
console.log('====================================================');
