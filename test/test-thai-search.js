import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchesQuery, thaiSearchText, MUSCLE_TH, EQUIP_TH } from '../src/data/thaiSearch.js';
import { useExerciseStore } from '../src/composables/useExerciseStore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: exercise search matches Thai (secondary item 2)');
console.log('====================================================\n');

const store = useExerciseStore();
const search = (q) => {
  store.searchQuery.value = q;
  return store.filteredExercises.value;
};

console.log('▶ [1] Thai queries return results (อก, ดัมเบล, ขา, สควอท)...');
for (const q of ['อก', 'ดัมเบล', 'ขา', 'สควอท']) {
  assert.ok(search(q).length > 0, `"${q}" must return exercises`);
}
store.searchQuery.value = '';
console.log('✓ Thai queries find exercises.');

console.log('▶ [2] The matches are the right exercises...');
const squats = search('สควอท').map((e) => e.name);
assert.ok(squats.some((n) => /squat/i.test(n)), 'สควอท finds the squat exercises');
const dumbbells = search('ดัมเบล').every((e) => e.equipment === 'dumbbell' || /dumbbell/i.test(e.name) || thaiSearchText(e).includes('ดัมเบล'));
assert.ok(dumbbells, 'ดัมเบล only finds dumbbell exercises');
const chest = search('อก');
assert.ok(chest.every((e) => e.muscleGroup === 'chest' || thaiSearchText(e).includes('อก') || (e.notes || '').includes('อก')), 'อก finds chest exercises');
store.searchQuery.value = '';
console.log('✓ Results match.');

console.log('▶ [3] English search still works, and an empty query returns everything...');
assert.ok(search('squat').length > 0, 'English search still works');
assert.ok(search('chest').length > 0, 'muscle name in English still works');
store.searchQuery.value = '';
assert.strictEqual(store.filteredExercises.value.length, store.exercises.value.length, 'empty query returns all');
assert.strictEqual(matchesQuery({ name: 'Calf Raise', muscleGroup: 'other' }, 'ไม่มีคำนี้'), false, 'an unrelated Thai word does not match');
console.log('✓ English and empty queries verified.');

console.log('▶ [4] The Thai table covers every muscle group and equipment key in the library...');
const keys = [...new Set(store.exercises.value.map((e) => e.muscleGroup))];
const eqKeys = [...new Set(store.exercises.value.map((e) => e.equipment))];
assert.ok(keys.every((k) => MUSCLE_TH[k]), `every muscle has Thai: missing ${keys.filter((k) => !MUSCLE_TH[k])}`);
assert.ok(eqKeys.every((k) => EQUIP_TH[k]), `every equipment has Thai: missing ${eqKeys.filter((k) => !EQUIP_TH[k])}`);
console.log('✓ Coverage verified.');

console.log('▶ [5] Wiring: the store uses the Thai-aware match...');
const src = fs.readFileSync(path.join(root, 'src/composables/useExerciseStore.js'), 'utf8');
assert.ok(src.includes("import { matchesQuery } from '../data/thaiSearch.js';"), 'store imports the matcher');
assert.ok(src.includes('if (query && !matchesQuery(exercise, query)) {'), 'store filters with it');
console.log('✓ Wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL THAI-SEARCH TESTS PASSED!');
console.log('====================================================');
