import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { workoutData } from '../src/data/workouts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing Bonus Sets (set เสริม) & 3 Local Machine Video Clips Contract...');

// 1. Verify existence of the 3 local video files on the machine
const legPressVideo = path.resolve(__dirname, '../public/videos/leg-press-machine.mp4');
const latPulldownVideo = path.resolve(__dirname, '../public/videos/lat-pulldown-machine.mp4');
const chestPressVideo = path.resolve(__dirname, '../public/videos/chest-press-machine.mp4');

assert(fs.existsSync(legPressVideo), 'public/videos/leg-press-machine.mp4 must exist on machine');
assert(fs.existsSync(latPulldownVideo), 'public/videos/lat-pulldown-machine.mp4 must exist on machine');
assert(fs.existsSync(chestPressVideo), 'public/videos/chest-press-machine.mp4 must exist on machine');

assert(fs.statSync(legPressVideo).size > 1000, 'Leg press video must have valid file size');
assert(fs.statSync(latPulldownVideo).size > 1000, 'Lat pulldown video must have valid file size');
assert(fs.statSync(chestPressVideo).size > 1000, 'Chest press video must have valid file size');

console.log('✓ 3 Local gym machine video clips verified in public/videos/');

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
    assert(bEx.videoUrl || bEx.localVideo, `Bonus exercise must have video demo link or local video: ${bEx.name}`);
  }
}
console.log('✓ Bonus touch-up sets (set เสริม) across all 4 days verified (3 per day, 2 sets each)');

// 3. Verify Local Video integration on the 3 distinct machines in workoutData
assert(workoutData.mon.exercises[0].localVideo === '/videos/leg-press-machine.mp4', 'Monday Leg Press has local clip');
assert(workoutData.tue.exercises[0].localVideo === '/videos/chest-press-machine.mp4', 'Tuesday Chest Press has local clip');
assert(workoutData.wed.exercises[1].localVideo === '/videos/lat-pulldown-machine.mp4', 'Wednesday Lat Pulldown (w2) has local clip');

// Verify bonus exercises link to local videos
const monBonusBack = workoutData.mon.bonusExercises.find(b => b.id === 'b_m_back');
assert(monBonusBack && monBonusBack.localVideo === '/videos/lat-pulldown-machine.mp4', 'Mon bonus back links to local lat pulldown clip');

const tueBonusLeg = workoutData.tue.bonusExercises.find(b => b.id === 'b_t_leg');
assert(tueBonusLeg && tueBonusLeg.localVideo === '/videos/leg-press-machine.mp4', 'Tue bonus leg links to local leg press clip');

const wedBonusChest = workoutData.wed.bonusExercises.find(b => b.id === 'b_w_chest');
assert(wedBonusChest && wedBonusChest.localVideo === '/videos/chest-press-machine.mp4', 'Wed bonus chest links to local chest press clip');

console.log('✓ 3 Local machine clips correctly mapped to both main and bonus exercises');

// 4. Component Implementation Verification (ExerciseCard, BonusCard, DayTabs, MachineClipsShowcase)
const exerciseCardContent = fs.readFileSync(path.resolve(__dirname, '../src/components/ExerciseCard.vue'), 'utf8');
const bonusCardContent = fs.readFileSync(path.resolve(__dirname, '../src/components/BonusCard.vue'), 'utf8');
const dayTabsContent = fs.readFileSync(path.resolve(__dirname, '../src/components/DayTabs.vue'), 'utf8');
const activeRunnerContent = fs.readFileSync(path.resolve(__dirname, '../src/components/ActiveWorkoutSheet.vue'), 'utf8');
const machineShowcaseContent = fs.readFileSync(path.resolve(__dirname, '../src/components/MachineClipsShowcase.vue'), 'utf8');
const headerBarContent = fs.readFileSync(path.resolve(__dirname, '../src/components/HeaderBar.vue'), 'utf8');
const appVueContent = fs.readFileSync(path.resolve(__dirname, '../src/App.vue'), 'utf8');

assert(exerciseCardContent.includes('hasLocalVideo'), 'ExerciseCard supports hasLocalVideo');
assert(exerciseCardContent.includes('🎬 คลิปในเครื่อง (3 เครื่อง)'), 'ExerciseCard has local video switcher');
assert(exerciseCardContent.includes('<video'), 'ExerciseCard renders HTML5 video tag');

assert(bonusCardContent.includes('hasLocalVideo'), 'BonusCard supports hasLocalVideo');
assert(bonusCardContent.includes('🎬 คลิปในเครื่อง (3 เครื่อง)'), 'BonusCard has local video switcher');
assert(bonusCardContent.includes('<video'), 'BonusCard renders HTML5 video tag');

assert(activeRunnerContent.includes('getExerciseVideoInfo'), 'ActiveWorkoutSheet accesses exercise video info');
assert(activeRunnerContent.includes('toggleExerciseVideo'), 'ActiveWorkoutSheet toggles video playback');

assert(machineShowcaseContent.includes('leg-press-machine.mp4'), 'Showcase includes leg press video');
assert(machineShowcaseContent.includes('lat-pulldown-machine.mp4'), 'Showcase includes lat pulldown video');
assert(machineShowcaseContent.includes('chest-press-machine.mp4'), 'Showcase includes chest press video');
assert(machineShowcaseContent.includes('<video'), 'Showcase renders video tag');

assert(headerBarContent.includes('3 คลิปในเครื่อง'), 'HeaderBar has 3 machine clips button');
assert(appVueContent.includes('MachineClipsShowcase'), 'App.vue embeds MachineClipsShowcase component');

assert(dayTabsContent.includes('mon') && dayTabsContent.includes('tue') && dayTabsContent.includes('wed') && dayTabsContent.includes('thu'), 'DayTabs provides direct day navigation');

console.log('✓ All Bonus Sets & 3 Local Machine Video Clips contract tests passed successfully!');
