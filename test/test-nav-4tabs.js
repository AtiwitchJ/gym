import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nextProgramKey } from '../src/data/workouts.js';
import { useWorkoutStore } from '../src/composables/useWorkoutStore.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: Nav (4 tabs, one วันนี้ tab) — steps 1–2');
console.log('====================================================\n');

// 1. วันนี้ follows the last completed session, not the weekday
console.log('▶ [1] วันนี้ program follows the last completed session...');
const store = useWorkoutStore();
assert.strictEqual(store.todayProgramKey.value, 'prog_a', 'no history yet -> Program A');
store.switchTab('today');
assert.strictEqual(store.currentDay.value, 'prog_a', 'switchTab(today) -> Program A with empty history');
assert.strictEqual(store.currentTab.value, 'today');
store.switchDay('today');
assert.strictEqual(store.currentDay.value, 'prog_a', 'switchDay(today) follows the same rule');
console.log('✓ วันนี้ resolves from history (not weekday).');

// 2. Recording a completed session moves วันนี้ to the other program
console.log('▶ [2] Saving a session moves วันนี้ to the other program...');
store.workoutHistory.value.unshift({ id: 'verify_a', date: '2026-11-16', time: '18:00', dayKey: 'prog_a', exercises: [] });
store.refreshTodayDay();
assert.strictEqual(store.todayProgramKey.value, 'prog_b', 'after Program A, วันนี้ is Program B');
assert.strictEqual(store.currentDay.value, 'prog_b', 'open วันนี้ tab now shows Program B');
store.switchTab('workouts');
store.workoutHistory.value.unshift({ id: 'verify_b', date: '2026-11-18', time: '18:00', dayKey: 'prog_b', exercises: [] });
store.refreshTodayDay();
assert.strictEqual(store.todayProgramKey.value, 'prog_a', 'after B, วันนี้ is A again');
assert.strictEqual(store.currentDay.value, 'prog_b', 'refresh does not change the day while another tab is open');
assert.strictEqual(store.currentTab.value, 'workouts', 'other tabs keep their id');
console.log('✓ Session save moves วันนี้ (refresh applies on the วันนี้ tab only).');

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
console.log('🎉 ALL NAV TESTS PASSED (steps 1–2)!');
console.log('====================================================');
