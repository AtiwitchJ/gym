import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { weightText } from '../src/composables/setLabels.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: history shows the weight or says none was entered (language item 4)');
console.log('====================================================\n');

console.log('▶ [1] A recorded weight shows as a number...');
assert.strictEqual(weightText({ weight: 70 }), '70 กก.');
assert.strictEqual(weightText({ weight: '22.5' }), '22.5 กก.');
console.log('✓ Numbers verified.');

console.log('▶ [2] No weight shows a plain sentence, never a bare unit...');
for (const w of [undefined, null, '', 0, '0', 'abc', -5]) {
  assert.strictEqual(weightText({ weight: w }), 'ไม่ได้ใส่น้ำหนัก', `weight ${String(w)} shows the sentence`);
}
assert.strictEqual(weightText(undefined), 'ไม่ได้ใส่น้ำหนัก', 'no set is safe');
console.log('✓ Empty cases verified.');

console.log('▶ [3] The history row uses it...');
const hist = fs.readFileSync(path.join(root, 'src/components/HistoryView.vue'), 'utf8');
assert.ok(hist.includes('{{ row.label }}: {{ weightText(row.set) }}'), 'chip uses weightText');
assert.ok(!hist.includes("(row.set.weight !== undefined && row.set.weight !== '') ? row.set.weight : 0"), 'the old 0 fallback is gone');
console.log('✓ History row verified.');

console.log('\n====================================================');
console.log('🎉 ALL HISTORY-WEIGHT TESTS PASSED!');
console.log('====================================================');
