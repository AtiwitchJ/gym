import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { programSetTotal } from '../src/data/workouts.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wv = fs.readFileSync(path.join(root, 'src/components/WorkoutsView.vue'), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: each program appears once, with one set count (secondary item 1)');
console.log('====================================================\n');

console.log('▶ [1] One 3-day block, one card per program...');
assert.strictEqual(wv.split('3-DAY A/B ALTERNATING PROTOCOL').length - 1, 1, 'the 3-day block appears once');
assert.strictEqual(wv.split('Program A & Program B').length - 1, 0, 'the second copy of the block is removed');
assert.strictEqual(wv.split('>Program A</span>').length - 1, 1, 'Program A card appears once');
assert.strictEqual(wv.split('>Program B</span>').length - 1, 1, 'Program B card appears once');
console.log('✓ No duplicate blocks.');

console.log('▶ [2] The routine list does not repeat the program templates...');
assert.ok(wv.includes("const PROGRAM_TEMPLATE_IDS = ['atiwitch_prog_a', 'atiwitch_prog_b', 'atiwitch_ab_program_a', 'atiwitch_ab_program_b'];"), 'templates are named');
assert.ok(wv.includes('const displayRoutines = computed(() => routines.value.filter((r) => !PROGRAM_TEMPLATE_IDS.includes(r.id)));'), 'the list uses the filtered routines');
assert.ok(wv.includes('v-for="routine in displayRoutines"') && wv.includes('{{ displayRoutines.length }}'), 'the list and its count use the filtered list');
assert.ok(wv.includes("getRoutineById('atiwitch_prog_a')") === false || wv.includes("launchProgramA"), 'the 1-click launch still exists');
console.log('✓ Routine list filtered.');

console.log('▶ [3] One set count per program, from the day data...');
assert.strictEqual(programSetTotal('prog_a'), 20, 'Program A: 20 sets');
assert.strictEqual(programSetTotal('prog_b'), 22, 'Program B: 22 sets');
assert.ok(wv.includes("{{ programSetTotal('prog_a') }} เซ็ต") && wv.includes("{{ programSetTotal('prog_b') }} เซ็ต"), 'cards show the same total');
assert.strictEqual(programSetTotal('nope'), 0, 'unknown program has no sets');
console.log('✓ One set count per program.');

console.log('\n====================================================');
console.log('🎉 ALL SECONDARY-PROGRAM TESTS PASSED!');
console.log('====================================================');
