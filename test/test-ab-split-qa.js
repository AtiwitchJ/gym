import assert from 'node:assert';
import { PROGRAM_A, PROGRAM_B, AB_SPLIT_CANONICAL_MAP, AB_MACHINE_VIDEO_PRESETS } from '../src/data/abSplit.js';
import { getCanonicalExerciseId, getLinkedExerciseIds } from '../src/data/workouts.js';
import { getYoutubeId } from '../src/utils/youtube.js';
import { calculateWeightAdvice, getExerciseOverallAdvice, parseRepTarget } from '../src/composables/useWeightAdvisor.js';
import { useActiveSessionStore } from '../src/composables/useActiveSessionStore.js';
import { useRoutineStore } from '../src/composables/useRoutineStore.js';
import repo from '../server/db.js';

console.log('====================================================');
console.log('🧪 GYM QA Test: 3-Day A/B Split Verification Suite');
console.log('====================================================\n');

// ------------------------------------------------------------------
// 1. Structure Verification: Program A (6 exercises) & Program B (7 exercises)
// ------------------------------------------------------------------
console.log('▶ [1] Validating Program A and Program B Structure...');

// 1.1 Program A: อก + หลัง + ท้อง (6 ท่า)
assert(PROGRAM_A, 'PROGRAM_A definition must exist');
assert.strictEqual(PROGRAM_A.exercises.length, 6, 'Program A MUST contain exactly 6 exercises');
assert(PROGRAM_A.title.includes('Program A'), 'Program A title must be clear');

const progACategories = PROGRAM_A.exercises.map(e => e.category);
assert(progACategories.some(c => c.includes('อก')), 'Program A must include Chest (อก) exercises');
assert(progACategories.some(c => c.includes('หลัง')), 'Program A must include Back (หลัง) exercises');
assert(progACategories.some(c => c.includes('ท้อง')), 'Program A must include Abs (ท้อง) exercises');

for (const ex of PROGRAM_A.exercises) {
  assert(ex.id, `Program A exercise must have id: ${ex.name}`);
  assert(ex.name, `Program A exercise must have name: ${ex.id}`);
  assert(Array.isArray(ex.sets), `Exercise ${ex.name} must have sets array`);
  assert.strictEqual(ex.sets.length, 4, `Exercise ${ex.name} must have exactly 4 sets (1 warm + 3 work)`);
  assert.strictEqual(ex.sets[0].type, 'warm', `${ex.name} set 1 must be warm-up`);
  assert.strictEqual(ex.sets[1].type, 'work', `${ex.name} set 2 must be working set`);
  assert.strictEqual(ex.sets[2].type, 'work', `${ex.name} set 3 must be working set`);
  assert.strictEqual(ex.sets[3].type, 'work', `${ex.name} set 4 must be working set`);

  const warmReps = parseRepTarget(ex.sets[0].reps);
  assert(warmReps.min === 15 || warmReps.max === 15, `${ex.name} warmup set should target 15 reps`);
}
console.log('✓ Program A verified: 6 exercises (อก + หลัง + ท้อง) with 4 sets each (1 warm + 3 work)');

// 1.2 Program B: ขา + แขน + ไหล่/บ่า (7 ท่า)
assert(PROGRAM_B, 'PROGRAM_B definition must exist');
assert.strictEqual(PROGRAM_B.exercises.length, 7, 'Program B MUST contain exactly 7 exercises');
assert(PROGRAM_B.title.includes('Program B'), 'Program B title must be clear');

const progBCategories = PROGRAM_B.exercises.map(e => e.category);
assert(progBCategories.some(c => c.includes('ขา')), 'Program B must include Legs (ขา) exercises');
assert(progBCategories.some(c => c.includes('แขน')), 'Program B must include Arms (แขน) exercises');
assert(progBCategories.some(c => c.includes('ไหล่') || c.includes('บ่า') || c.includes('คอ')), 'Program B must include Shoulders/Traps/Neck');

for (const ex of PROGRAM_B.exercises) {
  assert(ex.id, `Program B exercise must have id: ${ex.name}`);
  assert(ex.name, `Program B exercise must have name: ${ex.id}`);
  assert(Array.isArray(ex.sets), `Exercise ${ex.name} must have sets array`);
  assert.strictEqual(ex.sets.length, 4, `Exercise ${ex.name} must have exactly 4 sets (1 warm + 3 work)`);
  assert.strictEqual(ex.sets[0].type, 'warm', `${ex.name} set 1 must be warm-up`);
  assert.strictEqual(ex.sets[1].type, 'work', `${ex.name} set 2 must be working set`);
  assert.strictEqual(ex.sets[2].type, 'work', `${ex.name} set 3 must be working set`);
  assert.strictEqual(ex.sets[3].type, 'work', `${ex.name} set 4 must be working set`);
}
console.log('✓ Program B verified: 7 exercises (ขา + แขน + ไหล่/บ่า) with 4 sets each (1 warm + 3 work)\n');

