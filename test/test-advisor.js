import assert from 'node:assert';
import { isWarmupType, parseRepTarget, calculateWeightAdvice, getExerciseOverallAdvice } from '../src/composables/useWeightAdvisor.js';

console.log('Testing Progressive Overload Advisor...');

// 0. Test isWarmupType
assert.strictEqual(isWarmupType('warm'), true);
assert.strictEqual(isWarmupType('warmup'), true);
assert.strictEqual(isWarmupType('วอร์ม'), true);
assert.strictEqual(isWarmupType('WARM'), true);
assert.strictEqual(isWarmupType('work'), false);
assert.strictEqual(isWarmupType('touchup'), false);
console.log('✓ isWarmupType detects warmup variants correctly');

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

// 4. Test Warm-up Overload Rules (> 20 -> +2 kg, < 12 -> -2 kg, 12-20 -> optimal)
const resWarmupOver = calculateWeightAdvice({ weight: 30, reps: 22, type: 'warm' });
assert.strictEqual(resWarmupOver.status, 'increase');
assert.strictEqual(resWarmupOver.delta, 2);
assert.strictEqual(resWarmupOver.suggestedWeight, 32);
assert.strictEqual(resWarmupOver.badgeText, '+2 kg วอร์ม');
console.log('✓ Warm-up > 20 reps correctly recommends +2 kg warmup weight');

const resWarmupUnder = calculateWeightAdvice({ weight: 30, reps: 10, type: 'warm' });
assert.strictEqual(resWarmupUnder.status, 'decrease');
assert.strictEqual(resWarmupUnder.delta, -2);
assert.strictEqual(resWarmupUnder.suggestedWeight, 28);
assert.strictEqual(resWarmupUnder.badgeText, '-2 kg วอร์ม');
console.log('✓ Warm-up < 12 reps correctly recommends -2 kg warmup weight');

const resWarmupOptimal = calculateWeightAdvice({ weight: 30, reps: 16, type: 'warm' });
assert.strictEqual(resWarmupOptimal.status, 'optimal');
assert.strictEqual(resWarmupOptimal.delta, 0);
assert.strictEqual(resWarmupOptimal.suggestedWeight, 30);
assert.strictEqual(resWarmupOptimal.badgeText, 'วอร์มพอดี ✓');
console.log('✓ Warm-up 12-20 reps correctly identified as optimal');

// 5. Test Bonus Touch-up Sets (ซ้อมเสริม)
const setsBonus = [
  { type: 'warm', weight: 15, reps: 22 },    // Warmup > 20 reps -> recommends +2 kg warmup (17 kg)
  { type: 'touchup', weight: 25, reps: 9 }   // Touchup > 8 reps -> recommends +2 kg touchup (27 kg)
];
const bonusAdv = getExerciseOverallAdvice(setsBonus);
assert.strictEqual(bonusAdv.warmAdvice.status, 'increase');
assert.strictEqual(bonusAdv.warmAdvice.suggestedWeight, 17);
assert.strictEqual(bonusAdv.workAdvice.status, 'increase');
assert.strictEqual(bonusAdv.workAdvice.suggestedWeight, 27);
console.log('✓ Bonus Touch-up (ซ้อมเสริม) calculates BOTH warmup and touchup recommendations accurately');

// 6. Test Overall Advice calculation — next week progressive overload when playing in sweet spot (6-8 reps)
const setsWithWarmupOptimal = [
  { type: 'warm', weight: 30, reps: 16 }, // Warmup 16 reps (12-19 optimal warmup)
  { type: 'work', weight: 60, reps: 7 },
  { type: 'work', weight: 60, reps: 7 },
  { type: 'work', weight: 60, reps: 8 }
];
const overallAdvOptimal = getExerciseOverallAdvice(setsWithWarmupOptimal);
assert.strictEqual(overallAdvOptimal.warmAdvice.status, 'optimal');
assert.strictEqual(overallAdvOptimal.warmAdvice.delta, 0);
assert.strictEqual(overallAdvOptimal.warmAdvice.suggestedWeight, 30);
assert.strictEqual(overallAdvOptimal.workAdvice.status, 'increase');
assert.strictEqual(overallAdvOptimal.workAdvice.delta, 2);
assert.strictEqual(overallAdvOptimal.workAdvice.suggestedWeight, 62);
console.log('✓ Successfully playing in 6-8 sweet spot correctly recommends +2 kg for next week');

