import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// Every <button> whose contents include one of these markers must have a 44 px minimum height.
const CONTROLS = {
  'src/components/ExerciseCard.vue': ['ดูประวัติและ PR', 'คำนวณแผ่น', 'ดึงสถิติ', '3 เครื่อง', 'opt.label'],
  'src/components/RestTimer.vue': ['{{ preset }}s', 'เริ่มจับเวลา', 'รีเซ็ตเวลา', '+30s', '-15s', 'ข้ามพัก'],
  'src/components/HeaderBar.vue': ['ซ่อนรูป', 'RESET'],
  'src/components/ActiveWorkoutSheet.vue': ['ย่อ', '+ ท่า', 'ยกเลิกการออกกำลังกายนี้', 'เสร็จสิ้น', 'ปิด', 'ลบเซ็ต', 'ประเภทเซ็ต', 'เพิ่มเซ็ต'],
  'src/components/WorkoutsView.vue': ['เริ่มฝึก (Start)', '📋 ตาราง', 'แก้ไข (Edit)', '⚡ เริ่มฝึก']
};

// End of the opening tag, skipping > inside quoted attribute values (e.g. v-if="a > 0").
function openTagEnd(text, start) {
  let quote = null;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '>') return i;
  }
  return -1;
}

function buttonsContaining(source, marker) {
  const out = [];
  let from = 0;
  for (;;) {
    const start = source.indexOf('<button', from);
    if (start < 0) break;
    const end = source.indexOf('</button>', start);
    if (end < 0) break;
    const block = source.slice(start, end + 9);
    from = end + 9;
    if (block.includes(marker)) out.push(block.slice(0, openTagEnd(block, 0) + 1));
  }
  return out;
}

console.log('====================================================');
console.log('🧪 QA Test: Controls at least 44 px (QA item 2)');
console.log('====================================================\n');

console.log('▶ [1] Listed controls have min-h-[44px]...');
let checked = 0;
for (const [file, markers] of Object.entries(CONTROLS)) {
  const source = read(file);
  for (const marker of markers) {
    const opens = buttonsContaining(source, marker);
    assert.ok(opens.length > 0, `${file}: no button found for "${marker}"`);
    for (const open of opens) {
      assert.ok(open.includes('min-h-[44px]'), `${file}: "${marker}" button is under 44 px: ${open.slice(0, 120)}`);
      checked++;
    }
  }
}
console.log(`✓ ${checked} controls checked.`);

console.log('▶ [2] No old sub-44 px height tokens remain on the RIR options...');
assert.ok(!read('src/components/ExerciseCard.vue').includes('min-h-[40px]'), 'RIR options must be 44 px, not 40');
assert.ok(read('src/components/ExerciseCard.vue').includes('min-h-[44px] min-w-[44px] px-3 rounded-xl border-2 border-plate text-xs font-heading font-bold'), 'RIR options are 44 px wide and tall');
console.log('✓ RIR options at 44 px.');

console.log('▶ [3] Recording sheet has the same steppers and 56 px Done as the set rows...');
const sheet = read('src/components/ActiveWorkoutSheet.vue');
assert.ok(sheet.includes('@click="stepSheetWeight(exIdx, setIdx, -1, set)"') && sheet.includes('@click="stepSheetWeight(exIdx, setIdx, 1, set)"'), 'weight ± on the sheet');
assert.ok(sheet.includes('@click="stepSheetReps(exIdx, setIdx, -1, set)"') && sheet.includes('@click="stepSheetReps(exIdx, setIdx, 1, set)"'), 'reps ± on the sheet');
assert.ok(sheet.includes('w-14 h-14 flex-shrink-0 rounded-xl border-2 border-plate flex items-center justify-center transition-all select-none touch-manipulation'), 'sheet Done is 56 px');
assert.ok(sheet.includes("import { stepFrom, WEIGHT_STEP_KG, REPS_STEP } from '../composables/useSetStepper.js';"), 'sheet uses the shared stepper math');
assert.ok(!sheet.includes('w-8 h-8 rounded-lg border-2 border-plate flex items-center justify-center transition-all select-none touch-manipulation'), 'old 32 px check is gone');
assert.ok(sheet.includes('min-h-[44px] min-w-[44px] px-2 rounded text-[10px]'), 'W/R set-type toggle is 44 px wide and tall');
console.log('✓ Sheet steppers, Done, and W/R toggle verified.');

console.log('\n====================================================');
console.log('🎉 ALL 44-PX AND SHEET TESTS PASSED!');
console.log('====================================================');
