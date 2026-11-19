import assert from 'node:assert';
import { usePinKeypad, detectWeightAnomaly } from '../src/composables/usePinKeypad.js';
import { isWarmupType, parseRepTarget, calculateWeightAdvice, getExerciseOverallAdvice } from '../src/composables/useWeightAdvisor.js';
import { useWorkoutStore } from '../src/composables/useWorkoutStore.js';

console.log('====================================================');
console.log('🧪 GYM Sprint QA & Automation Verification Test Suite');
console.log('====================================================\n');

// ------------------------------------------------------------------
// TEST 1: usePinKeypad Guard for Abnormal Weight Entry
// ------------------------------------------------------------------
console.log('▶ [TEST 1] Keypad Abnormal Weight Guard...');

// 1.1 Pure function detectWeightAnomaly tests
assert(typeof detectWeightAnomaly === 'function', 'detectWeightAnomaly should be exported as a function');

// Case A: Extreme drop (e.g. user entered 2 kg while previous was 20 kg)
const dropAnomaly = detectWeightAnomaly(2, 20);
assert.strictEqual(dropAnomaly.isAnomaly, true, 'Entering 2 kg when previous was 20 kg must be flagged as anomaly');
assert.strictEqual(dropAnomaly.type, 'too_low', 'Anomaly type should be too_low');
assert(dropAnomaly.reason && dropAnomaly.reason.includes('น้อยกว่าครั้งก่อน'), 'Warning reason should explain the drop');

// Case B: Extreme spike (e.g. user entered 200 kg while previous was 20 kg)
const spikeAnomaly = detectWeightAnomaly(200, 20);
assert.strictEqual(spikeAnomaly.isAnomaly, true, 'Entering 200 kg when previous was 20 kg must be flagged as anomaly');
assert.strictEqual(spikeAnomaly.type, 'too_high', 'Anomaly type should be too_high');

// Case C: Normal progressive weight (e.g. previous 20 kg, user entered 22.5 kg)
const normalWeight = detectWeightAnomaly(22.5, 20);
assert.strictEqual(normalWeight.isAnomaly, false, 'Normal weight 22.5 kg should not be flagged as anomaly');

// Case D: Extreme absolute weight without previous (e.g. 500 kg)
const extremeWithoutPrev = detectWeightAnomaly(500, null);
assert.strictEqual(extremeWithoutPrev.isAnomaly, true, 'Extreme 500 kg should be flagged as anomaly even without prev');

// 1.2 Composable reactive state and confirm guard
const keypad = usePinKeypad();

let confirmedValue = null;
keypad.openKeypad({
  mode: 'weight',
  prevHint: '20',
  currentValue: '',
  onConfirm: (val) => { confirmedValue = val; }
});

// User types '2' (abnormal drop from 20)
keypad.setValue('2');
assert.strictEqual(keypad.isAbnormal.value, true, 'Keypad isAbnormal must be true when value is 2 and prev is 20');
assert(keypad.anomalyWarning.value.length > 0, 'anomalyWarning message must be present');

// First confirm attempt should be blocked by guard
const firstConfirmResult = keypad.confirm();
assert.strictEqual(firstConfirmResult, false, 'First confirm on abnormal weight must be guarded (return false)');
assert.strictEqual(confirmedValue, null, 'Callback must not be invoked on guarded confirm');
assert.strictEqual(keypad.guardAcknowledged.value, true, 'Guard should enter acknowledged state for re-confirmation');

// User corrects value to '20'
keypad.setValue('20');
assert.strictEqual(keypad.isAbnormal.value, false, 'Keypad isAbnormal must be false for normal weight 20');
assert.strictEqual(keypad.guardAcknowledged.value, false, 'Guard acknowledgement should reset on edit');

const normalConfirmResult = keypad.confirm();
assert.strictEqual(normalConfirmResult, true, 'Confirming normal weight must succeed');
assert.strictEqual(confirmedValue, '20', 'Callback receives correct value 20');

// Reps mode should not trigger weight anomaly
keypad.openKeypad({
  mode: 'reps',
  prevHint: '8',
  onConfirm: () => {}
});
keypad.setValue('2');
assert.strictEqual(keypad.isAbnormal.value, false, 'Reps mode must never trigger weight anomaly guard');
keypad.closeKeypad();

console.log('✓ TEST 1 Passed: usePinKeypad abnormal weight guard behaves accurately!\n');

// ------------------------------------------------------------------
// TEST 2: Progressive Overload without advance draft calculation
// ------------------------------------------------------------------
console.log('▶ [TEST 2] Progressive Overload Draft Weight Guard...');

// 2.1 calculateWeightAdvice must return null when reps are not provided / draft weight only
const draftAdvice1 = calculateWeightAdvice({ weight: 60, reps: null, type: 'work' });
assert.strictEqual(draftAdvice1, null, 'calculateWeightAdvice must return null when reps is null');

const draftAdvice2 = calculateWeightAdvice({ weight: 60, reps: '', type: 'work' });
assert.strictEqual(draftAdvice2, null, 'calculateWeightAdvice must return null when reps is empty string');

const draftAdvice3 = calculateWeightAdvice({ weight: 60, reps: undefined, type: 'work' });
assert.strictEqual(draftAdvice3, null, 'calculateWeightAdvice must return null when reps is undefined');

const draftAdvice4 = calculateWeightAdvice({ weight: 60, reps: 0, type: 'work' });
assert.strictEqual(draftAdvice4, null, 'calculateWeightAdvice must return null when reps is 0');

