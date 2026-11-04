import assert from 'node:assert';
import {
  EXERCISE_CANONICAL_MAP,
  getCanonicalExerciseId,
  getLinkedExerciseIds
} from '../src/data/workouts.js';
import { useWorkoutStore } from '../src/composables/useWorkoutStore.js';

console.log('Testing Cross-Day Exercise Synchronization...');

// 1. Test canonical mapping
assert.strictEqual(getCanonicalExerciseId('m1'), 'seated_leg_press');
assert.strictEqual(getCanonicalExerciseId('b_t_leg'), 'seated_leg_press');
assert.strictEqual(getCanonicalExerciseId('b_w_leg'), 'seated_leg_press');
assert.strictEqual(getCanonicalExerciseId('b_th_leg'), 'seated_leg_press');

assert.strictEqual(getCanonicalExerciseId('t1'), 'chest_press');
assert.strictEqual(getCanonicalExerciseId('b_m_chest'), 'chest_press');
assert.strictEqual(getCanonicalExerciseId('b_w_chest'), 'chest_press');
assert.strictEqual(getCanonicalExerciseId('b_th_chest'), 'chest_press');

assert.strictEqual(getCanonicalExerciseId('w2'), 'lat_pulldown');
assert.strictEqual(getCanonicalExerciseId('b_m_back'), 'lat_pulldown');
assert.strictEqual(getCanonicalExerciseId('b_t_back'), 'lat_pulldown');
assert.strictEqual(getCanonicalExerciseId('b_th_back'), 'lat_pulldown');

assert.strictEqual(getCanonicalExerciseId('th1'), 'shoulder_press');
assert.strictEqual(getCanonicalExerciseId('b_m_shoulder'), 'shoulder_press');
assert.strictEqual(getCanonicalExerciseId('b_t_shoulder'), 'shoulder_press');
assert.strictEqual(getCanonicalExerciseId('b_w_shoulder'), 'shoulder_press');

console.log('✓ Canonical and linked exercise ID mapping verified');

// 2. Test linked exercises retrieval
const linkedLeg = getLinkedExerciseIds('m1');
assert.deepStrictEqual(linkedLeg, ['m1', 'b_t_leg', 'b_w_leg', 'b_th_leg']);

const linkedChestBonus = getLinkedExerciseIds('b_m_chest');
assert.deepStrictEqual(linkedChestBonus, ['t1', 'b_m_chest', 'b_w_chest', 'b_th_chest']);
console.log('✓ getLinkedExerciseIds returns correct peer lists for both main and bonus IDs');

// 3. Test store state propagation
const store = useWorkoutStore();

// Reset/mock store state for test
store.lastWeights['m1'] = { wt_0: 65, reps_0: 20, wt_1: 84, reps_1: 8, wt_2: 84, reps_2: 8, wt_3: 84, reps_3: 8 };

// Propagate updates
store.syncLinkedExerciseRecords('m1', 0, 65, 20);
store.syncLinkedExerciseRecords('m1', 1, 86, 8);

// Verify linked bonus exercise (b_t_leg on Tuesday)
const tuesdayBonusRecord = store.getExerciseLastRecord('b_t_leg');
assert.strictEqual(tuesdayBonusRecord.wt_0, 65, 'Warmup weight should sync to Tuesday bonus');
assert.strictEqual(tuesdayBonusRecord.reps_0, 20, 'Warmup reps should sync to Tuesday bonus');
assert.strictEqual(tuesdayBonusRecord.wt_1, 86, 'Touch-up working weight should sync from main lift');
assert.strictEqual(tuesdayBonusRecord.reps_1, 8, 'Touch-up working reps should sync from main lift');

// Verify linked bonus exercise (b_w_leg on Wednesday)
const wednesdayBonusRecord = store.getExerciseLastRecord('b_w_leg');
assert.strictEqual(wednesdayBonusRecord.wt_1, 86, 'Working weight should sync to Wednesday bonus');

// 4. Test Bonus -> Main lift propagation
// Say Monday touch-up chest press is performed at 45kg x 8 reps
store.syncLinkedExerciseRecords('b_m_chest', 0, 30, 15);
store.syncLinkedExerciseRecords('b_m_chest', 1, 45, 8);

const tuesdayMainChest = store.getExerciseLastRecord('t1');
assert.strictEqual(tuesdayMainChest.wt_0, 30, 'Warmup weight should propagate from Monday bonus to Tuesday main');
assert.strictEqual(tuesdayMainChest.reps_0, 15, 'Warmup reps should propagate');
assert.strictEqual(tuesdayMainChest.wt_1, 45, 'Working weight S1 should propagate');
assert.strictEqual(tuesdayMainChest.wt_2, 45, 'Working weight S2 should propagate fallback');
assert.strictEqual(tuesdayMainChest.wt_3, 45, 'Working weight S3 should propagate fallback');
console.log('✓ Bidirectional Main <-> Bonus synchronization passes successfully');

// 5. Test applyPrevRecord integration
store.applyPrevRecord('tue', 'b_t_leg', 0, 65, 20);
store.applyPrevRecord('tue', 'b_t_leg', 1, 86, 8);
assert.strictEqual(store.userState.tue.b_t_leg.wt_0, 65);
assert.strictEqual(store.userState.tue.b_t_leg.reps_0, 20);
assert.strictEqual(store.userState.tue.b_t_leg.wt_1, 86);
assert.strictEqual(store.userState.tue.b_t_leg.reps_1, 8);
console.log('✓ applyPrevRecord correctly populates draft state with synced weights');

console.log('All Cross-Day Synchronization tests passed successfully!');
