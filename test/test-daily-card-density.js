import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Density step 3 (phone, 390 px): the daily card is smaller.
 * Padding 12 px on phones (16 px from 640 px), title 16 px on phones (18 px from 640 px),
 * the description is hidden on phones, and the progress block spacing is tighter on phones.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: Daily card density on phones (density step 3)');
console.log('====================================================\n');

const cardStart = app.indexOf('<!-- Routine Banner -->');
const cardEnd = app.indexOf('<!-- Next Session Overview Bar -->');
assert.ok(cardStart > 0 && cardEnd > cardStart, 'daily card block found');
const card = app.slice(cardStart, cardEnd);

console.log('▶ [1] Card padding is 12 px on phones...');
assert.ok(card.includes('class="archive-card p-3 sm:p-4 mb-4"'), 'card padding p-3 on phones, p-4 from 640 px');
console.log('  ✓ p-3 on phones\n');

console.log('▶ [2] Title is 16 px on phones, 18 px from 640 px...');
assert.ok(card.includes('class="text-base sm:text-lg font-bold font-heading text-ink tracking-tight"'), 'title text-base on phones');
console.log('  ✓ text-base on phones\n');

console.log('▶ [3] Description hidden on phones, shown from 640 px...');
assert.ok(card.includes('class="hidden sm:block text-xs text-ink-muted mt-0.5 font-body"'), 'subtitle hidden below 640 px');
assert.ok(card.includes('{{ currentDayData.subtitle }}'), 'subtitle text still rendered for wider screens');
console.log('  ✓ subtitle hidden on phones\n');

console.log('▶ [4] Progress block spacing is tighter on phones...');
assert.ok(card.includes('class="mt-2.5 pt-2 sm:mt-3.5 sm:pt-3 border-t-2 border-plate/10"'), 'progress spacing mt-2.5 pt-2 on phones');
console.log('  ✓ mt-2.5 pt-2 on phones\n');

console.log('✅ daily card density checks passed');
