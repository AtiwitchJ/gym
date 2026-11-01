import assert from 'node:assert';
import { calculateWeightAdvice, getExerciseOverallAdvice } from '../src/composables/useWeightAdvisor.js';

console.log('Testing Progressive Overload Advisor...');

// 1. Test Working Set > 8 reps -> increase weight by +2 kg
const resMoreThan8 = calculateWeightAdvice({ weight: 60, reps: 10, type: 'work' });
assert.strictEqual(resMoreThan8.status, 'increase');
assert.strictEqual(resMoreThan8.delta, 2);
assert.strictEqual(resMoreThan8.suggestedWeight, 62);
assert.strictEqual(resMoreThan8.badgeText, '+2 kg');
console.log('✓ Reps > 8 correctly recommends +2 kg');

// 2. Test Working Set < 6 reps -> decrease weight by -2 kg
const resLessThan6 = calculateWeightAdvice({ weight: 60, reps: 5, type: 'work' });
assert.strictEqual(resLessThan6.status, 'decrease');
assert.strictEqual(resLessThan6.delta, -2);
assert.strictEqual(resLessThan6.suggestedWeight, 58);
assert.strictEqual(resLessThan6.badgeText, '-2 kg');
console.log('✓ Reps < 6 correctly recommends -2 kg');

// 3. Test Working Set 6–8 reps -> optimal, maintain weight
const res6 = calculateWeightAdvice({ weight: 60, reps: 6, type: 'work' });
assert.strictEqual(res6.status, 'optimal');
assert.strictEqual(res6.delta, 0);
assert.strictEqual(res6.suggestedWeight, 60);

const res8 = calculateWeightAdvice({ weight: 60, reps: 8, type: 'work' });
assert.strictEqual(res8.status, 'optimal');
assert.strictEqual(res8.delta, 0);
assert.strictEqual(res8.suggestedWeight, 60);
console.log('✓ Reps 6 and 8 correctly identified as optimal sweet spot (0 kg change)');

// 4. Test Zero / Edge cases
const resLowWeight = calculateWeightAdvice({ weight: 1, reps: 4, type: 'work' });
assert.strictEqual(resLowWeight.suggestedWeight, 0, 'Weight should not drop below 0');

const resWarmup = calculateWeightAdvice({ weight: 30, reps: 15, type: 'warm' });
assert.strictEqual(resWarmup.status, 'warmup');
assert.strictEqual(resWarmup.delta, 0);
console.log('✓ Edge cases & Warmup sets handled cleanly');

// 5. Test Overall Advice calculation
const setsEx1 = [
  { type: 'warm', weight: 40, reps: 15 },
  { type: 'work', weight: 60, reps: 9 },
  { type: 'work', weight: 60, reps: 9 },
  { type: 'work', weight: 60, reps: 7 }
];
const overallAdv1 = getExerciseOverallAdvice(setsEx1);
assert.strictEqual(overallAdv1.status, 'increase');
assert.strictEqual(overallAdv1.delta, 2);
assert.strictEqual(overallAdv1.suggestedWeight, 62);
console.log('✓ Overall advice for high reps aggregates to +2 kg');

const setsEx2 = [
  { type: 'warm', weight: 40, reps: 15 },
  { type: 'work', weight: 60, reps: 5 },
  { type: 'work', weight: 60, reps: 4 },
  { type: 'work', weight: 60, reps: 5 }
];
const overallAdv2 = getExerciseOverallAdvice(setsEx2);
assert.strictEqual(overallAdv2.status, 'decrease');
assert.strictEqual(overallAdv2.delta, -2);
assert.strictEqual(overallAdv2.suggestedWeight, 58);
console.log('✓ Overall advice for low reps aggregates to -2 kg');

console.log('All Progressive Overload Advisor tests passed successfully!');
