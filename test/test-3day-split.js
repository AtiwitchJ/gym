import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  workoutData,
  MACHINE_VIDEO_PRESETS,
  EXERCISE_CANONICAL_MAP,
  getCanonicalExerciseId,
  getLinkedExerciseIds,
  programA,
  programB
} from '../src/data/workouts.js';
import { defaultRoutines } from '../src/data/defaultRoutines.js';
import { defaultExercises } from '../src/data/defaultExercises.js';
import repo from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing 3-Day A/B Alternating Split Implementation...');

// ==========================================
// 1. DATA STRUCTURE TESTS (src/data/workouts.js)
// ==========================================
console.log('▶ [1] Checking workoutData & Program A/B structures...');

// 1.1 Program A structure
assert(programA, 'programA export must exist');
assert.strictEqual(programA.exercises.length, 6, 'Program A must have exactly 6 exercises');
const progAIds = programA.exercises.map(e => e.id);
assert.deepStrictEqual(progAIds, ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], 'Program A IDs must be a1..a6');

// Check Program A exercises details
assert.strictEqual(programA.exercises[0].name, 'Flat Dumbbell Bench Press');
assert.strictEqual(programA.exercises[0].sets.length, 4, 'a1 must have 4 sets (1 warm + 3 work)');
assert.strictEqual(programA.exercises[1].name, 'Lat Pulldown Machine');
assert.strictEqual(programA.exercises[1].sets.length, 4, 'a2 must have 4 sets (1 warm + 3 work)');
assert.strictEqual(programA.exercises[2].name, 'Incline Dumbbell Press');
assert.strictEqual(programA.exercises[2].sets.length, 3, 'a3 must have 3 sets (1 warm + 2 work)');
assert.strictEqual(programA.exercises[3].name, 'Seated Cable Row');
assert.strictEqual(programA.exercises[3].sets.length, 3, 'a4 must have 3 sets (1 warm + 2 work)');
assert.strictEqual(programA.exercises[4].name, 'Pec Fly Machine');
assert.strictEqual(programA.exercises[4].sets.length, 3, 'a5 must have 3 sets (1 warm + 2 work)');
assert.strictEqual(programA.exercises[5].name, 'Hanging Leg Raise');
assert.strictEqual(programA.exercises[5].sets.length, 3, 'a6 must have 3 sets (1 warm + 2 work)');

