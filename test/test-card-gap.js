import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Density step 7 (phone, 390 px): the gap between exercise cards is 8 px on phones
 * (16 px from 640 px). The list spacing and each card's bottom margin use the same steps,
 * so the collapsed margin is 8 px.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8');
const card = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
const cardTemplate = card.split('<script setup>')[0];

console.log('====================================================');
console.log('🧪 QA Test: Exercise card gap on phones (density step 7)');
console.log('====================================================\n');

console.log('▶ [1] Card bottom margin: 8 px on phones, 16 px from 640 px...');
assert.ok(cardTemplate.includes('class="archive-card mb-2 sm:mb-4 overflow-hidden"'), 'ExerciseCard mb-2 on phones, mb-4 from 640 px');
console.log('  ✓ mb-2 on phones\n');

console.log('▶ [2] List spacing: 8 px on phones, 12 px from 640 px...');
assert.ok(app.includes('<div class="space-y-2 sm:space-y-3">\n          <ExerciseCard'), 'list uses space-y-2 on phones');
console.log('  ✓ space-y-2 on phones\n');

console.log('✅ card gap checks passed');
