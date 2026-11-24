import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// In-memory localStorage polyfill for isolated node execution
function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    clear: () => data.clear(),
    raw: data
  };
}
if (!globalThis.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true, writable: true });
}

// Strict DB isolation
if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-target-test-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const {
  resolveSetRepTarget,
  evaluateSetTargetAchievement,
  parseRepTarget,
  isWarmupType
} = await import('../src/composables/useWeightAdvisor.js');

const {
  useActiveSessionStore,
  updateSetMetric,
  updateSetRir,
  toggleSetComplete
} = await import('../src/composables/useActiveSessionStore.js');

console.log('====================================================');
console.log('🧪 Unit & Integration Test: Target Rep Range & Achievement Status');
console.log('====================================================\n');

// -------------------------------------------------------------
// Test 1: resolveSetRepTarget unit test
// -------------------------------------------------------------
console.log('▶ [1] Testing resolveSetRepTarget...');

// 1.1 Range strings
const r1 = resolveSetRepTarget({ target: '6-8' });
assert.deepStrictEqual(r1, { min: 6, max: 8, isRange: true, raw: '6-8', label: '6–8 ครั้ง' });

const r2 = resolveSetRepTarget({ targetReps: '6–8 ครั้ง (ท้าทาย)' });
assert.deepStrictEqual(r2, { min: 6, max: 8, isRange: true, raw: '6–8 ครั้ง (ท้าทาย)', label: '6–8 ครั้ง' });

const r3 = resolveSetRepTarget({ target: '12-15 ครั้ง' });
assert.deepStrictEqual(r3, { min: 12, max: 15, isRange: true, raw: '12-15 ครั้ง', label: '12–15 ครั้ง' });

// 1.2 Single number / fixed targets
const s1 = resolveSetRepTarget({ target: 8 });
assert.deepStrictEqual(s1, { min: 8, max: 8, isRange: false, raw: '8', label: '8 ครั้ง' });

const s2 = resolveSetRepTarget({ targetReps: '10 ครั้ง' });
assert.deepStrictEqual(s2, { min: 10, max: 10, isRange: false, raw: '10 ครั้ง', label: '10 ครั้ง' });

// 1.3 Missing or non-existent target (MUST NOT fabricate a range!)
const m1 = resolveSetRepTarget({});
assert.strictEqual(m1, null, 'Empty set should return null, not assume 6-8');

const m2 = resolveSetRepTarget({ target: null, targetReps: '' });
assert.strictEqual(m2, null, 'Null target should return null');

// 1.4 QA Bug Report edge cases: inverted range, negatives, zeroes, strange text
console.log('▶ [1.4] Testing QA edge cases (inverted range "8-3", negatives "-1", zeroes, strange text)...');
assert.strictEqual(resolveSetRepTarget({ target: '8-3' }), null, 'Inverted range "8-3" must be rejected, not parsed as 8');
assert.strictEqual(resolveSetRepTarget({ targetReps: '10–6 ครั้ง' }), null, 'Inverted range "10–6" must be rejected');
assert.strictEqual(resolveSetRepTarget({ target: '-1' }), null, 'Negative target "-1" must be rejected, not parsed as 1');
assert.strictEqual(resolveSetRepTarget({ target: -1 }), null, 'Negative numeric target -1 must be rejected');
assert.strictEqual(resolveSetRepTarget({ target: '-5' }), null, 'Negative target "-5" must be rejected');
assert.strictEqual(resolveSetRepTarget({ target: '-6-8' }), null, 'Negative range "-6-8" must be rejected');
assert.strictEqual(resolveSetRepTarget({ target: '0' }), null, 'Zero target "0" must be rejected');
assert.strictEqual(resolveSetRepTarget({ target: 0 }), null, 'Zero numeric target 0 must be rejected');
assert.strictEqual(resolveSetRepTarget({ target: '0-0' }), null, 'Zero range "0-0" must be rejected');
assert.strictEqual(resolveSetRepTarget({ target: '0-8' }), null, 'Zero in range "0-8" must be rejected');
assert.strictEqual(resolveSetRepTarget({ target: '8-0' }), null, 'Zero in range "8-0" must be rejected');
assert.strictEqual(resolveSetRepTarget({ target: '--' }), null, 'Dashes "--" must be rejected');
assert.strictEqual(resolveSetRepTarget({ target: 'abc' }), null, 'Text "abc" must be rejected');
assert.strictEqual(resolveSetRepTarget({ target: 'NaN' }), null, 'Text "NaN" must be rejected');

// Ensure evaluateSetTargetAchievement stays neutral (returns null) for invalid targets
const setInvalidInverted = { type: 'working', target: '8-3', weight: 80, reps: 8, completed: true };
assert.strictEqual(evaluateSetTargetAchievement(setInvalidInverted), null, 'Invalid range "8-3" must produce neutral null status');

const setInvalidNegative = { type: 'working', target: '-1', weight: 80, reps: 1, completed: true };
assert.strictEqual(evaluateSetTargetAchievement(setInvalidNegative), null, 'Negative target "-1" must produce neutral null status');