// 7. Test Leg 01 (Seated Leg Press Machine: W1 65kgx20, S1-S3 84kgx8)
const setsLeg01 = [
  { type: 'warm', weight: 65, reps: 20 },
  { type: 'work', weight: 84, reps: 8 },
  { type: 'work', weight: 84, reps: 8 },
  { type: 'work', weight: 84, reps: 8 }
];
const leg01Advice = getExerciseOverallAdvice(setsLeg01);
assert.strictEqual(leg01Advice.warmAdvice.status, 'increase');
assert.strictEqual(leg01Advice.warmAdvice.delta, 2);
assert.strictEqual(leg01Advice.warmAdvice.suggestedWeight, 67);
assert.strictEqual(leg01Advice.workAdvice.status, 'increase');
assert.strictEqual(leg01Advice.workAdvice.delta, 2);
assert.strictEqual(leg01Advice.workAdvice.suggestedWeight, 86);
console.log('✓ Leg 01 (played 84kg x 8 reps) correctly recommends 86kg (+2kg) for next week!');

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

// 8. Test Custom Rep Ranges (e.g. Calf Raise 12–15 reps, Hip Adduction 8–10 reps)
assert.deepStrictEqual(parseRepTarget('12–15 ครั้ง'), { min: 12, max: 15 });
assert.deepStrictEqual(parseRepTarget('8-10 ครั้ง'), { min: 8, max: 10 });
assert.deepStrictEqual(parseRepTarget('15-20'), { min: 15, max: 20 });
assert.deepStrictEqual(parseRepTarget('12'), { min: 12, max: 12 });
assert.deepStrictEqual(parseRepTarget(null), { min: 6, max: 8 });
console.log('✓ parseRepTarget accurately extracts min/max from various string formats');

// Calf Raise (target 12–15 reps)
const calfOptimal = calculateWeightAdvice({ weight: 40, reps: 14, type: 'work', targetReps: '12–15 ครั้ง' });
assert.strictEqual(calfOptimal.status, 'optimal');
assert.strictEqual(calfOptimal.delta, 0);

const calfIncrease = calculateWeightAdvice({ weight: 40, reps: 16, type: 'work', targetReps: '12–15 ครั้ง' });
assert.strictEqual(calfIncrease.status, 'increase');
assert.strictEqual(calfIncrease.delta, 2);
assert.strictEqual(calfIncrease.suggestedWeight, 42);

const calfDecrease = calculateWeightAdvice({ weight: 40, reps: 10, type: 'work', targetReps: '12–15 ครั้ง' });
assert.strictEqual(calfDecrease.status, 'decrease');
assert.strictEqual(calfDecrease.delta, -2);
assert.strictEqual(calfDecrease.suggestedWeight, 38);
console.log('✓ Calf Raise (12–15 reps) set advice correctly handles optimal, increase (>15), decrease (<12)');

// Overall Advice with custom target reps
const setsCalf = [
  { type: 'warm', weight: 25, reps: 20 },
  { type: 'work', weight: 40, reps: 14, targetReps: '12–15 ครั้ง' },
  { type: 'work', weight: 40, reps: 13, targetReps: '12–15 ครั้ง' },
  { type: 'work', weight: 40, reps: 14, targetReps: '12–15 ครั้ง' }
];
const calfOverall = getExerciseOverallAdvice(setsCalf);
assert.strictEqual(calfOverall.workAdvice.status, 'increase');
assert.strictEqual(calfOverall.workAdvice.delta, 2);
assert.strictEqual(calfOverall.workAdvice.suggestedWeight, 42);
assert.strictEqual(calfOverall.workAdvice.reason.includes('12–15'), true);
console.log('✓ Calf Raise overall advice recommends +2 kg next week when target range 12–15 is hit');

console.log('All Progressive Overload Advisor tests passed successfully!');
