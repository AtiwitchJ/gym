import assert from 'node:assert';
import {
  calculatePlates,
  AVAILABLE_PLATES,
  BAR_PRESETS,
  usePlateCalculator
} from '../src/composables/usePlateCalculator.js';

console.log('====================================================');
console.log('🧪 QA Test: Barbell Plate Calculator with Inventory & Fallback');
console.log('====================================================\n');

// ------------------------------------------------------------------
// 1. Fallback when inventory is omitted / null / empty (backward compatibility)
// ------------------------------------------------------------------
console.log('▶ [1] Testing localStorage / null fallback (must preserve original behavior)...');
// When inventory is not provided or null, calculatePlates must behave exactly as before.
const resDefault60 = calculatePlates(60, 20);
assert.strictEqual(resDefault60.success, true);
assert.strictEqual(resDefault60.perSideWeight, 20);
assert.strictEqual(resDefault60.achievedTotal, 60);
assert.strictEqual(resDefault60.remainder, 0);
assert.deepStrictEqual(resDefault60.platesPerSide.map(p => p.weight), [20]);

const resDefault100 = calculatePlates(100, 20, null);
assert.strictEqual(resDefault100.success, true);
assert.strictEqual(resDefault100.perSideWeight, 40);
assert.strictEqual(resDefault100.achievedTotal, 100);
assert.strictEqual(resDefault100.remainder, 0);
assert.deepStrictEqual(resDefault100.platesPerSide.map(p => p.weight), [25, 15]);

const resDefaultOdd = calculatePlates(61, 20);
assert.strictEqual(resDefaultOdd.remainder, 0.5);

console.log('  ✓ Fallback when inventory is null/omitted matches original greedy allocation.\n');

// ------------------------------------------------------------------
// 2. Exact match with limited inventory pairs (กรณีพอดี)
// ------------------------------------------------------------------
console.log('▶ [2] Testing exact match with limited inventory pairs...');
// Target 100 kg, 20kg bar -> 40kg per side.
// Standard greedy would allocate 25kg + 15kg.
// Inventory has NO 25kg plates (0 pairs), but has 2 pairs of 20kg.
const invNo25 = { 25: 0, 20: 2, 15: 1, 10: 2, 5: 2, 2.5: 2, 1.25: 2 };
const res100No25 = calculatePlates(100, 20, invNo25);
assert.strictEqual(res100No25.success, true);
assert.strictEqual(res100No25.achievedTotal, 100, 'Must achieve 100kg total without 25kg plates');
assert.strictEqual(res100No25.perSideWeight, 40);
assert.strictEqual(res100No25.remainder, 0);
assert.strictEqual(res100No25.shortage ?? 0, 0, 'No shortage on exact match');
assert.deepStrictEqual(res100No25.platesPerSide.map(p => p.weight), [20, 20], 'Should use two 20kg plates');

// Another exact match: Target 70 kg, 20kg bar -> 25kg per side.
// Inventory has only 1 pair of 20kg, 1 pair of 5kg (no 25kg).
const inv70 = { 25: 0, 20: 1, 15: 0, 10: 0, 5: 1 };
const res70 = calculatePlates(70, 20, inv70);
assert.strictEqual(res70.achievedTotal, 70);
assert.strictEqual(res70.perSideWeight, 25);
assert.strictEqual(res70.remainder, 0);
assert.deepStrictEqual(res70.platesPerSide.map(p => p.weight), [20, 5]);

console.log('  ✓ Exact match with limited inventory pairs allocates available plates correctly.\n');

// ------------------------------------------------------------------
// 3. Does not exceed available pairs (ไม่เกินจำนวนคู่)
// ------------------------------------------------------------------
console.log('▶ [3] Testing that allocation never exceeds available pairs in inventory...');
// Target 100 kg, 20kg bar -> 40kg per side.
// Inventory has only 1 pair of 20kg, 1 pair of 15kg, 1 pair of 5kg.
const invStrict = { 20: 1, 15: 1, 5: 1 };
const resStrict = calculatePlates(100, 20, invStrict);
assert.strictEqual(resStrict.achievedTotal, 100);
assert.deepStrictEqual(resStrict.platesPerSide.map(p => p.weight), [20, 15, 5], 'Should use 20 + 15 + 5 since 20 is limited to 1 pair');

// Count allocated plates to guarantee no plate exceeds its available pairs
function verifyPairLimits(allocatedPlates, inventory) {
  const counts = {};
  for (const p of allocatedPlates) {
    counts[p.weight] = (counts[p.weight] || 0) + 1;
  }
  for (const [wt, count] of Object.entries(counts)) {
    const maxPairs = inventory[wt] ?? inventory[Number(wt)] ?? Infinity;
    assert.ok(count <= maxPairs, `Plate ${wt}kg used ${count} times per side, exceeds available pairs ${maxPairs}`);
  }
}
verifyPairLimits(resStrict.platesPerSide, invStrict);
console.log('  ✓ Pair counts strictly constrained by inventory.\n');

