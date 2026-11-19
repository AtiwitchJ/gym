import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: value box and library button on a phone (phone item 3)');
console.log('====================================================\n');

console.log('▶ [1] The weight and reps rows stack on a phone, so the value box has room...');
for (const f of ['src/components/ExerciseCard.vue', 'src/components/ActiveWorkoutSheet.vue']) {
  const src = read(f);
  assert.ok(src.includes('<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">'), `${f} stacks on phones`);
  assert.ok(!src.includes('<div class="grid grid-cols-2 gap-2 mt-2">'), `${f} no longer forces two columns on a phone`);
}
console.log('✓ Stepper rows stack on phones.');

console.log('▶ [2] The exercise library button is at least 44 px tall...');
const wv = read('src/components/WorkoutsView.vue');
assert.ok(wv.includes('class="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4'), 'library button has min-h 44');
console.log('✓ Library button 44 px.');

console.log('\n====================================================');
console.log('🎉 ALL PHONE STEPPER TESTS PASSED!');
console.log('====================================================');
