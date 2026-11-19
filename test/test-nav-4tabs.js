import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTodayKey, scheduledProgramForDay } from '../src/data/workouts.js';
import { useWorkoutStore } from '../src/composables/useWorkoutStore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: Step 1 navigation cleanup (4 tabs, one วันนี้ tab)');
console.log('====================================================\n');

// 1. Today's program follows the weekday schedule (week 1 = A-B-A, anchor Mon 2026-11-16)
console.log('▶ [1] resolveTodayKey follows the weekday schedule...');
const d = (day) => new Date(2026, 10, day, 9, 0, 0); // November 2026, local 09:00
assert.strictEqual(resolveTodayKey(d(16)), 'prog_a', 'Mon week 1 = A');
assert.strictEqual(resolveTodayKey(d(17)), 'rest', 'Tue = rest');
assert.strictEqual(resolveTodayKey(d(18)), 'prog_b', 'Wed week 1 = B');
assert.strictEqual(resolveTodayKey(d(19)), 'rest', 'Thu = rest');
assert.strictEqual(resolveTodayKey(d(20)), 'prog_a', 'Fri week 1 = A');
assert.strictEqual(resolveTodayKey(d(21)), 'rest', 'Sat = rest');
assert.strictEqual(resolveTodayKey(d(22)), 'rest', 'Sun = rest');
assert.strictEqual(resolveTodayKey(d(23)), scheduledProgramForDay('mon', d(23)), 'week 2 Monday matches the Mon schedule');
console.log('✓ Weekday mapping verified.');

// 2. The store's 'today' tab resolves to today's key
console.log('▶ [2] Store switchTab/switchDay("today") resolve today...');
const store = useWorkoutStore();
const expected = resolveTodayKey();
store.switchTab('today');
assert.strictEqual(store.currentDay.value, expected, 'switchTab(today) must set currentDay to today');
assert.strictEqual(store.currentTab.value, 'today');
store.switchDay('today');
assert.strictEqual(store.currentDay.value, expected, 'switchDay(today) must set currentDay to today');
store.switchTab('workouts');
assert.strictEqual(store.currentTab.value, 'workouts', 'workouts tab keeps its id');
console.log('✓ Store routing verified.');

// 3. Bottom bar: exactly 4 tabs, in order วันนี้ · โปรแกรม · ประวัติ · บัญชี
console.log('▶ [3] DayTabs has exactly 4 tabs, no program pills...');
const dayTabs = fs.readFileSync(path.join(root, 'src/components/DayTabs.vue'), 'utf8');
const block = dayTabs.slice(dayTabs.indexOf('const tabs = ['), dayTabs.indexOf('];', dayTabs.indexOf('const tabs = [')));
const ids = [...block.matchAll(/\{ id: '([a-z]+)'/g)].map((m) => m[1]);
assert.deepStrictEqual(ids, ['today', 'workouts', 'history', 'profile'], 'tab ids must be today, workouts, history, profile');
assert.ok(!dayTabs.includes('⚡'), 'program pills must be removed');
assert.ok(!dayTabs.includes("id: 'exercises'"), 'library must not be a bottom tab');
console.log('✓ Four bottom tabs verified.');

// 4. The library is still reachable, from โปรแกรม
console.log('▶ [4] Exercise library is reachable from โปรแกรม...');
const workouts = fs.readFileSync(path.join(root, 'src/components/WorkoutsView.vue'), 'utf8');
assert.ok(workouts.includes("switchTab('exercises')"), 'WorkoutsView must open the library');
console.log('✓ Library entry point verified.');

console.log('\n====================================================');
console.log('🎉 ALL STEP 1 NAV TESTS PASSED!');
console.log('====================================================');
