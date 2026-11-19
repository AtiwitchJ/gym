import assert from 'node:assert';
import {
  calculatePlates,
  BAR_PRESETS,
  AVAILABLE_PLATES,
  usePlateCalculator
} from '../src/composables/usePlateCalculator.js';

console.log('====================================================');
console.log('🧪 QA Test: Barbell Plate Calculator Suite');
console.log('====================================================\n');

// ------------------------------------------------------------------
// 1. Presets and Denominations Verification
// ------------------------------------------------------------------
console.log('▶ [1] Validating Bar Presets & Available Plate Denominations...');

assert(Array.isArray(BAR_PRESETS) && BAR_PRESETS.length >= 5, 'Must provide at least 5 bar presets');
assert(BAR_PRESETS.some(b => b.id === 'olympic_20' && b.weight === 20), 'Olympic 20kg bar preset required');
assert(BAR_PRESETS.some(b => b.id === 'smith_machine_11' && b.weight === 11), 'Smith machine 11kg bar preset required');

assert(Array.isArray(AVAILABLE_PLATES) && AVAILABLE_PLATES.length >= 7, 'Must provide standard IWF plate denominations');
const plateWeights = AVAILABLE_PLATES.map(p => p.weight);
assert.deepStrictEqual(plateWeights, [25, 20, 15, 10, 5, 2.5, 1.25], 'Plates must include 25, 20, 15, 10, 5, 2.5, 1.25 kg');

console.log('✓ Bar presets and plate denominations verified successfully.');

// ------------------------------------------------------------------
// 2. Greedy Allocation on Standard 20kg Bar
// ------------------------------------------------------------------
console.log('▶ [2] Validating Plate Calculations for Standard 20kg Olympic Bar...');

// Case A: 60 kg total (20kg bar + 40kg plates = 20kg per side) -> one 20kg plate per side
const res60 = calculatePlates(60, 20);
assert.strictEqual(res60.success, true);
assert.strictEqual(res60.targetWeight, 60);
assert.strictEqual(res60.barWeight, 20);
assert.strictEqual(res60.perSideWeight, 20);
assert.strictEqual(res60.achievedTotal, 60);
assert.strictEqual(res60.remainder, 0);
assert.strictEqual(res60.platesPerSide.length, 1);
assert.strictEqual(res60.platesPerSide[0].weight, 20);
assert.deepStrictEqual(res60.plateSummary, [{ weight: 20, count: 1, color: '#2563EB', textColor: '#FFFFFF' }]);

// Case B: 100 kg total (20kg bar + 80kg plates = 40kg per side) -> 25kg + 15kg per side
const res100 = calculatePlates(100, 20);
assert.strictEqual(res100.perSideWeight, 40);
assert.strictEqual(res100.achievedTotal, 100);
assert.strictEqual(res100.remainder, 0);
assert.deepStrictEqual(res100.platesPerSide.map(p => p.weight), [25, 15]);

// Case C: 82.5 kg total (20kg bar + 62.5kg = 31.25kg per side) -> 25 + 5 + 1.25 per side
const res82_5 = calculatePlates(82.5, 20);
assert.strictEqual(res82_5.perSideWeight, 31.25);
assert.strictEqual(res82_5.achievedTotal, 82.5);
assert.strictEqual(res82_5.remainder, 0);
assert.deepStrictEqual(res82_5.platesPerSide.map(p => p.weight), [25, 5, 1.25]);

// Case D: Target weight <= Bar weight (e.g. 20 kg or 15 kg on a 20 kg bar)
const resEmpty = calculatePlates(20, 20);
assert.strictEqual(resEmpty.perSideWeight, 0);
assert.strictEqual(resEmpty.platesPerSide.length, 0);
assert.strictEqual(resEmpty.remainder, 0);
assert.strictEqual(resEmpty.achievedTotal, 20);

const resBelowBar = calculatePlates(15, 20);
assert.strictEqual(resBelowBar.perSideWeight, 0);
assert.strictEqual(resBelowBar.platesPerSide.length, 0);
assert.strictEqual(resBelowBar.achievedTotal, 20);

console.log('✓ Standard 20kg bar calculations verified.');

// ------------------------------------------------------------------
// 3. Alternative Bars and Machine Presets
// ------------------------------------------------------------------
console.log('▶ [3] Validating Alternative Bars (EZ-Curl 10kg, Smith 11kg, Trap Bar 25kg)...');

// EZ-Curl 10kg with 35kg total -> 12.5kg per side -> 10 + 2.5
const resEz = calculatePlates(35, 10);
assert.strictEqual(resEz.barWeight, 10);
assert.strictEqual(resEz.perSideWeight, 12.5);
assert.deepStrictEqual(resEz.platesPerSide.map(p => p.weight), [10, 2.5]);
assert.strictEqual(resEz.achievedTotal, 35);

// Smith Machine 11kg with 51kg total -> 20kg per side -> 20
const resSmith = calculatePlates(51, 11);
assert.strictEqual(resSmith.barWeight, 11);
assert.strictEqual(resSmith.perSideWeight, 20);
assert.deepStrictEqual(resSmith.platesPerSide.map(p => p.weight), [20]);
assert.strictEqual(resSmith.achievedTotal, 51);

// Trap Bar 25kg with 125kg total -> 50kg per side -> 25 + 25
const resTrap = calculatePlates(125, 25);
assert.strictEqual(resTrap.barWeight, 25);
assert.strictEqual(resTrap.perSideWeight, 50);
assert.deepStrictEqual(resTrap.platesPerSide.map(p => p.weight), [25, 25]);
assert.strictEqual(resTrap.plateSummary[0].count, 2);

console.log('✓ Alternative bar presets verified.');

// ------------------------------------------------------------------
// 4. Decimal Remainder & Odd Weight Handling
// ------------------------------------------------------------------
console.log('▶ [4] Validating Odd Weight & Remainder Handling...');

// 61 kg on 20kg bar -> sideTarget = 20.5kg -> plates [20], remainder 0.5kg
const resOdd = calculatePlates(61, 20);
assert.strictEqual(resOdd.perSideWeight, 20);
assert.strictEqual(resOdd.remainder, 0.5);
assert.strictEqual(resOdd.achievedTotal, 60);

console.log('✓ Remainder handling verified.');

// ------------------------------------------------------------------
// 5. Composable State & Lifecycle Contract
// ------------------------------------------------------------------
console.log('▶ [5] Validating usePlateCalculator Composable Methods...');

const calc = usePlateCalculator();
assert(typeof calc.openPlateCalculator === 'function');
assert(typeof calc.closePlateCalculator === 'function');
assert(typeof calc.setTargetWeight === 'function');
assert(typeof calc.adjustWeight === 'function');
assert(typeof calc.selectBarPreset === 'function');
assert(typeof calc.applyWeight === 'function');

// Test open and adjust
calc.openPlateCalculator(80);
assert.strictEqual(calc.isOpen.value, true);
assert.strictEqual(calc.targetWeight.value, 80);

calc.adjustWeight(10);
assert.strictEqual(calc.targetWeight.value, 90);

calc.adjustWeight(-5);
assert.strictEqual(calc.targetWeight.value, 85);

let appliedVal = null;
calc.openPlateCalculator(70, (val) => {
  appliedVal = val;
});
calc.applyWeight();
assert.strictEqual(appliedVal, 70);
assert.strictEqual(calc.isOpen.value, false);

console.log('✓ usePlateCalculator composable lifecycle verified.');

console.log('\n====================================================');
console.log('🎉 ALL BARBELL PLATE CALCULATOR TESTS PASSED!');
console.log('====================================================');
