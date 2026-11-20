import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Density step 6 (phone, 390 px): the long plan table ("แผนและเป้าหมายรอบหน้า") is collapsed
 * under a one-line summary button (44 px). It opens on tap; from 640 px the table is always open.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
const template = src.split('<script setup>')[0];

console.log('====================================================');
console.log('🧪 QA Test: Plan table collapsed on phones (density step 6)');
console.log('====================================================\n');

console.log('▶ [1] A one-line summary button, 44 px, phone only...');
const btnStart = template.indexOf('แผนและเป้าหมายรอบหน้า · {{ exercise.sets.length }} เซ็ต');
assert.ok(btnStart > 0, 'summary line present');
const btnTag = template.slice(template.lastIndexOf('<button', btnStart), btnStart);
assert.ok(btnTag.includes('sm:hidden') && btnTag.includes('min-h-[44px]'), 'summary button is phone-only and 44 px');
assert.ok(btnTag.includes(':aria-expanded="showPlan'), 'summary exposes aria-expanded');
assert.ok(template.includes('<span class="truncate">แผนและเป้าหมายรอบหน้า'), 'summary is one line (truncated)');
console.log('  ✓ one-line summary button\n');

console.log('▶ [2] The table is hidden on phones until opened, always open from 640 px...');
assert.ok(template.includes(":class=\"showPlan ? '' : 'hidden sm:block'\""), 'table hidden on phones unless opened');
assert.ok(src.includes('const showPlan = ref(false);'), 'showPlan starts closed');
console.log('  ✓ collapsed on phones, open on desktop\n');

console.log('✅ plan table collapsed checks passed');
