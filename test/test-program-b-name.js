import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { workoutData } from '../src/data/workouts.js';
import { PROGRAM_B } from '../src/data/abSplit.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const CANON = 'ขา + แขน + ไหล่/บ่า';

console.log('====================================================');
console.log('🧪 QA Test: Program B has one name everywhere (language item 5)');
console.log('====================================================\n');

console.log('▶ [1] The day data and the split data use the same name...');
assert.ok(workoutData.prog_b.title.includes(CANON), 'day title');
assert.ok(PROGRAM_B.title.includes(CANON), 'split title');
console.log('✓ Data names verified.');

console.log('▶ [2] The card and the routine template use the same name...');
assert.ok(read('src/components/WorkoutsView.vue').includes(CANON), 'card label');
assert.ok(read('src/data/defaultRoutines.js').includes('Program B: ' + CANON), 'routine template title');
console.log('✓ Card and template verified.');

console.log('▶ [3] The old variants are gone from the app...');
for (const rel of ['src/components/WorkoutsView.vue', 'src/data/defaultRoutines.js', 'src/data/abSplit.js', 'src/data/workouts.js']) {
  const src = read(rel);
  assert.ok(!src.includes('ขา + แขน + คอ บ่า ไหล่'), `${rel}: old long name is gone`);
  assert.ok(!src.includes('ขา+แขน+ไหล่<'), `${rel}: old short card name is gone`);
}
console.log('✓ No old variants.');

console.log('\n====================================================');
console.log('🎉 ALL PROGRAM-B NAME TESTS PASSED!');
console.log('====================================================');