// ------------------------------------------------------------------
// 2. YouTube Machine Video Alternatives (3 Distinct Machines Per Exercise)
// ------------------------------------------------------------------
console.log('▶ [2] Validating YouTube Machine Video Alternatives...');

const allSplitExercises = [...PROGRAM_A.exercises, ...PROGRAM_B.exercises];
for (const ex of allSplitExercises) {
  assert(Array.isArray(ex.machineVideos), `Exercise ${ex.name} must provide machineVideos array`);
  assert.strictEqual(
    ex.machineVideos.length,
    3,
    `Exercise ${ex.name} must provide exactly 3 distinct machine options`
  );

  const seenUrls = new Set();
  for (let idx = 0; idx < ex.machineVideos.length; idx++) {
    const opt = ex.machineVideos[idx];
    assert(opt.name, `Machine option ${idx + 1} for ${ex.name} must have a name`);
    assert(opt.equipment, `Machine option ${idx + 1} for ${ex.name} must have equipment description`);
    assert(opt.videoUrl, `Machine option ${idx + 1} for ${ex.name} must have a videoUrl`);

    const yId = getYoutubeId(opt.videoUrl);
    assert(yId && yId.length === 11, `Machine option ${idx + 1} videoUrl must have valid 11-char YouTube ID (${opt.videoUrl})`);
    seenUrls.add(opt.videoUrl);
  }
  assert.strictEqual(seenUrls.size, 3, `Exercise ${ex.name} must have 3 distinct video URLs`);
}
console.log('✓ All 13 exercises across Program A & B provide 3 valid YouTube machine video alternatives\n');

// ------------------------------------------------------------------
// 3. Progressive Overload Calculations for A/B Split Exercises
// ------------------------------------------------------------------
console.log('▶ [3] Validating Progressive Overload Logic on A/B Split Exercises...');

// Case 3.1: Program A Chest Press working set reps > 8 (e.g. 10 reps) -> Overload +2 kg
const a1Overload = calculateWeightAdvice({
  weight: 60,
  reps: 10,
  type: 'work',
  targetReps: '6–8'
});
assert.strictEqual(a1Overload.status, 'increase', 'Lifting more than target range (> 8 reps) recommends increase');
assert.strictEqual(a1Overload.delta, 2, 'Should recommend +2 kg');
assert.strictEqual(a1Overload.suggestedWeight, 62, 'Suggested weight should be 62 kg');

// Case 3.1b: Program A Chest Press working set in sweet spot (8 reps in 6-8) -> Optimal
const a1Optimal = calculateWeightAdvice({
  weight: 60,
  reps: 8,
  type: 'work',
  targetReps: '6–8'
});
assert.strictEqual(a1Optimal.status, 'optimal', 'Lifting in sweet spot (6-8 reps) is optimal');
assert.strictEqual(a1Optimal.delta, 0, 'Delta is 0 for optimal set');
assert.strictEqual(a1Optimal.suggestedWeight, 60, 'Suggested weight maintains at 60 kg');

// Case 3.2: Program B Leg Press working set low reps (4 reps < 6) -> Deload -2 kg
const b1Deload = calculateWeightAdvice({
  weight: 90,
  reps: 4,
  type: 'work',
  targetReps: '6–8'
});
assert.strictEqual(b1Deload.status, 'decrease', 'Lifting below target range recommends decrease');
assert.strictEqual(b1Deload.delta, -2, 'Should recommend -2 kg');
assert.strictEqual(b1Deload.suggestedWeight, 88, 'Suggested weight should be 88 kg');

// Case 3.3: Exercise overall advice across complete sets
const fullExerciseSets = [
  { type: 'warm', weight: 40, reps: 15 },
  { type: 'work', weight: 70, reps: 8, targetReps: '6–8' },
  { type: 'work', weight: 70, reps: 8, targetReps: '6–8' },
  { type: 'work', weight: 70, reps: 8, targetReps: '6–8' }
];
const overallProgAdvice = getExerciseOverallAdvice(fullExerciseSets);
assert(overallProgAdvice && overallProgAdvice.workAdvice, 'Should produce overall working advice');
assert.strictEqual(overallProgAdvice.workAdvice.delta, 2, 'Consistently hitting 8 reps triggers +2 kg overall advice');
assert.strictEqual(overallProgAdvice.workAdvice.suggestedWeight, 72, 'Next session should suggest 72 kg');

