import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isBarbellExercise } from '../src/composables/usePlateCalculator.js';
import { workoutData } from '../src/data/workouts.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: Plate calculator moved off the set screen (step 6c)');
console.log('====================================================\n');

console.log('▶ [1] Barbell rule on real exercises...');
const byId = Object.fromEntries([...workoutData.prog_a.exercises, ...workoutData.prog_b.exercises].map((e) => [e.id, e]));
assert.strictEqual(isBarbellExercise(byId.b2), true, 'Smith Machine Hip Thrust is barbell-style');
assert.strictEqual(isBarbellExercise(byId.b5), false, 'Dumbbell Shrug is not barbell (its alternate mentions Smith)');
assert.strictEqual(isBarbellExercise(byId.a1), false, 'Flat Dumbbell Bench Press is not barbell');
assert.strictEqual(isBarbellExercise(byId.b1), false, 'Leg press machine is not barbell');
assert.strictEqual(isBarbellExercise({ name: 'Barbell Bench Press' }), true);
assert.strictEqual(isBarbellExercise({ name: 'Row', altName: 'บาร์เบลก้มตัว' }), true);
assert.strictEqual(isBarbellExercise({ name: 'Calf Raise' }), false);
assert.strictEqual(isBarbellExercise(undefined), false, 'missing exercise is safe');
console.log('✓ Barbell rule verified.');

console.log('▶ [2] Set-screen keypad no longer offers the plate calculator...');
const keypad = fs.readFileSync(path.join(root, 'src/components/PinKeypad.vue'), 'utf8');
assert.ok(!keypad.includes('แผ่นเหล็ก'), 'plate button removed from the keypad');
assert.ok(!keypad.includes('openPlateCalc'), 'keypad no longer opens the calculator');
assert.ok(!keypad.includes('usePlateCalculator'), 'keypad no longer imports the calculator');
console.log('✓ Keypad cleaned up.');

console.log('▶ [3] Card header offers the calculator for barbell exercises only...');
const card = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
assert.ok(card.includes('v-if="isBarbell"') && card.includes('🏋️ คำนวณแผ่น'), 'button is shown only for barbell exercises');
assert.ok(card.includes('@click="openPlatesForExercise"'), 'button opens the calculator');
assert.ok(card.includes('const isBarbell = isBarbellExercise(props.exercise);'), 'card decides with the barbell rule');
assert.ok(card.includes('updateWeight(currentDay.value, props.exercise.id, idx, String(val));'), 'the calculator value is applied to the set');
console.log('✓ Card wiring verified.');

console.log('▶ [4] The calculator modal stays mounted for the card to use...');
const app = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8');
assert.ok(app.includes('<PlateCalculatorModal />'), 'App still mounts the calculator modal');
console.log('✓ Modal kept.');

console.log('\n====================================================');
console.log('🎉 ALL PLATE-OFF-SET TESTS PASSED!');
console.log('====================================================');
