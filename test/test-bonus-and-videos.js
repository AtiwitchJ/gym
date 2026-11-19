import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { workoutData, MACHINE_VIDEO_PRESETS } from '../src/data/workouts.js';
import { getYoutubeId } from '../src/utils/youtube.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing Bonus Sets (set เสริม) & 3 YouTube Gym Machine Alternatives Contract...');

// 1. Verify NO generated local mp4 files exist (user specifically forbade generated local machine files)
const publicVideosDir = path.resolve(__dirname, '../public/videos');
assert(!fs.existsSync(publicVideosDir) || fs.readdirSync(publicVideosDir).length === 0, 'No local mp4 files should be in public/videos');

console.log('✓ Confirmed no local generated video files on disk');

// 2. Verify Bonus Sets (set เสริม) across all 4 workout days
const days = ['mon', 'tue', 'wed', 'thu'];
for (const day of days) {
  const dayObj = workoutData[day];
  assert(dayObj, `workoutData for ${day} must exist`);
  assert(Array.isArray(dayObj.bonusExercises), `${day} must have bonusExercises array`);
  assert.strictEqual(dayObj.bonusExercises.length, 3, `${day} must have exactly 3 bonus touch-up exercises (set เสริม)`);

  for (const bEx of dayObj.bonusExercises) {
    assert(bEx.id, `Bonus exercise must have an id: ${JSON.stringify(bEx)}`);
    assert(bEx.name, `Bonus exercise must have a name`);
    assert(bEx.part, `Bonus exercise must indicate body part (part)`);
    assert(Array.isArray(bEx.sets), `Bonus exercise must have sets array`);
    assert.strictEqual(bEx.sets.length, 2, `Bonus exercise must have 2 sets (1 warm + 1 touchup)`);
    assert(bEx.sets[0].type === 'warm', 'Set 1 must be warm-up');
    assert(bEx.sets[1].type === 'touchup' || bEx.sets[1].type === 'work', 'Set 2 must be touchup/work set');
    assert(bEx.videoUrl, `Bonus exercise must have valid YouTube video demo link: ${bEx.name}`);
    assert(getYoutubeId(bEx.videoUrl), `Bonus exercise videoUrl must have valid YouTube video ID: ${bEx.videoUrl}`);

    // Bonus exercises must support 3 gym machine alternatives
    assert(Array.isArray(bEx.machineVideos), `Bonus exercise must have machineVideos array: ${bEx.name}`);
    assert.strictEqual(bEx.machineVideos.length, 3, `Bonus exercise must have 3 gym machine video options: ${bEx.name}`);
    for (const opt of bEx.machineVideos) {
      assert(opt.name, 'Option must have a machine name');
      assert(opt.equipment, 'Option must have equipment detail');
      assert(getYoutubeId(opt.videoUrl), `Option videoUrl must have valid YouTube ID: ${opt.videoUrl}`);
    }
  }
}
console.log('✓ Bonus touch-up sets (set เสริม) across all 4 days verified (3 per day, 2 sets each)');

// 3. Verify 3 YouTube Machine Alternatives on key main lifts across days
const testExercises = [
  { day: 'mon', ex: workoutData.mon.exercises[0], label: 'Monday Leg Press' },
  { day: 'tue', ex: workoutData.tue.exercises[0], label: 'Tuesday Chest Press' },
  { day: 'wed', ex: workoutData.wed.exercises[1], label: 'Wednesday Lat Pulldown' },
  { day: 'thu', ex: workoutData.thu.exercises[0], label: 'Thursday Shoulder Press' }
];

for (const { ex, label } of testExercises) {
  assert(Array.isArray(ex.machineVideos), `${label} must have machineVideos array`);
  assert.strictEqual(ex.machineVideos.length, 3, `${label} must have 3 distinct gym machine YouTube options`);
  for (const mOpt of ex.machineVideos) {
    assert(mOpt.name, `${label} machine option must have name`);
    assert(mOpt.equipment, `${label} machine option must have equipment specification`);
    assert(getYoutubeId(mOpt.videoUrl), `${label} option must have valid YouTube ID: ${mOpt.videoUrl}`);
  }
}
console.log('✓ 3 Distinct Gym Machine YouTube Alternatives verified on main lifts');

// 4. Component Implementation Verification (ExerciseCard, BonusCard, ActiveWorkoutSheet, DayTabs)
const exerciseCardContent = fs.readFileSync(path.resolve(__dirname, '../src/components/ExerciseCard.vue'), 'utf8');
const bonusCardContent = fs.readFileSync(path.resolve(__dirname, '../src/components/BonusCard.vue'), 'utf8');
const dayTabsContent = fs.readFileSync(path.resolve(__dirname, '../src/components/DayTabs.vue'), 'utf8');
const activeRunnerContent = fs.readFileSync(path.resolve(__dirname, '../src/components/ActiveWorkoutSheet.vue'), 'utf8');
const headerBarContent = fs.readFileSync(path.resolve(__dirname, '../src/components/HeaderBar.vue'), 'utf8');
const appVueContent = fs.readFileSync(path.resolve(__dirname, '../src/App.vue'), 'utf8');

// Ensure no fake local machine clip modal/button exists
assert(!headerBarContent.includes('3 คลิปในเครื่อง'), 'HeaderBar should not have "3 คลิปในเครื่อง" local file button');
assert(!appVueContent.includes('MachineClipsShowcase'), 'App.vue should not embed MachineClipsShowcase');

// Verify ExerciseCard multi-machine YouTube player
assert(exerciseCardContent.includes('hasMultiMachineVideos'), 'ExerciseCard supports hasMultiMachineVideos');
assert(exerciseCardContent.includes('activeMachineIndex'), 'ExerciseCard has machine switcher index');
assert(exerciseCardContent.includes('youtube-nocookie.com/embed'), 'ExerciseCard embeds YouTube iframe');

// Verify BonusCard multi-machine YouTube player
assert(bonusCardContent.includes('hasMultiMachineVideos'), 'BonusCard supports hasMultiMachineVideos');
assert(bonusCardContent.includes('activeMachineIndex'), 'BonusCard has machine switcher index');
assert(bonusCardContent.includes('youtube-nocookie.com/embed'), 'BonusCard embeds YouTube iframe');

// Verify ActiveWorkoutSheet YouTube player with machine alternatives
assert(activeRunnerContent.includes('getExerciseVideoInfo'), 'ActiveWorkoutSheet accesses exercise video info');
assert(activeRunnerContent.includes('youtube-nocookie.com/embed'), 'ActiveWorkoutSheet embeds YouTube iframe');

// Verify DayTabs has direct access to all days
assert(dayTabsContent.includes("'today'"), 'DayTabs provides direct day navigation via the today tab');

console.log('✓ All Bonus Sets & 3 YouTube Gym Machine Alternatives contract tests passed successfully!');
