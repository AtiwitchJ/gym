import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatRestLabel, saveCustomRest, restRevision, getCustomRest } from '../src/composables/useCustomRest.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function memoryStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
}

console.log('====================================================');
console.log('🧪 QA Test: the saved rest time is shown on the exercise card before Done');
console.log('====================================================\n');

console.log('▶ [1] The label shows the saved time in m:ss, or the default wording...');
assert.strictEqual(formatRestLabel(90), '1:30 (ที่ตั้งไว้)');
assert.strictEqual(formatRestLabel(75), '1:15 (ที่ตั้งไว้)');
assert.strictEqual(formatRestLabel(600), '10:00 (ที่ตั้งไว้)');
assert.strictEqual(formatRestLabel(null), 'ค่าเริ่มต้น', 'nothing saved -> default wording');
assert.strictEqual(formatRestLabel(0), 'ค่าเริ่มต้น');
console.log('✓ Label verified.');

console.log('▶ [2] Saving bumps the revision, so the card re-reads it at once...');
const before = restRevision.value;
const storage = memoryStorage();
assert.strictEqual(saveCustomRest('a1', '150', storage).ok, true);
assert.strictEqual(restRevision.value, before + 1, 'a save bumps the revision');
assert.strictEqual(saveCustomRest('a1', '5', storage).ok, false, 'a rejected save does not bump it');
assert.strictEqual(restRevision.value, before + 1);
assert.strictEqual(getCustomRest('a1', storage), 150);
console.log('✓ Revision verified.');

console.log('▶ [3] The card shows the rest, and Done uses the same value for this exercise...');
const card = read('src/components/ExerciseCard.vue');
assert.ok(card.includes('เวลาพักหลังเซ็ตของท่านี้: <span class="font-bold text-ink">{{ restLabel }}</span>'), 'the card shows the rest before the sets');
assert.ok(card.includes('const restLabel = computed(() => {') && card.includes('formatRestLabel(getCustomRest(props.exercise.id))'), 'the label reads this exercise saved value');
assert.ok(card.includes('const saved = getCustomRest(props.exercise.id);'), 'Done reads this exercise saved value');
assert.ok(!card.includes('nextUndoneSet(workoutData[currentDay.value], userState[currentDay.value]);\n    const saved'), 'Done no longer uses the next set\'s exercise');
console.log('✓ Card and Done verified.');

console.log('\n====================================================');
console.log('🎉 ALL REST-ON-CARD TESTS PASSED!');
console.log('====================================================');
