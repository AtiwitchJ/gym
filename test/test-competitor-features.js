import assert from 'node:assert';
import { calculatePlates, BAR_PRESETS, AVAILABLE_PLATES } from '../src/composables/usePlateCalculator.js';
import { calculateEstimated1RM, getRirMeta, RIR_OPTIONS } from '../src/composables/useRpeAdvisor.js';
import { useTimer } from '../src/composables/useTimer.js';
import repo from '../server/db.js';

console.log('====================================================');
console.log('🧪 QA Test: Competitor Reverse Engineering Feature Suite');
console.log('====================================================\n');

// ------------------------------------------------------------------
// 1. SPEC 1: Barbell Plate Calculator
// ------------------------------------------------------------------
console.log('▶ [1] Testing Barbell Plate Calculator...');
const plateRes = calculatePlates(90, 20); // 35kg per side -> 25 + 10
assert.strictEqual(plateRes.perSideWeight, 35);
assert.deepStrictEqual(plateRes.platesPerSide.map(p => p.weight), [25, 10]);
assert.strictEqual(plateRes.achievedTotal, 90);
assert.strictEqual(plateRes.remainder, 0);
console.log('✓ Plate calculator greedy algorithm verified for 90 kg.');

// ------------------------------------------------------------------
// 2. SPEC 2: Smart Rest Timer Quick Adjustments
// ------------------------------------------------------------------
console.log('▶ [2] Testing Smart Rest Timer Quick Stepper (+30s / -15s)...');
const timer = useTimer();
timer.setTimerDuration(90);
assert.strictEqual(timer.timerRemaining.value, 90);

timer.adjustRemaining(30);
assert.strictEqual(timer.timerRemaining.value, 120, 'Adjust +30s should increase remaining to 120s');

timer.adjustRemaining(-15);
assert.strictEqual(timer.timerRemaining.value, 105, 'Adjust -15s should decrease remaining to 105s');

timer.adjustRemaining(-200);
assert.strictEqual(timer.timerRemaining.value, 0, 'Adjust negative overflow must clamp to 0s');
console.log('✓ Smart rest timer adjustment logic verified.');

// ------------------------------------------------------------------
// 3. SPEC 3: RPE / RIR & Estimated 1RM (e1RM) Formula
// ------------------------------------------------------------------
console.log('▶ [3] Testing RIR & Estimated 1RM Formulas...');

// Formula: e1RM = Weight * (1 + (reps + rir) / 30)
// Test Case 1: 80 kg x 8 reps with RIR 2 (effective reps = 10)
// e1RM = 80 * (1 + 10/30) = 80 * 1.3333 = 106.7 kg
const e1rmCase1 = calculateEstimated1RM(80, 8, 2);
assert.strictEqual(e1rmCase1, 106.7);

// Test Case 2: 100 kg x 1 rep with RIR 0 (true 1RM)
// e1RM = 100 * (1 + 1/30) = 100 * 1.0333 = 103.3 kg
const e1rmTrueMax = calculateEstimated1RM(100, 1, 0);
assert.strictEqual(e1rmTrueMax, 103.3);

// Test Case 3: 50 kg x 10 reps with RIR 0
// e1RM = 50 * (1 + 10/30) = 66.7 kg
const e1rmCase3 = calculateEstimated1RM(50, 10, 0);
assert.strictEqual(e1rmCase3, 66.7);

// RIR metadata
assert.strictEqual(RIR_OPTIONS.length, 4);
assert.strictEqual(getRirMeta(0).name, 'หมดแรงเกลี้ยง (Failure)');
assert.strictEqual(getRirMeta(2).name, 'เหลือ 2 ครั้ง (Sweet Spot)');
console.log('✓ RIR & e1RM calculation engine verified.');

// ------------------------------------------------------------------
// 4. SPEC 3: Database Persistence of RIR in SQLite
// ------------------------------------------------------------------
console.log('▶ [4] Testing SQLite Schema Migration & RIR Persistence...');

const testSessionId = `re_test_session_${Date.now()}`;
const sessionPayload = {
  id: testSessionId,
  date: '2026-11-19',
  time: '12:00',
  dayKey: 'program_a',
  dayTitle: 'Program A (อก + หลัง + ท้อง)',
  totalSetsDone: 1,
  exercises: [
    {
      id: 'a1_chest_press',
      name: 'Chest Press Machine',
      category: 'อก',
      sets: [
        { setIndex: 1, type: 'work', target: '6-8 reps', weight: 85, actualReps: 8, done: true, rir: 2 }
      ]
    }
  ]
};

repo.saveSession(sessionPayload);

// Verify history query returns rir
const history = repo.getHistory();
const saved = history.find(s => s.id === testSessionId);
assert(saved, 'Saved session must be in history');
assert.strictEqual(saved.exercises[0].sets[0].weight, 85);
assert.strictEqual(saved.exercises[0].sets[0].actualReps, 8);
assert.strictEqual(saved.exercises[0].sets[0].rir, 2, 'RIR value 2 must be persisted and retrieved');

// Clean up
repo.deleteSession(testSessionId);
console.log('✓ SQLite RIR storage, schema migration, and session recovery verified.');

console.log('\n====================================================');
console.log('🎉 ALL COMPETITOR REVERSE ENGINEERING TESTS PASSED!');
console.log('====================================================');