// 2.2 getExerciseOverallAdvice must return null when sets only have draft weights without reps
const draftSetsOnly = [
  { type: 'warm', weight: 30, reps: '' },
  { type: 'work', weight: 60, reps: null },
  { type: 'work', weight: 60, reps: '' }
];
const overallDraftAdvice = getExerciseOverallAdvice(draftSetsOnly);
assert.strictEqual(overallDraftAdvice, null, 'getExerciseOverallAdvice must return null when sets have no reps');

// 2.3 Verify that uncompleted draft weights do NOT calculate advance targets
const mixedDraftSets = [
  { type: 'warm', weight: 30, reps: 15 }, // warm completed
  { type: 'work', weight: 62, reps: '' }  // new draft weight typed by user, but NOT lifted yet!
];
const mixedAdvice = getExerciseOverallAdvice(mixedDraftSets);
// Should only contain warmAdvice, but workAdvice MUST be null (no premature advance target)
assert(mixedAdvice !== null, 'Mixed advice should exist for completed warm set');
assert.strictEqual(mixedAdvice.workAdvice, null, 'workAdvice MUST be null when working set has no reps');

console.log('✓ TEST 2 Passed: Progressive Overload does not prematurely calculate from draft weights!\n');

// ------------------------------------------------------------------
// TEST 3: Session Lifecycle Auto-Reset & Target Weights for New Session
// ------------------------------------------------------------------
console.log('▶ [TEST 3] Session Lifecycle & Auto-Reset...');

const workoutStore = useWorkoutStore();
const {
  currentDay,
  userState,
  lastWeights,
  workoutHistory,
  toggleSetDone,
  updateWeight,
  updateReps,
  finishAndSaveWorkout,
  getPrevWeight,
  getPrevReps,
  getExerciseLastRecord
} = workoutStore;

currentDay.value = 'mon';

// Simulate User completing Monday workout:
// Exercise m1 (Bench Press)
updateWeight('mon', 'm1', 0, 30);
updateReps('mon', 'm1', 0, 15);
toggleSetDone('mon', 'm1', 0); // done

updateWeight('mon', 'm1', 1, 60);
updateReps('mon', 'm1', 1, 8);
toggleSetDone('mon', 'm1', 1); // done

updateWeight('mon', 'm1', 2, 60);
updateReps('mon', 'm1', 2, 8);
toggleSetDone('mon', 'm1', 2); // done

updateWeight('mon', 'm1', 3, 60);
updateReps('mon', 'm1', 3, 8);
toggleSetDone('mon', 'm1', 3); // done

// Verify state before save
assert.strictEqual(userState['mon']['m1']['set_0'], true, 'Set 0 must be checked before save');
assert.strictEqual(userState['mon']['m1']['set_1'], true, 'Set 1 must be checked before save');
assert.strictEqual(userState['mon']['m1']['set_2'], true, 'Set 2 must be checked before save');
assert.strictEqual(userState['mon']['m1']['set_3'], true, 'Set 3 must be checked before save');

const initialHistoryCount = workoutHistory.value.length;

// Finish and save workout
await finishAndSaveWorkout();

// 3.1 Verify session was recorded to history
assert.strictEqual(workoutHistory.value.length, initialHistoryCount + 1, 'Workout history count should increase by 1');
const lastSession = workoutHistory.value[0];
assert.strictEqual(lastSession.dayKey, 'mon', 'Saved session dayKey should be mon');
assert(lastSession.totalSetsDone >= 4, 'Saved session should have at least 4 completed sets');

// 3.2 Verify checkmarks are automatically reset for next round!
const monStateAfter = userState['mon']?.['m1'] || {};
assert.strictEqual(monStateAfter['set_0'], undefined, 'Set 0 checkmark must be reset (undefined) for new session');
assert.strictEqual(monStateAfter['set_1'], undefined, 'Set 1 checkmark must be reset (undefined) for new session');
assert.strictEqual(monStateAfter['set_2'], undefined, 'Set 2 checkmark must be reset (undefined) for new session');
assert.strictEqual(monStateAfter['set_3'], undefined, 'Set 3 checkmark must be reset (undefined) for new session');

// 3.3 Verify target/last weights for the new session are accurately retrieved from lastWeights
const lastRecord = getExerciseLastRecord('m1');
assert.strictEqual(lastRecord.wt_1, 60, 'Last weight for working set 1 must be 60 kg');
assert.strictEqual(lastRecord.reps_1, 8, 'Last reps for working set 1 must be 8');

// Target recommendation for next round:
// Since 60 kg x 8 reps was optimal/high in 6-8 target range, next session recommended weight should be 62 kg (+2 kg)!
const adviceNextRound = getExerciseOverallAdvice([
  { type: 'work', weight: lastRecord.wt_1, reps: lastRecord.reps_1, targetReps: '6–8' }
]);
assert(adviceNextRound && adviceNextRound.workAdvice, 'Advice for next round should be present');
assert.strictEqual(adviceNextRound.workAdvice.suggestedWeight, 62, 'Next round target weight should be 62 kg (+2 kg overload)');

console.log('✓ TEST 3 Passed: Session lifecycle resets checkmarks and pulls correct target weights for new round!\n');

console.log('====================================================');
console.log('🎉 ALL SPRINT QA & AUTOMATION TESTS PASSED!');
console.log('====================================================');
