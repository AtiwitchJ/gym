import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modal = fs.readFileSync(path.join(root, 'src/components/ExerciseHistoryModal.vue'), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: the PR panel explains an empty PR (beginner item 3, message part)');
console.log('====================================================\n');

console.log('▶ [1] The empty-PR message no longer says "no completed set" after a warm-up tick...');
assert.ok(!modal.includes('ยังไม่มีเซ็ตที่ทำเสร็จสำหรับท่านี้'), 'the misleading message is gone');
assert.ok(modal.includes('เซ็ตวอร์มไม่นับเป็น PR') && modal.includes('PR จะอัปเดตหลังบันทึกเซสชัน'), 'it says warm-ups do not count and PR updates after the save');
console.log('✓ Message verified.');

console.log('\n====================================================');
console.log('🎉 ALL PR EMPTY-MESSAGE TESTS PASSED!');
console.log('====================================================');