const setInvalidZero = { type: 'working', target: '0', weight: 80, reps: 5, completed: true };
assert.strictEqual(evaluateSetTargetAchievement(setInvalidZero), null, 'Zero target "0" must produce neutral null status');

console.log('  ✔ QA edge cases (inverted range, negatives, zero, strange text) strictly neutral.');

console.log('  ✔ resolveSetRepTarget verified.');

// -------------------------------------------------------------
// Test 2: evaluateSetTargetAchievement constraints
// -------------------------------------------------------------
console.log('▶ [2] Testing evaluateSetTargetAchievement constraints...');

// 2.1 Uncompleted set MUST NOT produce achievement status
const uncompletedSet = { type: 'working', target: '6-8', weight: 80, reps: 8, completed: false };
assert.strictEqual(evaluateSetTargetAchievement(uncompletedSet), null, 'Uncompleted set must return null');

// 2.2 Warmup set MUST NOT produce working set achievement status
const warmupCompleted = { type: 'warmup', target: 15, weight: 40, reps: 15, completed: true };
assert.strictEqual(evaluateSetTargetAchievement(warmupCompleted), null, 'Warmup set must return null');

const warmCompleted2 = { type: 'warm', isWarm: true, target: '15', weight: 40, reps: 20, completed: true };
assert.strictEqual(evaluateSetTargetAchievement(warmCompleted2), null, 'Warm set with isWarm must return null');

// 2.3 Set without target MUST NOT assume a target range
const noTargetCompleted = { type: 'working', weight: 80, reps: 8, completed: true };
assert.strictEqual(evaluateSetTargetAchievement(noTargetCompleted), null, 'Set without target must return null');

console.log('  ✔ Warmup, uncompleted, and missing target constraints verified.');

// -------------------------------------------------------------
// Test 3: Range Target (6–8) Achievement Evaluation
// -------------------------------------------------------------
console.log('▶ [3] Testing Range Target (6–8 reps) evaluations...');

// 3.1 Below minimum (< 6)
const setBelow = { type: 'working', target: '6-8', weight: 80, reps: 5, completed: true, rir: null };
const resBelow = evaluateSetTargetAchievement(setBelow);
assert.ok(resBelow);
assert.strictEqual(resBelow.status, 'below');
assert.strictEqual(resBelow.badgeText, 'ต่ำกว่าเป้า (5/6–8)');
assert.ok(resBelow.detailText.includes('ต่ำกว่าเป้าหมายขั้นต่ำ 6 ครั้ง'));

// 3.2 In range (6 <= reps < 8)
const setInRange = { type: 'working', target: '6-8', weight: 80, reps: 7, completed: true, rir: 1 };
const resInRange = evaluateSetTargetAchievement(setInRange);
assert.ok(resInRange);
assert.strictEqual(resInRange.status, 'in_range');
assert.strictEqual(resInRange.badgeText, 'ในเกณฑ์ (7/6–8)');
assert.ok(resInRange.detailText.includes('อยู่ในเกณฑ์เป้าหมาย 6–8 ครั้ง'));
assert.ok(resInRange.detailText.includes('RIR 1'), 'Must include RIR 1 when selected');

// 3.3 Reached top (= 8)
const setTop = { type: 'working', target: '6-8', weight: 80, reps: 8, completed: true, rir: 2, rirPlus: true };
const resTop = evaluateSetTargetAchievement(setTop);
assert.ok(resTop);
assert.strictEqual(resTop.status, 'reached_top');
assert.strictEqual(resTop.badgeText, 'ถึงเป้าบน (8/8)');
assert.ok(resTop.detailText.includes('ถึงขอบบนของเป้า 6–8 ครั้ง'));
assert.ok(resTop.detailText.includes('RIR 2+'), 'Must include RIR 2+ when selected');

// 3.4 Exceeded top (> 8)
const setOver = { type: 'working', target: '6-8', weight: 80, reps: 10, completed: true, rir: null };
const resOver = evaluateSetTargetAchievement(setOver);
assert.ok(resOver);
assert.strictEqual(resOver.status, 'exceeded');
assert.strictEqual(resOver.badgeText, 'เกินเป้า (10/8)');
assert.ok(resOver.detailText.includes('เกินขอบบนของเป้า 6–8 ครั้ง'));

console.log('  ✔ Range target evaluations verified.');

// -------------------------------------------------------------
// Test 4: Single / Fixed Rep Target (8) Achievement Evaluation
// -------------------------------------------------------------
console.log('▶ [4] Testing Single / Fixed Target (8 reps) evaluations...');

// 4.1 Below (reps < 8)
const setFixedBelow = { type: 'working', target: 8, weight: 80, reps: 7, completed: true, rir: null };
const resFBelow = evaluateSetTargetAchievement(setFixedBelow);
assert.ok(resFBelow);
assert.strictEqual(resFBelow.status, 'below');
assert.strictEqual(resFBelow.badgeText, 'ต่ำกว่าเป้า (7/8)');

