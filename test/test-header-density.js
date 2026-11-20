import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Density step 2 (phone, 390 px): the header is smaller.
 * The save-status pill shows from 640 px up only; the reset button is an icon on phones
 * (still 44 px and labelled for screen readers), and shows its words from 640 px up.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'src/components/HeaderBar.vue'), 'utf8');
const template = src.split('<script setup>')[0];

console.log('====================================================');
console.log('🧪 QA Test: Header density on phones (density step 2)');
console.log('====================================================\n');

console.log('▶ [1] Save-status pill is hidden on phones, shown from 640 px...');
const pill = template.slice(template.indexOf('<!-- Auto-save Pill -->'), template.indexOf('<!-- Image Preview Toggle -->'));
assert.ok(pill.includes('transition-all hidden sm:flex items-center gap-1 select-none'), 'pill hidden below 640 px');
assert.ok(!/transition-all flex items-center gap-1 select-none"/.test(pill), 'no always-visible pill class left');
console.log('  ✓ pill hidden on phones\n');

console.log('▶ [2] Reset is an icon on phones, labelled, 44 px, words from 640 px...');
const resetStart = template.indexOf('title="ล้างการติ๊กของวันนี้ (ไม่ลบประวัติ)"');
assert.ok(resetStart > 0, 'reset button found');
const resetBlock = template.slice(resetStart, template.indexOf('</button>', resetStart));
assert.ok(resetBlock.includes('aria-label="ล้างการติ๊กของวันนี้ (ไม่ลบประวัติ)"'), 'screen readers still get the full label');
assert.ok(/<svg class="w-3\.5 h-3\.5 sm:hidden/.test(resetBlock), 'icon shows on phones only');
assert.ok(/<span class="hidden sm:inline">ล้างการติ๊ก<\/span>/.test(resetBlock), 'words show from 640 px only');
const resetTag = template.slice(template.lastIndexOf('<button', resetStart), resetStart);
assert.ok(resetTag.includes('min-h-[44px] min-w-[44px]'), 'reset stays at 44 px');
console.log('  ✓ icon on phones, words from 640 px, 44 px kept\n');

console.log('✅ header density checks passed');
