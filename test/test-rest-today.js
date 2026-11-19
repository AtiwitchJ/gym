import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRestWeekday } from '../src/data/workouts.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: วันนี้ shows the rest view on rest weekdays (Tue/Thu/Sat/Sun)');
console.log('====================================================\n');

console.log('▶ [1] Rest weekdays...');
// 2026-11-16 is a Monday (week of the anchor); 22 is the Sunday after it.
const day = (n) => new Date(2026, 10, 15 + n, 9, 0, 0); // n = 1 (Mon) .. 7 (Sun)
const expected = { Mon: false, Tue: true, Wed: false, Thu: true, Fri: false, Sat: true, Sun: true };
Object.entries(expected).forEach(([label, rest], i) => {
  assert.strictEqual(day(i + 1).getDay(), [1, 2, 3, 4, 5, 6, 0][i], `${label} weekday check`);
  assert.strictEqual(isRestWeekday(day(i + 1)), rest, `${label} rest flag`);
});
console.log('✓ Tue, Thu, Sat, Sun are rest; Mon, Wed, Fri are program days.');

console.log('▶ [2] App.vue: rest view under วันนี้, program hidden on rest days...');
const app = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8');
assert.ok(app.includes("const showRestToday = computed(() => currentTab.value === 'today' && isRestWeekday());"), 'showRestToday must use the weekday rule');
assert.ok(app.includes('isWorkoutDay && currentDayData && !showRestToday'), 'program view must be hidden on rest days');
assert.ok(app.includes("currentTab === 'rest' || showRestToday"), 'RestDayView must show on rest days');
assert.ok(app.includes("import { isRestWeekday } from './data/workouts.js';"), 'App imports isRestWeekday');
console.log('✓ App branches verified.');

console.log('▶ [3] DayTabs subtitle says วันพัก on rest days...');
const tabs = fs.readFileSync(path.join(root, 'src/components/DayTabs.vue'), 'utf8');
assert.ok(tabs.includes("if (isRestWeekday()) return 'วันพัก';"), 'subtitle must be วันพัก on rest days');
console.log('✓ Subtitle verified.');

console.log('\n====================================================');
console.log('🎉 ALL REST-TODAY TESTS PASSED!');
console.log('====================================================');