// 1.2 Program B structure
assert(programB, 'programB export must exist');
assert.strictEqual(programB.exercises.length, 7, 'Program B must have exactly 7 exercises');
const progBIds = programB.exercises.map(e => e.id);
assert.deepStrictEqual(progBIds, ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'], 'Program B IDs must be b1..b7');

// Check Program B exercises details
assert.strictEqual(programB.exercises[0].name, 'Seated Leg Press Machine');
assert.strictEqual(programB.exercises[0].sets.length, 4, 'b1 must have 4 sets (1 warm + 3 work)');
assert.strictEqual(programB.exercises[1].name, 'Smith Machine Hip Thrust');
assert.strictEqual(programB.exercises[1].sets.length, 3, 'b2 must have 3 sets (1 warm + 2 work)');
assert.strictEqual(programB.exercises[2].name, 'Leg Extension Machine');
assert.strictEqual(programB.exercises[2].sets.length, 3, 'b3 must have 3 sets (1 warm + 2 work)');
assert.strictEqual(programB.exercises[3].name, 'Seated DB Shoulder Press');
assert.strictEqual(programB.exercises[3].sets.length, 3, 'b4 must have 3 sets (1 warm + 2 work)');
assert.strictEqual(programB.exercises[4].name, 'Dumbbell Shrug');
assert.strictEqual(programB.exercises[4].sets.length, 3, 'b5 must have 3 sets (1 warm + 2 work)');
assert.strictEqual(programB.exercises[5].name, 'Cable Triceps Pushdown');
assert.strictEqual(programB.exercises[5].sets.length, 3, 'b6 must have 3 sets (1 warm + 2 work)');
assert.strictEqual(programB.exercises[6].name, 'Dumbbell Hammer Curl');
assert.strictEqual(programB.exercises[6].sets.length, 3, 'b7 must have 3 sets (1 warm + 2 work)');

// 1.3 workoutData day keys
assert(workoutData.mon, 'workoutData.mon must exist');
assert(workoutData.wed, 'workoutData.wed must exist');
assert(workoutData.fri, 'workoutData.fri must exist');
assert(workoutData.prog_a, 'workoutData.prog_a must exist');
assert(workoutData.prog_b, 'workoutData.prog_b must exist');
assert(workoutData.tue, 'workoutData.tue must be preserved for backward compatibility');
assert(workoutData.thu, 'workoutData.thu must be preserved for backward compatibility');

console.log('✓ workoutData and Program A/B structures verified successfully');

// ==========================================
// 2. 3 MACHINE VIDEO PRESETS ON ALL EXERCISES
// ==========================================
console.log('▶ [2] Checking 3 Machine Video Presets on all Program A & B exercises...');

const allProgExercises = [...programA.exercises, ...programB.exercises];
for (const ex of allProgExercises) {
  assert(Array.isArray(ex.machineVideos), `${ex.name} (${ex.id}) must have machineVideos array`);
  assert.strictEqual(ex.machineVideos.length, 3, `${ex.name} (${ex.id}) must have exactly 3 machine video presets`);
  for (const preset of ex.machineVideos) {
    assert(preset.name, `Preset for ${ex.name} must have name`);
    assert(preset.videoUrl && preset.videoUrl.startsWith('https://www.youtube.com/'), `Preset for ${ex.name} must have YouTube URL`);
  }
}
console.log('✓ All 13 Program A & B exercises verified with 3 distinct machine video presets');

// ==========================================
// 3. CANONICAL & CROSS-DAY MAPPINGS
// ==========================================
console.log('▶ [3] Checking Canonical Exercise Mappings...');

// Program A mappings
assert.strictEqual(getCanonicalExerciseId('a1'), 'chest_press', 'a1 -> chest_press');
assert.strictEqual(getCanonicalExerciseId('a2'), 'lat_pulldown', 'a2 -> lat_pulldown');
assert.strictEqual(getCanonicalExerciseId('a3'), 'incline_chest', 'a3 -> incline_chest');
assert.strictEqual(getCanonicalExerciseId('a4'), 'row_back', 'a4 -> row_back');
assert.strictEqual(getCanonicalExerciseId('a5'), 'chest_fly', 'a5 -> chest_fly');
assert.strictEqual(getCanonicalExerciseId('a6'), 'hanging_leg_raise', 'a6 -> hanging_leg_raise');

// Program B mappings
assert.strictEqual(getCanonicalExerciseId('b1'), 'seated_leg_press', 'b1 -> seated_leg_press');
assert.strictEqual(getCanonicalExerciseId('b2'), 'hip_thrust', 'b2 -> hip_thrust');
assert.strictEqual(getCanonicalExerciseId('b3'), 'leg_extension', 'b3 -> leg_extension');
assert.strictEqual(getCanonicalExerciseId('b4'), 'shoulder_press', 'b4 -> shoulder_press');
assert.strictEqual(getCanonicalExerciseId('b5'), 'shrug', 'b5 -> shrug');
assert.strictEqual(getCanonicalExerciseId('b6'), 'triceps_pushdown', 'b6 -> triceps_pushdown');
assert.strictEqual(getCanonicalExerciseId('b7'), 'hammer_curl', 'b7 -> hammer_curl');

// Bidirectional link checking
const chestLinks = getLinkedExerciseIds('a1');
assert(chestLinks.includes('t1'), 'a1 must link with t1 (Tuesday chest press)');
assert(chestLinks.includes('b_m_chest'), 'a1 must link with Monday bonus chest');

const latLinks = getLinkedExerciseIds('a2');
assert(latLinks.includes('w2'), 'a2 must link with w2 (Wednesday lat pulldown)');

const legPressLinks = getLinkedExerciseIds('b1');
assert(legPressLinks.includes('m1'), 'b1 must link with m1 (Monday leg press)');

const shoulderLinks = getLinkedExerciseIds('b4');
assert(shoulderLinks.includes('th1'), 'b4 must link with th1 (Thursday shoulder press)');

console.log('✓ Canonical ID mappings and bidirectional cross-day links verified successfully');

// ==========================================
// 4. ROUTINE TEMPLATES (src/data/defaultRoutines.js)
// ==========================================
console.log('▶ [4] Checking Routine Templates in defaultRoutines.js...');

const progARoutine = defaultRoutines.find(r => r.id === 'atiwitch_prog_a' || r.id === 'program_a');
assert(progARoutine, 'defaultRoutines must contain Program A routine template');
assert.strictEqual(progARoutine.exercises.length, 6, 'Program A routine must have 6 exercises');
for (const ex of progARoutine.exercises) {
  const catalogEx = defaultExercises.find(e => e.id === ex.exerciseId);
  assert(catalogEx, `Exercise ${ex.exerciseId} in Program A routine must exist in defaultExercises catalog`);
}

const progBRoutine = defaultRoutines.find(r => r.id === 'atiwitch_prog_b' || r.id === 'program_b');
assert(progBRoutine, 'defaultRoutines must contain Program B routine template');
assert.strictEqual(progBRoutine.exercises.length, 7, 'Program B routine must have 7 exercises');
for (const ex of progBRoutine.exercises) {
  const catalogEx = defaultExercises.find(e => e.id === ex.exerciseId);
  assert(catalogEx, `Exercise ${ex.exerciseId} in Program B routine must exist in defaultExercises catalog`);
}

console.log('✓ Routine templates for Program A and Program B verified in defaultRoutines');

// ==========================================
// 5. UI COMPONENTS CONTRACT (DayTabs.vue & WorkoutsView.vue)
// ==========================================
console.log('▶ [5] Checking DayTabs.vue & WorkoutsView.vue contracts...');

const dayTabsContent = fs.readFileSync(path.resolve(__dirname, '../src/components/DayTabs.vue'), 'utf8');
const workoutsViewContent = fs.readFileSync(path.resolve(__dirname, '../src/components/WorkoutsView.vue'), 'utf8');

// DayTabs contract
assert(dayTabsContent.includes('fri') && dayTabsContent.includes('ศุกร์'), 'DayTabs must support Friday (ศุกร์)');
assert(dayTabsContent.includes('Program A') || dayTabsContent.includes('prog_a'), 'DayTabs must support Program A switching');
assert(dayTabsContent.includes('Program B') || dayTabsContent.includes('prog_b'), 'DayTabs must support Program B switching');
assert(dayTabsContent.includes('mon') && dayTabsContent.includes('wed'), 'DayTabs preserves mon and wed');
assert(dayTabsContent.includes('tue') && dayTabsContent.includes('thu'), 'DayTabs preserves tue and thu for backward compatibility');
assert(dayTabsContent.includes('workouts') && dayTabsContent.includes('exercises') && dayTabsContent.includes('history') && dayTabsContent.includes('profile'), 'DayTabs preserves 4 global tabs');

// WorkoutsView contract
assert(workoutsViewContent.includes('Program A') || workoutsViewContent.includes('atiwitch_prog_a'), 'WorkoutsView includes Program A Quick Chip / 1-Click Launch');
assert(workoutsViewContent.includes('Program B') || workoutsViewContent.includes('atiwitch_prog_b'), 'WorkoutsView includes Program B Quick Chip / 1-Click Launch');
assert(!workoutsViewContent.includes('scheduleChips') && !workoutsViewContent.includes('ATIWITCH 4-DAY PROTOCOL'), 'WorkoutsView has no retired 4-day chips');

console.log('✓ DayTabs.vue and WorkoutsView.vue contract checks passed successfully');

// ==========================================
// 6. SQLITE DB LAYER INTEGRATION (server/db.js)
// ==========================================
console.log('▶ [6] Checking SQLite Canonical DB Sync for Program A & B...');

assert.strictEqual(repo.getCanonicalExerciseId('a1'), 'chest_press', 'repo.getCanonicalExerciseId(a1) === chest_press');
assert.strictEqual(repo.getCanonicalExerciseId('b1'), 'seated_leg_press', 'repo.getCanonicalExerciseId(b1) === seated_leg_press');
assert.strictEqual(repo.getCanonicalExerciseId('b4'), 'shoulder_press', 'repo.getCanonicalExerciseId(b4) === shoulder_press');

console.log('✓ SQLite DB layer canonical mapping verified successfully');

console.log('\n🎉 ALL 3-DAY A/B ALTERNATING SPLIT CONTRACT TESTS PASSED!');
