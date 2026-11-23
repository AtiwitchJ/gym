import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: plain Thai set-screen labels and help lines (language item 1)');
console.log('====================================================\n');

const card = read('src/components/ExerciseCard.vue');
const sheet = read('src/components/ActiveWorkoutSheet.vue');
const hist = read('src/components/ExerciseHistoryModal.vue');

console.log('▶ [1] Set codes are gone from the set screen...');
assert.ok(!card.includes("'W1'") && !card.includes('`S${sIdx}`'), 'no W1 / S-number labels on the card');
assert.ok(!card.includes('MAIN LIFT') && !card.includes('ASSISTANCE'), 'no MAIN LIFT / ASSISTANCE tags');
assert.ok(card.includes("'ท่าหลัก' : 'ท่าช่วย'"), 'main and assistance are Thai');
assert.ok(card.includes('getSetTypeLabel(getSetTypeFor(sIdx))') && card.includes('getSetTypeBadge(getSetTypeFor(sIdx), sIdx + 1)'), 'set rows use the set-type label/badge helpers');
assert.ok(card.includes("const setLabel = isWarm ? 'วอร์ม' : `เซ็ต ${sIdx}`"), 'set rows keep Thai วอร์ม / เซ็ต N labels');
const setTypes = read('src/composables/useSetTypes.js');
assert.ok(
  setTypes.includes("name: 'เซ็ตปกติ'") &&
  setTypes.includes("name: 'เซ็ตวอร์มอัพ'") &&
  setTypes.includes("name: 'ดรอปเซ็ต'") &&
  setTypes.includes("name: 'เซ็ตล้มเหลว'"),
  'all four set types have Thai labels'
);
console.log('✓ Card labels verified.');

console.log('▶ [2] The recording sheet header and type toggle are plain Thai...');
assert.ok(sheet.includes('>ครั้งก่อน</div>') && sheet.includes('>น้ำหนัก (กก.)</div>') && sheet.includes('>จำนวนครั้ง</div>'), 'header in Thai');
assert.ok(!sheet.includes('>PREV<') && !sheet.includes('>KG (นน.)<') && !sheet.includes('>REPS (ครั้ง)<'), 'no English header codes');
assert.ok(sheet.includes("case 'working':\n    default:\n      return 'ทำจริง';") && sheet.includes("return 'วอร์ม';"), 'type toggle words');
assert.ok(!sheet.includes("return 'W';") && !sheet.includes("return 'R';"), 'no W/R letters on the toggle');
console.log('✓ Sheet verified.');

console.log('▶ [3] PR and RIR are explained on the screen...');
assert.ok(hist.includes('PR คือการยกที่ดีที่สุดเท่าที่บันทึกไว้'), 'PR has a one-line explanation');
assert.ok(card.includes('ความเหนื่อย RIR (ไม่บังคับ):'), 'the RIR row is named');
assert.ok(card.includes('เหลือ 2+ = ยังเหลือแรงอีก 2 ครั้งขึ้นไป · เหลือ 1 = อีก 1 ครั้ง · ล้ม = ยกต่อไม่ได้'), 'the RIR row explains its three choices');
console.log('✓ Help lines verified.');

console.log('\n====================================================');
console.log('🎉 ALL LANGUAGE-CODE TESTS PASSED!');
console.log('====================================================');
