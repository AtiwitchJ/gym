import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasTickedSets } from '../src/composables/useRestPanel.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: one status on the วันนี้ screens (language item 2)');
console.log('====================================================\n');

console.log('▶ [1] A rest weekday keeps the program view while today has ticked sets...');
assert.strictEqual(hasTickedSets(undefined), false, 'no state -> no progress');
assert.strictEqual(hasTickedSets({ a1: { wt_1: '70' } }), false, 'typed but unticked is not progress');
assert.strictEqual(hasTickedSets({ a1: { set_1: true } }), true, 'a ticked set is progress');
assert.strictEqual(hasTickedSets({ a1: { set_1: false }, b2: { set_0: true } }), true, 'a ticked set in any exercise counts');
console.log('✓ Progress rule verified.');

console.log('▶ [2] The rest view and the tab name the same status and program...');
const rest = read('src/components/RestDayView.vue');
assert.ok(!rest.includes('ACTIVE RECOVERY PROTOCOL'), 'the English recovery eyebrow is gone');
assert.ok(rest.includes('วันนี้เป็นวันพัก ฟื้นฟูร่างกาย'), 'the rest title says it is a rest day');
assert.ok(rest.includes('{{ nextHint }}') && rest.includes('nextProgramHint(todayProgramKey.value)'), 'the next-session card names the program');
const tabs = read('src/components/DayTabs.vue');
assert.ok(tabs.includes("return workoutStore.todayProgramKey?.value === 'prog_b' ? 'Program B' : 'Program A';"), 'the tab names the same next program');
console.log('✓ One status verified.');

console.log('\n====================================================');
console.log('🎉 ALL TODAY-STATUS TESTS PASSED!');
console.log('====================================================');
