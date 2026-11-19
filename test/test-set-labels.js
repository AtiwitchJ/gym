import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { labelSets, labelFor } from '../src/composables/setLabels.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: set numbering in history (advanced item 2, regular item 4)');
console.log('====================================================\n');

// Saved shape from the app: setIndex counts the warm-up as 1; the table has 1 warm-up + 3 working sets.
const logged = [
  { setIndex: 1, type: 'วอร์ม', weight: 35, actualReps: 15, done: true },
  { setIndex: 2, type: 'เล่นจริง', weight: 70, actualReps: 8, done: true },
  { setIndex: 3, type: 'เล่นจริง', weight: 70, actualReps: 8, done: true },
  { setIndex: 4, type: 'เล่นจริง', weight: '', actualReps: '', done: false }
];

console.log('▶ [1] Warm-up is W1; working sets are S1 and S2 (not S2 and S3)...');
const rows = labelSets(logged);
assert.deepStrictEqual(rows.map((r) => r.label), ['W1', 'S1', 'S2'], 'labels count warm-up and working sets separately');
assert.ok(!rows.some((r) => r.label.startsWith('S') && r.set.type === 'วอร์ม'), 'warm-up is never an S-number');
console.log('✓ Labels verified.');

console.log('▶ [2] An empty set that was never ticked is not shown (no "S4 ข้าม")...');
assert.ok(!rows.some((r) => r.set.setIndex === 4), 'the empty fourth set is hidden');
assert.ok(!JSON.stringify(rows).includes('ข้าม'), 'the word ข้าม never appears');
console.log('✓ Empty sets hidden.');

console.log('▶ [3] A typed but unticked set is shown as unticked, with its own label...');
const typed = labelSets([
  { setIndex: 1, type: 'เล่นจริง', weight: 70, actualReps: 8, done: true },
  { setIndex: 2, type: 'เล่นจริง', weight: 12, actualReps: '', done: false }
]);
assert.deepStrictEqual(typed.map((r) => [r.label, r.status]), [['S1', 'done'], ['S2', 'unticked']]);
console.log('✓ Unticked status verified.');

console.log('▶ [4] Labels for Excel match the rows...');
assert.strictEqual(labelFor(logged, 0), 'W1');
assert.strictEqual(labelFor(logged, 2), 'S2');
assert.strictEqual(labelFor(logged, 3), '', 'a hidden set has no label');
console.log('✓ Excel labels verified.');

console.log('▶ [5] Wiring: the modal, the History chips and the Excel export use the labels...');
const modal = read('src/components/ExerciseHistoryModal.vue');
assert.ok(modal.includes('v-for="row in labelSets(session.sets)"') && modal.includes('{{ row.label }} {{ setLabel(row.set) }}'), 'modal rows use labels');
assert.ok(!modal.includes('S{{ set.setIndex }}'), 'modal no longer prints the raw set index');
const hist = read('src/components/HistoryView.vue');
assert.ok(hist.includes('v-for="row in labelSets(ex.sets)"') && hist.includes('{{ row.label }}:'), 'History chips use labels');
assert.ok(!hist.includes("{{ set.type === 'วอร์ม' ? 'W' : 'S' }}{{ set.setIndex }}"), 'History no longer prints the raw index');
const excel = read('src/composables/useExcelExport.js');
assert.ok(excel.includes("labelFor(ex.sets, idx) || '-'") && excel.includes("'ยังไม่ได้ติ๊ก'"), 'Excel uses labels and the unticked status');
assert.ok(!excel.includes("'ข้าม'"), 'Excel never writes ข้าม');
console.log('✓ Wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL SET-LABEL TESTS PASSED!');
console.log('====================================================');
