import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { useRoutineStore } from '../src/composables/useRoutineStore.js';
import { useActiveSessionStore } from '../src/composables/useActiveSessionStore.js';
import { useExerciseStore } from '../src/composables/useExerciseStore.js';
import { useWorkoutStore } from '../src/composables/useWorkoutStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing 4-Tab Global Shell & System Integration Contract...');

// 1. Component File Existence Checks
const workoutsViewPath = path.resolve(__dirname, '../src/components/WorkoutsView.vue');
const profileViewPath = path.resolve(__dirname, '../src/components/ProfileView.vue');
const dayTabsPath = path.resolve(__dirname, '../src/components/DayTabs.vue');
const appPath = path.resolve(__dirname, '../src/App.vue');

assert(fs.existsSync(workoutsViewPath), 'WorkoutsView.vue must exist');
assert(fs.existsSync(profileViewPath), 'ProfileView.vue must exist');
assert(fs.existsSync(dayTabsPath), 'DayTabs.vue must exist');
assert(fs.existsSync(appPath), 'App.vue must exist');

const workoutsViewContent = fs.readFileSync(workoutsViewPath, 'utf8');
const profileViewContent = fs.readFileSync(profileViewPath, 'utf8');
const dayTabsContent = fs.readFileSync(dayTabsPath, 'utf8');
const appContent = fs.readFileSync(appPath, 'utf8');

// 2. WorkoutsView.vue Contract Checks
assert(workoutsViewContent.includes('useRoutineStore'), 'WorkoutsView consumes useRoutineStore');
assert(workoutsViewContent.includes('useActiveSessionStore'), 'WorkoutsView consumes useActiveSessionStore');
assert(workoutsViewContent.includes('Quick Start'), 'WorkoutsView includes Quick Start action');
assert(workoutsViewContent.includes('startEmptySession'), 'WorkoutsView calls startEmptySession');
assert(workoutsViewContent.includes('startSessionFromRoutine') || workoutsViewContent.includes('handleStartRoutine'), 'WorkoutsView starts routine sessions');
assert(workoutsViewContent.includes('สร้าง Routine'), 'WorkoutsView has create routine button');
assert(workoutsViewContent.includes('กำลังฝึกซ้อมอยู่'), 'WorkoutsView includes active session recovery banner');
assert(workoutsViewContent.includes('เริ่มฝึก (Start)'), 'WorkoutsView routine card has Start button');
assert(workoutsViewContent.includes('แก้ไข (Edit)'), 'WorkoutsView routine card has Edit button');
assert(workoutsViewContent.includes('deleteRoutine') || workoutsViewContent.includes('handleDeleteRoutine'), 'WorkoutsView routine card has Delete action');
assert(workoutsViewContent.includes('scheduleChips'), 'WorkoutsView includes Atiwitch 4-Day protocol quick chips');
assert(workoutsViewContent.includes('จันทร์') && workoutsViewContent.includes('อังคาร') && workoutsViewContent.includes('พุธ') && workoutsViewContent.includes('พฤหัส'), 'WorkoutsView chips include 4 workout days');

// 3. ProfileView.vue Contract Checks
assert(profileViewContent.includes('Atiwitch') || profileViewContent.includes('AJ'), 'ProfileView displays user account info');
assert(profileViewContent.includes('Local Mode') || profileViewContent.includes('PocketBase'), 'ProfileView displays Local Mode / PocketBase status');
assert(profileViewContent.includes('atiwitch_weight_unit') || profileViewContent.includes('weightUnit'), 'ProfileView supports weight unit preference (kg / lbs)');
assert(profileViewContent.includes('defaultRestSec') || profileViewContent.includes('atiwitch_default_rest_time'), 'ProfileView supports default rest time preference');
assert(profileViewContent.includes('totalWorkoutsCount'), 'ProfileView shows total workouts completed');
assert(profileViewContent.includes('totalVolumeLifted'), 'ProfileView shows total volume lifted');
assert(profileViewContent.includes('routines.length'), 'ProfileView shows routines count');
assert(profileViewContent.includes('customExercisesCount'), 'ProfileView shows custom exercises count');
assert(profileViewContent.includes('exportJsonBackup'), 'ProfileView provides JSON backup export');
assert(profileViewContent.includes('exportExcelHistory') || profileViewContent.includes('exportWorkoutHistory'), 'ProfileView provides Excel export');
assert(profileViewContent.includes('handleResetData') || profileViewContent.includes('resetToDefaults'), 'ProfileView provides Reset data button');

// 4. DayTabs.vue Contract Checks (4 Global Tabs)
assert(dayTabsContent.includes('workouts'), 'DayTabs includes workouts tab');
assert(dayTabsContent.includes('exercises'), 'DayTabs includes exercises tab');
assert(dayTabsContent.includes('history'), 'DayTabs includes history tab');
assert(dayTabsContent.includes('profile'), 'DayTabs includes profile tab');
assert(dayTabsContent.includes('โปรแกรม'), 'DayTabs workouts tab is labeled โปรแกรม');
assert(dayTabsContent.includes('ท่าฝึก'), 'DayTabs exercises tab is labeled ท่าฝึก');
assert(dayTabsContent.includes('ประวัติ'), 'DayTabs history tab is labeled ประวัติ');
assert(dayTabsContent.includes('บัญชี'), 'DayTabs profile tab is labeled บัญชี');
assert(dayTabsContent.includes('safe-area-inset-bottom'), 'DayTabs is safe-area inset aware');

// 5. App.vue Integration & Backward Compatibility Checks
assert(appContent.includes('WorkoutsView'), 'App.vue integrates WorkoutsView');
assert(appContent.includes('ProfileView'), 'App.vue integrates ProfileView');
assert(appContent.includes('DayTabs'), 'App.vue integrates DayTabs');
assert(appContent.includes('ExerciseLibraryModal'), 'App.vue integrates ExerciseLibraryModal');
assert(appContent.includes('RoutineBuilderModal'), 'App.vue integrates RoutineBuilderModal');
assert(appContent.includes('ActiveWorkoutSheet'), 'App.vue integrates ActiveWorkoutSheet');
assert(appContent.includes('WorkoutSummaryModal'), 'App.vue integrates WorkoutSummaryModal');
assert(appContent.includes("currentTab === 'workouts'"), 'App.vue switches to workouts view');
assert(appContent.includes("currentTab === 'exercises'"), 'App.vue switches to exercises view');
assert(appContent.includes("currentTab === 'history'"), 'App.vue switches to history view');
assert(appContent.includes("currentTab === 'profile'"), 'App.vue switches to profile view');

// Verify existing runner contract assertions are also preserved in App.vue
assert(appContent.includes('muscleGroup: ex.mainMuscle'), 'App.vue preserves mainMuscle mapping');
assert(appContent.includes('name: ex.name'), 'App.vue preserves exercise name mapping');
assert(appContent.includes("s.type === 'warm' ? 'warmup' :"), 'App.vue normalizes warm sets');

// 6. Store Integration Verification
const workoutStore = useWorkoutStore();
assert(typeof workoutStore.switchTab === 'function', 'useWorkoutStore exposes switchTab function');
assert(workoutStore.currentTab && typeof workoutStore.currentTab.value === 'string', 'useWorkoutStore exposes currentTab ref');

workoutStore.switchTab('exercises');
assert.strictEqual(workoutStore.currentTab.value, 'exercises', 'switchTab changes active global tab');
workoutStore.switchTab('workouts');
assert.strictEqual(workoutStore.currentTab.value, 'workouts', 'switchTab switches back to workouts');

console.log('✓ All 4-Tab Global Shell & System Integration contract tests passed successfully!');