// ------------------------------------------------------------------
// 4. Sorted large to small (เรียงแผ่นใหญ่->เล็ก)
// ------------------------------------------------------------------
console.log('▶ [4] Testing that allocated plates are strictly ordered from largest to smallest...');
// Target 95 kg, 20kg bar -> 37.5kg per side.
// Inventory: 1x 20kg, 1x 10kg, 1x 5kg, 1x 2.5kg.
const inv95 = { 20: 1, 10: 1, 5: 1, 2.5: 1 };
const res95 = calculatePlates(95, 20, inv95);
assert.strictEqual(res95.achievedTotal, 95);
assert.deepStrictEqual(res95.platesPerSide.map(p => p.weight), [20, 10, 5, 2.5]);

function verifyDescendingOrder(plates) {
  for (let i = 0; i < plates.length - 1; i++) {
    assert.ok(plates[i].weight >= plates[i + 1].weight,
      `Plate order invalid: ${plates[i].weight}kg before ${plates[i + 1].weight}kg`);
  }
}
verifyDescendingOrder(res95.platesPerSide);
verifyDescendingOrder(resStrict.platesPerSide);
verifyDescendingOrder(res100No25.platesPerSide);
console.log('  ✓ Plates ordered descending (large inside, small outside).\n');

// ------------------------------------------------------------------
// 5. Fractional weights & remainder (เศษ 1.25 / 2.5)
// ------------------------------------------------------------------
console.log('▶ [5] Testing fractional weights with 1.25kg and 2.5kg plates...');
// Target 62.5 kg, 20kg bar -> 21.25kg per side (20 + 1.25)
const invFractional = { 20: 1, 2.5: 1, 1.25: 1 };
const res62_5 = calculatePlates(62.5, 20, invFractional);
assert.strictEqual(res62_5.achievedTotal, 62.5);
assert.strictEqual(res62_5.remainder, 0);
assert.deepStrictEqual(res62_5.platesPerSide.map(p => p.weight), [20, 1.25]);

// Target 65 kg, 20kg bar -> 22.5kg per side (20 + 2.5)
const res65 = calculatePlates(65, 20, invFractional);
assert.strictEqual(res65.achievedTotal, 65);
assert.strictEqual(res65.remainder, 0);
assert.deepStrictEqual(res65.platesPerSide.map(p => p.weight), [20, 2.5]);

// Target 63.5 kg, 20kg bar -> 21.75kg per side. Available: 20 + 1.25 = 21.25kg, remainder 0.5kg
const res63_5 = calculatePlates(63.5, 20, invFractional);
assert.strictEqual(res63_5.achievedTotal, 62.5);
assert.strictEqual(res63_5.remainder, 0.5, 'Remainder per side should be 0.5kg');
assert.deepStrictEqual(res63_5.platesPerSide.map(p => p.weight), [20, 1.25]);
console.log('  ✓ 1.25kg and 2.5kg fractional allocations and remainders verified.\n');

// ------------------------------------------------------------------
// 6. Weight lower than or equal to barbell (น้ำหนักต่ำกว่าบาร์)
// ------------------------------------------------------------------
console.log('▶ [6] Testing weight lower than or equal to bar weight...');
const resBelow = calculatePlates(15, 20, { 20: 2, 10: 2 });
assert.strictEqual(resBelow.success, true);
assert.strictEqual(resBelow.perSideWeight, 0);
assert.strictEqual(resBelow.achievedTotal, 20, 'Achieved total is bar weight when target <= bar');
assert.strictEqual(resBelow.remainder, 0);
assert.strictEqual(resBelow.shortage ?? 0, 0);
assert.deepStrictEqual(resBelow.platesPerSide, []);

const resEqual = calculatePlates(20, 20, { 20: 2 });
assert.strictEqual(resEqual.perSideWeight, 0);
assert.strictEqual(resEqual.achievedTotal, 20);
assert.deepStrictEqual(resEqual.platesPerSide, []);
console.log('  ✓ Target <= bar weight returns empty plate set safely.\n');

// ------------------------------------------------------------------
// 7. Insufficient plates returns shortage (แผ่นไม่พอต้องคืน shortage)
// ------------------------------------------------------------------
console.log('▶ [7] Testing insufficient plates shortage return...');
// Target 140 kg, 20kg bar -> 60kg per side needed.
// Inventory only has: 1x 20kg, 1x 10kg, 1x 5kg -> 35kg per side available.
// Max achievable per side = 35kg. Total achieved = 20 + 35*2 = 90kg.
// Shortage = 140 - 90 = 50kg total (or 25kg per side).
const invScarce = { 20: 1, 10: 1, 5: 1 };
const resScarce = calculatePlates(140, 20, invScarce);
assert.strictEqual(resScarce.perSideWeight, 35);
assert.strictEqual(resScarce.achievedTotal, 90);
assert.deepStrictEqual(resScarce.platesPerSide.map(p => p.weight), [20, 10, 5]);

// Must return shortage
assert.ok(resScarce.shortage !== undefined, 'Calculation must return shortage field when plates are insufficient');
assert.ok(resScarce.shortage === 50 || resScarce.shortage === 25,
  `Shortage should be 50kg total or 25kg per side, received: ${resScarce.shortage}`);
assert.ok(resScarce.remainder > 0 || resScarce.shortage > 0, 'Must reflect unsatisfied weight');

console.log('  ✓ Shortage returned correctly when inventory is insufficient.\n');

console.log('====================================================');
console.log('🎉 ALL PLATE INVENTORY TESTS PASSED!');
console.log('====================================================');
