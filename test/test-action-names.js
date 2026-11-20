import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: one name for save, finish and reset (language item 3)');
console.log('====================================================\n');

const app = read('src/App.vue');
const sheet = read('src/components/ActiveWorkoutSheet.vue');
const header = read('src/components/HeaderBar.vue');
const store = read('src/composables/useWorkoutStore.js');
const history = read('src/components/HistoryView.vue');

console.log('▶ [1] Saving the day is called "บันทึกการฝึกวันนี้" everywhere...');
assert.ok(app.includes('<span>บันทึกการฝึกวันนี้</span>'), 'day-view save button');
assert.ok(sheet.includes('<span>บันทึกการฝึก</span>') && sheet.includes('title="บันทึกการฝึกและจบรอบนี้"'), 'recording-sheet finish button');
assert.ok(history.includes('ให้กดปุ่ม "บันทึกการฝึกวันนี้"'), 'history help text names the same button');
assert.ok(!app.includes('Save Session') && !sheet.includes('เสร็จสิ้น') && !history.includes('บันทึกประวัติและจำน้ำหนัก'), 'no old save names remain in the UI');
console.log('✓ Save name verified.');

console.log('▶ [2] The result is shown in plain words...');
assert.ok(store.includes('showToast(`บันทึกแล้ว (${totalSetsDone} เซ็ต)`);'), 'the save toast says บันทึกแล้ว');
assert.ok(!store.includes('รีเซ็ตพร้อมสำหรับรอบถัดไป'), 'the toast no longer uses the reset wording');
console.log('✓ Result wording verified.');

console.log('▶ [3] Status and reset are named plainly...');
assert.ok(header.includes("'กำลังบันทึก...' : 'บันทึกในเครื่องแล้ว'"), 'status: กำลังบันทึก / บันทึกในเครื่องแล้ว');
assert.ok(!header.includes('SAVED') && !header.includes('SYNCING'), 'no SAVED / SYNCING in the header');
assert.ok(header.includes('<span class="hidden sm:inline">ล้างการติ๊ก</span>'), 'the reset button is ล้างการติ๊ก (words from 640 px; icon on phones)');
assert.ok(!header.includes('          RESET\n'), 'no RESET button text');
assert.ok(header.includes('ล้างการติ๊กของวันนี้ (ไม่ลบประวัติ)'), 'reset says it does not delete history');
console.log('✓ Status and reset verified.');

console.log('\n====================================================');
console.log('🎉 ALL ACTION-NAME TESTS PASSED!');
console.log('====================================================');
