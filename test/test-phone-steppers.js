import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: value box and library button on a phone (phone item 3)');
console.log('====================================================\n');

console.log('▶ [1] Stepper rows on a phone: ActiveWorkoutSheet stacks; ExerciseCard puts weight and reps side by side (density step 1)...');
{
  const sheet = read('src/components/ActiveWorkoutSheet.vue');
  assert.ok(sheet.includes('<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">'), 'ActiveWorkoutSheet stacks on phones');
  assert.ok(!sheet.includes('<div class="grid grid-cols-2 gap-2 mt-2">'), 'ActiveWorkoutSheet no longer forces two columns on a phone');
  const card = read('src/components/ExerciseCard.vue');
  assert.ok(card.includes('class="flex items-stretch gap-1.5 mt-1.5"'), 'ExerciseCard steppers share one row on phones');
  assert.ok(card.includes('flex-1 min-w-0 h-11 sm:h-14'), 'ExerciseCard value box has room (44 px on phones)');
}
console.log('✓ Stepper rows checked.');

console.log('▶ [2] The exercise library button is at least 44 px tall...');
const wv = read('src/components/WorkoutsView.vue');
assert.ok(wv.includes('class="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4'), 'library button has min-h 44');
console.log('✓ Library button 44 px.');

console.log('\n====================================================');
console.log('🎉 ALL PHONE STEPPER TESTS PASSED!');
console.log('====================================================');
