import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modal = fs.readFileSync(path.join(root, 'src/components/WorkoutSummaryModal.vue'), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: the summary can be closed without saving (regular item 1, close part)');
console.log('====================================================\n');

console.log('▶ [1] A plain close (✕) exists and only emits close...');
assert.ok(modal.includes('title="ปิดหน้าสรุป (ไม่บันทึกซ้ำ)"') && modal.includes("@click=\"emit('close')\""), 'close button emits close');
assert.ok(modal.includes('absolute top-2 right-2 min-h-[44px] min-w-[44px]'), 'close button is in the header, 44 px');
console.log('✓ Plain close verified.');

console.log('▶ [2] The summary does not save anything itself...');
assert.ok(!modal.includes('saveSession') && !modal.includes('/api/') && !modal.includes('fetch('), 'no save or network call in the modal');
assert.ok(!modal.includes('Save & Close'), 'the button no longer promises a save');
assert.ok(modal.includes('ปิดและกลับสู่หน้าหลัก (ไม่บันทึกซ้ำ)'), 'the main button says it closes and does not save again');
console.log('✓ No save in the summary.');

console.log('\n====================================================');
console.log('🎉 ALL SUMMARY CLOSE TESTS PASSED!');
console.log('====================================================');