// Case 3.4: Draft weight guard (draft weight entered without reps must NOT compute advice)
const draftOnlySets = [
  { type: 'warm', weight: 40, reps: 15 },
  { type: 'work', weight: 75, reps: '' } // in-progress draft
];
const draftAdvice = getExerciseOverallAdvice(draftOnlySets);
assert.strictEqual(draftAdvice.workAdvice, null, 'Draft weight without reps must NOT trigger advance workAdvice');
console.log('✓ Progressive Overload advice accurately calculated across all A/B Split targets\n');

// ------------------------------------------------------------------
// 4. Canonical Exercise ID & Cross-Day Synchronization
// ------------------------------------------------------------------
console.log('▶ [4] Validating Canonical ID & Cross-Day Sync for A/B Split...');

assert.strictEqual(getCanonicalExerciseId('a1_chest_press'), 'chest_press');
assert.strictEqual(getCanonicalExerciseId('a3_lat_pulldown'), 'lat_pulldown');
assert.strictEqual(getCanonicalExerciseId('b1_leg_press'), 'seated_leg_press');
assert.strictEqual(getCanonicalExerciseId('b3_shoulder_press'), 'shoulder_press');

const chestLinks = getLinkedExerciseIds('a1_chest_press');
assert(chestLinks.includes('t1'), 'a1_chest_press must link to Tuesday main chest press (t1)');
assert(chestLinks.includes('b_m_chest'), 'a1_chest_press must link to Monday bonus chest');

const legLinks = getLinkedExerciseIds('b1_leg_press');
assert(legLinks.includes('m1'), 'b1_leg_press must link to Monday main leg press (m1)');

// SQLite cross-sync simulation:
repo.db.prepare("DELETE FROM exercise_last_weights WHERE exercise_id IN ('a1_chest_press', 't1', 'chest_press', 'b1_leg_press', 'm1', 'seated_leg_press')").run();
// Save record for a1_chest_press (70 kg x 8 reps)
repo.saveLastRecord('a1_chest_press', 1, 70, 8, '2026-11-19T23:59:59.000Z', true);

// Verify canonical propagation to t1 (Tuesday chest press)
const t1Record = repo.getLastWeights('t1');
assert.strictEqual(t1Record.wt_1, 70, 't1 should receive weight 70 kg propagated from a1_chest_press');
assert.strictEqual(t1Record.reps_1, 8, 't1 should receive reps 8 propagated from a1_chest_press');

console.log('✓ Canonical ID cross-day synchronization verified with SQLite backend\n');

// ------------------------------------------------------------------
// 5. Active Session Store & Routine Integration
// ------------------------------------------------------------------
console.log('▶ [5] Validating Active Session Store Integration with A/B Routines...');

const routineStore = useRoutineStore();
const sessionStore = useActiveSessionStore();

// Verify default routines include Program A and Program B
const progARoutine = routineStore.getRoutineById('atiwitch_ab_program_a');
assert(progARoutine !== null, 'Routine store must have atiwitch_ab_program_a');
assert.strictEqual(progARoutine.exercises.length, 6, 'Program A routine in store must have 6 exercises');

const progBRoutine = routineStore.getRoutineById('atiwitch_ab_program_b');
assert(progBRoutine !== null, 'Routine store must have atiwitch_ab_program_b');
assert.strictEqual(progBRoutine.exercises.length, 7, 'Program B routine in store must have 7 exercises');

// Test Live Session execution for Program A
sessionStore.discardSession();
sessionStore.startSessionFromRoutine(progARoutine);
assert.strictEqual(sessionStore.isWorkoutActive.value, true, 'Session should be active');
assert.strictEqual(sessionStore.activeSession.value.exercises.length, 6, 'Active session loaded with 6 exercises');

// Complete first exercise sets and toggle completion
sessionStore.updateSetMetric(0, 0, 'weight', 30);
sessionStore.updateSetMetric(0, 0, 'reps', 15);
sessionStore.toggleSetComplete(0, 0);

sessionStore.updateSetMetric(0, 1, 'weight', 60);
sessionStore.updateSetMetric(0, 1, 'reps', 8);
sessionStore.toggleSetComplete(0, 1);

// Finish session
const summary = sessionStore.finishSession();
assert(summary, 'Session summary should be produced');
assert.strictEqual(sessionStore.isWorkoutActive.value, false, 'Session should become inactive after finish');
assert.strictEqual(sessionStore.activeSession.value, null, 'Active session should be cleared');
assert(summary.totalSetsCompleted >= 2, 'Summary records completed sets');

console.log('✓ Active Session store seamlessly executes Program A & B live workouts\n');

console.log('====================================================');
console.log('🎉 ALL 3-DAY A/B SPLIT QA TESTS PASSED SUCCESSFULLY!');
console.log('====================================================');
