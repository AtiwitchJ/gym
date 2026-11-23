import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildWarmupSets,
  roundToHalfKg,
  DEFAULT_WARMUP_PLAN
} from '../src/composables/warmupCalc.js';

/**
 * Warm-up percent calculator (front end only). Default plan 40%×5, 60%×5, 80%×3, rounded to 0.5 kg.
 * Pure function; the estimate line stays display-only, while a separate button may
 * write the plan into the table (see test-warmup-insert.js).
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: Warm-up percent calculator (FE only)');
console.log('====================================================\n');

console.log('▶ [1] Default plan: 40%×5, 60%×5, 80%×3 of the working weight...');
assert.deepStrictEqual(DEFAULT_WARMUP_PLAN.map((s) => [s.percent, s.reps]), [[40, 5], [60, 5], [80, 3]]);
assert.deepStrictEqual(buildWarmupSets(100).map((s) => [s.weight, s.reps]), [[40, 5], [60, 5], [80, 3]]);
assert.deepStrictEqual(buildWarmupSets(45).map((s) => s.weight), [18, 27, 36]);
console.log('  ✓ 100 kg → 40/60/80; 45 kg → 18/27/36\n');

console.log('▶ [2] Rounds to the nearest 0.5 kg...');
assert.deepStrictEqual(buildWarmupSets(33).map((s) => s.weight), [13, 20, 26.5]);
assert.strictEqual(roundToHalfKg(13.2), 13);
assert.strictEqual(roundToHalfKg(13.3), 13.5);
assert.strictEqual(roundToHalfKg(26.4), 26.5);
console.log('  ✓ 33 kg → 13 / 20 / 26.5\n');

console.log('▶ [3] Every set is type warm (existing type, no new schema)...');
for (const set of buildWarmupSets(80)) {
  assert.strictEqual(set.type, 'warm');
  assert.deepStrictEqual(Object.keys(set).sort(), ['percent', 'reps', 'type', 'weight']);
}
console.log('  ✓ type warm, same four keys only\n');

console.log('▶ [4] No working weight → empty list (old behavior), no throw...');
for (const bad of [0, -5, '', '   ', null, undefined, NaN, 'abc', Infinity]) {
  assert.deepStrictEqual(buildWarmupSets(bad), [], `input ${String(bad)} should give []`);
}
assert.deepStrictEqual(buildWarmupSets('60'), buildWarmupSets(60), 'string weight is read as a number');
console.log('  ✓ 0, negative, blank, null, NaN and text give []\n');

console.log('▶ [5] A custom plan replaces the default, and tiny weights are dropped...');
const custom = buildWarmupSets(50, [{ percent: 50, reps: 10 }]);
assert.deepStrictEqual(custom.map((s) => [s.weight, s.reps]), [[25, 10]]);
assert.deepStrictEqual(buildWarmupSets(1, [{ percent: 10, reps: 5 }]), [], 'a 0.1 kg set rounds to 0 and is dropped');
console.log('  ✓ custom plan works; 0 kg sets dropped\n');

console.log('▶ [6] The card shows the plan but never writes it into a set...');
const card = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
assert.ok(card.includes("import { buildWarmupSets } from '../composables/warmupCalc.js';"), 'card imports the calculator');
assert.ok(card.includes('วอร์มอัพแนะนำ (ประมาณ):'), 'card labels it as an estimate');
const planBlock = card.slice(card.indexOf('const warmupPlan = computed'), card.indexOf('const warmupPlan = computed') + 400);
assert.ok(!/updateWeight|updateReps|applyPrevRecord/.test(planBlock), 'warmupPlan does not write to state');
const tpl = card.slice(card.indexOf('<!-- Warm-up plan from the working weight'), card.indexOf('<!-- Warm-up insert button -->'));
assert.ok(!/@click/.test(tpl), 'the estimate line has no click handler (display only)');
const insertBlock = card.slice(card.indexOf('<!-- Warm-up insert button -->'), card.indexOf('<!-- Sets Table Header -->'));
assert.ok(insertBlock.includes('@click="onInsertWarmupSets"'), 'the separate insert button has a click handler');
assert.ok(insertBlock.includes('min-h-[44px]'), 'the insert button keeps a 44 px touch target');
console.log('  ✓ estimate line display only; separate 44 px insert button writes it\n');

console.log('✅ warm-up calculator checks passed');
