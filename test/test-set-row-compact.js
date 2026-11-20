import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Density step 1 (phone, 390 px): each set row is two lines.
 * Line 1: set label, target, advice badge. Line 2: weight and reps steppers side by side, then Done.
 * Every control in the set rows is at least 44 px; the value box keeps its number and unit on one line.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
const template = src.split('<script setup>')[0];

console.log('====================================================');
console.log('🧪 QA Test: Set row density on phones (density step 1)');
console.log('====================================================\n');

console.log('▶ [1] Steppers and Done share one line...');
assert.ok(template.includes('<!-- Bottom line: weight and reps steppers side by side, then Done'), 'bottom line is the steppers line');
assert.ok(template.includes('class="flex items-stretch gap-1.5 mt-1.5"'), 'one flex row for the bottom line');
const groups = template.match(/class="flex flex-1 items-center gap-0\.5 sm:gap-1 min-w-0"/g) || [];
assert.strictEqual(groups.length, 2, 'weight and reps steppers each take half the row');
console.log('  ✓ weight and reps steppers side by side, Done on the same line\n');

console.log('▶ [2] Controls are 44 px on phones (56 px from 640 px up)...');
const setRows = template.slice(template.indexOf('<!-- Sets List -->'), template.indexOf('<!-- Exercise history & PR'));
assert.ok(!setRows.includes('w-14 h-14 flex-shrink-0 rounded-xl border-2 border-plate bg-surface'), 'no 56 px stepper left on phones');
assert.ok(!setRows.includes('flex-1 min-w-0 h-14 rounded-xl'), 'no 56 px value box left on phones');
assert.ok(setRows.includes('w-11 h-11 sm:w-14 sm:h-14'), 'Done and steppers: 44 px phone, 56 px desktop');
assert.ok(setRows.includes('flex-1 min-w-0 h-11 sm:h-14'), 'value boxes: 44 px phone, 56 px desktop');
const buttonTags = setRows.match(/<button\b[\s\S]*?>/g) || [];
assert.ok(buttonTags.length >= 6, `expected the set controls, found ${buttonTags.length}`);
for (const tag of buttonTags) {
  assert.ok(/\bh-11\b|min-h-\[44px\]/.test(tag), `set-row control under 44 px: ${tag.slice(0, 100)}`);
}
console.log(`  ✓ ${buttonTags.length} set-row buttons at 44 px or more on phones\n`);

console.log('▶ [3] The value keeps its number and unit on one line...');
assert.ok(setRows.includes('items-baseline justify-center gap-1'), 'value box lays out number and unit in a row');
assert.ok(!/leading-none mt-0\.5/.test(setRows), 'no stacked unit under the number');
console.log('  ✓ number and unit inline\n');

console.log('▶ [4] Row padding is tighter on phones...');
assert.ok(setRows.includes('px-2.5 sm:px-4 py-2 sm:py-3 transition-colors'), 'set row padding py-2 on phones');
console.log('  ✓ py-2 on phones\n');

console.log('✅ set row density checks passed');
