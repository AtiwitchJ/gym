import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { programLabel, nextProgramHint } from '../src/composables/useRestPanel.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: Next program on the rest view + quick-start card buttons');
console.log('====================================================\n');

console.log('▶ [1] Program label and hint...');
assert.strictEqual(programLabel('prog_b'), 'Program B');
assert.strictEqual(programLabel('prog_a'), 'Program A');
assert.strictEqual(programLabel(null), 'Program A', 'no program yet -> Program A');
assert.strictEqual(nextProgramHint('prog_b'), 'ต่อไป: Program B · ต่อจากครั้งล่าสุดที่ทำเสร็จ');
console.log('✓ Label and hint verified.');

console.log('▶ [2] Rest view shows the next program and can open it...');
const rest = read('src/components/RestDayView.vue');
assert.ok(rest.includes('NEXT SESSION'), 'card label');
assert.ok(rest.includes('{{ nextHint }}'), 'shows the next-program hint');
assert.ok(rest.includes('nextProgramHint(todayProgramKey.value)'), 'hint comes from the store key');
assert.ok(rest.includes('@click="openNext"') && rest.includes('switchDay(todayProgramKey.value)'), 'button opens the next program');
assert.ok(rest.includes('min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl'), 'open button is 44 px');
console.log('✓ Rest view wiring verified.');

console.log('▶ [3] Quick-start cards: ⚡ เริ่มฝึก is the main button, 📋 ตาราง is a secondary link...');
const wv = read('src/components/WorkoutsView.vue');
assert.ok(wv.includes('<span>⚡ เริ่มฝึก</span>'), 'main button is ⚡ เริ่มฝึก');
assert.ok(!wv.includes('⚡ เริ่ม Program A (1-Click)') && !wv.includes('⚡ เริ่ม Program B (1-Click)'), 'old long labels are gone');
assert.ok(wv.includes('px-2 text-[11px] font-heading font-semibold text-ink-muted underline'), '📋 ตาราง is a text link, not a boxed button');
console.log('✓ Card buttons verified.');

console.log('\n====================================================');
console.log('🎉 ALL NEXT-PROGRAM REST VIEW TESTS PASSED!');
console.log('====================================================');