// 4.2 Met (reps === 8)
const setFixedMet = { type: 'working', target: 8, weight: 80, reps: 8, completed: true, rir: null };
const resFMet = evaluateSetTargetAchievement(setFixedMet);
assert.ok(resFMet);
assert.strictEqual(resFMet.status, 'met');
assert.strictEqual(resFMet.badgeText, 'ครบเป้า (8/8) ✓');

// 4.3 Exceeded (reps > 8)
const setFixedOver = { type: 'working', target: 8, weight: 80, reps: 9, completed: true, rir: 1 };
const resFOver = evaluateSetTargetAchievement(setFixedOver);
assert.ok(resFOver);
assert.strictEqual(resFOver.status, 'exceeded');
assert.strictEqual(resFOver.badgeText, 'เกินเป้า (9/8)');
assert.ok(resFOver.detailText.includes('RIR 1'));

console.log('  ✔ Single target evaluations verified.');

// -------------------------------------------------------------
// Test 5: Independent Evaluation across Sets with Different Targets & Weights
// -------------------------------------------------------------
console.log('▶ [5] Testing distinct sets with different targets and weights...');
const store = useActiveSessionStore();
store.discardSession();

store.startEmptySession({ title: 'Pyramid Training Session' });

const ex = store.addExerciseToActiveSession('bench_press', [
  { type: 'warmup', target: 15, targetWeight: 40, weight: 40, reps: 15, completed: false },
  { type: 'working', target: '6-8', targetWeight: 80, weight: 80, reps: 8, completed: false },
  { type: 'working', target: '8-10', targetWeight: 70, weight: 70, reps: 7, completed: false },
  { type: 'working', target: 12, targetWeight: 50, weight: 50, reps: 12, completed: false }
]);

const activeEx = store.activeSession.value.exercises[0];

// Before completion: all achievement statuses are null
assert.strictEqual(evaluateSetTargetAchievement(activeEx.sets[0]), null);
assert.strictEqual(evaluateSetTargetAchievement(activeEx.sets[1]), null);
assert.strictEqual(evaluateSetTargetAchievement(activeEx.sets[2]), null);
assert.strictEqual(evaluateSetTargetAchievement(activeEx.sets[3]), null);

// Complete Set 1 (warmup)
store.toggleSetComplete(0, 0);
assert.strictEqual(activeEx.sets[0].completed, true);
assert.strictEqual(evaluateSetTargetAchievement(activeEx.sets[0]), null, 'Warmup set stays null');

// Complete Set 1 working (80kg, 8 reps for target 6-8)
store.toggleSetComplete(0, 1);
const stat1 = evaluateSetTargetAchievement(activeEx.sets[1]);
assert.ok(stat1);
assert.strictEqual(stat1.status, 'reached_top');
assert.strictEqual(stat1.badgeText, 'ถึงเป้าบน (8/8)');

// Complete Set 2 working (70kg, 7 reps for target 8-10)
store.toggleSetComplete(0, 2);
const stat2 = evaluateSetTargetAchievement(activeEx.sets[2]);
assert.ok(stat2);
assert.strictEqual(stat2.status, 'below');
assert.strictEqual(stat2.badgeText, 'ต่ำกว่าเป้า (7/8–10)');

// Complete Set 3 working (50kg, 12 reps for target 12)
store.toggleSetComplete(0, 3);
const stat3 = evaluateSetTargetAchievement(activeEx.sets[3]);
assert.ok(stat3);
assert.strictEqual(stat3.status, 'met');
assert.strictEqual(stat3.badgeText, 'ครบเป้า (12/12) ✓');

// Verify each set kept its independent evaluation
assert.notStrictEqual(stat1.status, stat2.status);
assert.notStrictEqual(stat2.status, stat3.status);

// Test modifying reps on Set 2: increase reps from 7 to 8
store.updateSetMetric(0, 2, 'reps', 8);
const stat2Updated = evaluateSetTargetAchievement(activeEx.sets[2]);
assert.strictEqual(stat2Updated.status, 'in_range');
assert.strictEqual(stat2Updated.badgeText, 'ในเกณฑ์ (8/8–10)');

// Test unticking Set 2: completion becomes false -> achievement status becomes null
store.toggleSetComplete(0, 2);
assert.strictEqual(activeEx.sets[2].completed, false);
assert.strictEqual(evaluateSetTargetAchievement(activeEx.sets[2]), null, 'Unticked set must return null');

// Re-tick Set 2 -> achievement status returns
store.toggleSetComplete(0, 2);
assert.strictEqual(activeEx.sets[2].completed, true);
assert.strictEqual(evaluateSetTargetAchievement(activeEx.sets[2]).status, 'in_range');

// Draft persistence across storage
const draft = JSON.parse(localStorage.getItem('active_session_draft'));
assert.ok(draft);
assert.strictEqual(draft.exercises[0].sets[1].target, '6-8');
assert.strictEqual(draft.exercises[0].sets[2].target, '8-10');
assert.strictEqual(draft.exercises[0].sets[3].target, 12);

console.log('  ✔ Distinct set targets, weights, unticking, and draft persistence verified.');

console.log('\n====================================================');
console.log('🎉 ALL TARGET REP RANGE & ACHIEVEMENT TESTS PASSED (100%)');
console.log('====================================================');
