import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Density step 4: the next-session plan summary ("แผนรอบหน้ารวม") sits inside the daily card,
 * under the progress bar, instead of as its own box below it.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8');
const overview = fs.readFileSync(path.join(root, 'src/components/NextSessionOverview.vue'), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: Plan summary folded into the daily card (density step 4)');
console.log('====================================================\n');

const cardStart = app.indexOf('<!-- Routine Banner -->');
const cardEnd = app.indexOf('<!-- Exercise Cards List -->');
assert.ok(cardStart > 0 && cardEnd > cardStart, 'daily card block found');
const card = app.slice(cardStart, cardEnd);

console.log('▶ [1] The plan summary is inside the card, after the progress bar...');
const overviewAt = card.indexOf('<NextSessionOverview');
assert.ok(overviewAt > card.indexOf('ความคืบหน้าท่าประจำวัน'), 'plan summary comes after the progress bar');
assert.ok(card.includes('embedded'), 'rendered in embedded mode');
console.log('  ✓ folded into the card\n');

console.log('▶ [2] No standalone plan box is left outside the card...');
assert.strictEqual(app.split('<NextSessionOverview').length - 1, 1, 'exactly one NextSessionOverview in App.vue');
assert.ok(!app.includes('<!-- Next Session Overview Bar -->'), 'old standalone bar removed');
console.log('  ✓ one plan summary, inside the card\n');

console.log('▶ [3] The component supports embedded mode without its own box...');
assert.ok(overview.includes('embedded: { type: Boolean, default: false }'), 'embedded prop declared');
assert.ok(overview.includes("embedded\n      ? 'mt-2.5 pt-2 border-t-2 border-plate/10"), 'embedded styles drop the outer box');
assert.ok(overview.includes("'mb-3 p-2 sm:px-3 sm:py-2.5 rounded-lg border-2 border-plate bg-paper"), 'standalone styles unchanged');
console.log('  ✓ embedded styles and default styles\n');

console.log('✅ plan-in-card checks passed');
