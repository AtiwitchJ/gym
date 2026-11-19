import assert from 'node:assert';
import fs from 'node:fs';
import { scheduledProgramForDay, resolveDayKey, AB_SCHEDULE_ANCHOR_MONDAY } from '../src/data/workouts.js';
import { useWorkoutStore } from '../src/composables/useWorkoutStore.js';

console.log('====================================================');
console.log('🧪 QA Test: 3-Day A/B schedule routing (Mon/Wed/Fri = A/B, Tue/Thu = rest)');
console.log('====================================================\n');

const d = (y, m, day) => new Date(y, m - 1, day, 9, 0, 0); // local 09:00

// Anchor sanity: 2026-11-16 is a Monday and is week 1 (A-B-A)
assert.strictEqual(AB_SCHEDULE_ANCHOR_MONDAY, '2026-11-16');
assert.strictEqual(d(2026, 11, 16).getDay(), 1, 'anchor must be a Monday');

console.log('▶ [1] Week 1 (A-B-A) on anchor week...');
assert.strictEqual(scheduledProgramForDay('mon', d(2026, 11, 16)), 'prog_a');
assert.strictEqual(scheduledProgramForDay('wed', d(2026, 11, 18)), 'prog_b');
assert.strictEqual(scheduledProgramForDay('fri', d(2026, 11, 20)), 'prog_a');
// Sunday of the same Mon-based week still belongs to week 1
assert.strictEqual(scheduledProgramForDay('mon', d(2026, 11, 22)), 'prog_a');
console.log('✓ Week 1 = Mon A, Wed B, Fri A.');

console.log('▶ [2] Week 2 (B-A-B) on next calendar week...');
assert.strictEqual(scheduledProgramForDay('mon', d(2026, 11, 23)), 'prog_b');
assert.strictEqual(scheduledProgramForDay('wed', d(2026, 11, 25)), 'prog_a');
assert.strictEqual(scheduledProgramForDay('fri', d(2026, 11, 27)), 'prog_b');
console.log('✓ Week 2 = Mon B, Wed A, Fri B.');

console.log('▶ [3] Weeks before the anchor keep alternating...');
assert.strictEqual(scheduledProgramForDay('mon', d(2026, 11, 9)), 'prog_b', 'one week before anchor = B-A-B');
assert.strictEqual(scheduledProgramForDay('mon', d(2026, 11, 2)), 'prog_a', 'two weeks before anchor = A-B-A');
console.log('✓ Negative week offsets verified.');

console.log('▶ [4] resolveDayKey: Tue/Thu rest, program keys pass through...');
assert.strictEqual(resolveDayKey('tue', d(2026, 11, 17)), 'rest');
assert.strictEqual(resolveDayKey('thu', d(2026, 11, 19)), 'rest');
assert.strictEqual(resolveDayKey('mon', d(2026, 11, 16)), 'prog_a');
assert.strictEqual(resolveDayKey('prog_b', d(2026, 11, 16)), 'prog_b');
assert.strictEqual(resolveDayKey('rest', d(2026, 11, 16)), 'rest');
assert.strictEqual(scheduledProgramForDay('tue', d(2026, 11, 17)), null);
console.log('✓ resolveDayKey mapping verified.');

console.log('▶ [5] Store switch actions use the same routing...');
const store = useWorkoutStore();
const todayMon = scheduledProgramForDay('mon');
store.switchTab('mon');
assert.strictEqual(store.currentDay.value, todayMon, 'switchTab(mon) must resolve to the week program');
assert.strictEqual(store.currentTab.value, 'mon', 'tab highlight keeps the raw tab id');
store.switchTab('tue');
assert.strictEqual(store.currentDay.value, 'rest', 'switchTab(tue) must open rest');
store.switchDay('fri');
assert.strictEqual(store.currentDay.value, scheduledProgramForDay('fri'));
store.switchDay('prog_b');
assert.strictEqual(store.currentDay.value, 'prog_b', 'Program B pill must render prog_b');
assert.strictEqual(store.currentTab.value, 'prog_b');
store.switchTab('rest');
assert.strictEqual(store.currentDay.value, 'rest');
console.log('✓ Store switchTab/switchDay routing verified.');


console.log('▶ [6] No component still gates on the old 4-day keys...');
for (const rel of ['src/components/RestTimer.vue', 'src/components/HeaderBar.vue', 'src/App.vue']) {
  const src = fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
  assert.ok(!src.includes("['mon', 'tue', 'wed', 'thu'"), rel + ' still uses the legacy mon/tue/wed/thu list');
}
console.log('✓ Components gate on prog_a/prog_b.');

console.log('\n====================================================');
console.log('🎉 ALL SCHEDULE ROUTING TESTS PASSED!');
console.log('====================================================');
