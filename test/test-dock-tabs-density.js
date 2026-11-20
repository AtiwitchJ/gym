import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Density step 8 (phone, 390 px): the tab dock is shorter.
 * Tabs are 44 px on phones (56 px from 640 px) with 4 px vertical padding; the sub-label
 * under each tab is hidden on phones and shows from 640 px. Tap targets stay at 44 px.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'src/components/DayTabs.vue'), 'utf8');
const template = src.split('<script setup>')[0];

console.log('====================================================');
console.log('🧪 QA Test: Tab dock density on phones (density step 8)');
console.log('====================================================\n');

console.log('▶ [1] Tab nav padding is shorter on phones...');
assert.ok(template.includes('px-2 sm:px-4 py-1 pb-[max(4px,env(safe-area-inset-bottom))] select-none'), 'nav py-1 and 4 px bottom padding');
console.log('  ✓ py-1 on phones\n');

console.log('▶ [2] Tabs are 44 px on phones, 56 px from 640 px...');
assert.ok(template.includes('min-h-[44px] sm:min-h-[56px] py-1 sm:py-1.5'), 'tab height 44 px phone, 56 px desktop');
console.log('  ✓ 44 px tap target on phones\n');

console.log('▶ [3] Sub-labels hidden on phones, shown from 640 px...');
assert.ok(template.includes('<span class="hidden sm:block text-[11px] opacity-80 font-body font-normal truncate max-w-full">{{ tabSub(tab) }}</span>'), 'sub-label hidden on phones');
console.log('  ✓ sub-label phone-hidden\n');

console.log('✅ tab dock density checks passed');
