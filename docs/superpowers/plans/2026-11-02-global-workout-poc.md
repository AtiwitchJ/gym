# Global Workout Platform POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully functional local Proof of Concept (POC) for the Global Workout Platform on this machine, featuring a 40+ Exercise Library, Custom Exercise Creator, Flexible Routine Builder with multi-set types (Warmup, Working, Dropset, Failure), Live Active Workout Runner with docked Rest Timer & PinKeypad integration, and 4-Tab Mobile Navigation.

**Architecture:** Client-side reactive domain stores (`useExerciseStore`, `useRoutineStore`, `useActiveSessionStore`, `useAuthStore`) backed by a local-first persistence adapter (localStorage + pre-seeded data), connecting directly to Vue 3 components and existing stopwatch/advisor utilities.

**Tech Stack:** Vue 3 (Composition API), Vite, Tailwind CSS, Space Grotesk/Noto Sans Thai typography, Lucide SVG icons, Node.js test runner.

## Global Constraints

- Preserve existing test suite compatibility (`npm test` must continue passing).
- Safe area mobile-first ergonomics (`pt-[env(safe-area-inset-top)]`, `pb-[env(safe-area-inset-bottom)]`).
- Tactile Neo-Brutalist design tokens (`border-2 border-plate`, `shadow-[2px_2px_0px_#1e2220]`, `bg-paper`, `text-ink`, `bg-flame`).
- In-App Numeric Keypad (`usePinKeypad`) must be used for weight and reps input on mobile.

---

### Task 1: Exercise Catalog & Custom Exercise Store

**Files:**
- Create: `src/data/defaultExercises.js`
- Create: `src/composables/useExerciseStore.js`
- Create: `test/test-exercise-store.js`

**Interfaces:**
- Produces: `useExerciseStore()` returning `{ exercises, filteredExercises, selectedMuscle, searchQuery, createCustomExercise, getExerciseById }`
- Exercise schema: `{ id: string, name: string, muscleGroup: string, equipment: string, isCustom: boolean, notes: string }`

- [ ] **Step 1: Write the failing test**

Create `test/test-exercise-store.js`:
```javascript
import assert from 'node:assert';
import { useExerciseStore } from '../src/composables/useExerciseStore.js';

console.log('Testing Exercise Store...');
const store = useExerciseStore();

// Test 1: Pre-loaded exercises count > 30
assert(store.exercises.value.length >= 30, 'Should load pre-seeded exercise library');

// Test 2: Filter by muscle
store.selectedMuscle.value = 'chest';
assert(store.filteredExercises.value.every(e => e.muscleGroup === 'chest'), 'Should filter exercises by chest');

// Test 3: Create custom exercise
const custom = store.createCustomExercise({
  name: 'Cable Fly High-to-Low',
  muscleGroup: 'chest',
  equipment: 'cable',
  notes: 'Squeeze at bottom'
});
assert(custom.id && custom.isCustom === true, 'Custom exercise should have id and isCustom flag');
assert(store.getExerciseById(custom.id).name === 'Cable Fly High-to-Low', 'Should retrieve created custom exercise');

console.log('✓ All Exercise Store tests passed successfully!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/test-exercise-store.js`
Expected: FAIL with Cannot find module

- [ ] **Step 3: Implement `src/data/defaultExercises.js` and `src/composables/useExerciseStore.js`**

Create `src/data/defaultExercises.js` with 40+ categorized gym exercises (Chest, Back, Quads, Hamstrings, Delts, Arms, Abs, Cardio) and equipment types.
Create `src/composables/useExerciseStore.js` with reactive state, local-storage persistence for custom exercises, search, and filtering.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/test-exercise-store.js`
Expected: PASS with "✓ All Exercise Store tests passed successfully!"

- [ ] **Step 5: Commit**

```bash
git add src/data/defaultExercises.js src/composables/useExerciseStore.js test/test-exercise-store.js
git commit -m "feat(exercises): add 40+ standard exercise catalog and useExerciseStore"
```

---

### Task 2: Routine Builder & Template Store

**Files:**
- Create: `src/data/defaultRoutines.js`
- Create: `src/composables/useRoutineStore.js`
- Create: `test/test-routine-store.js`

**Interfaces:**
- Consumes: `useExerciseStore`
- Produces: `useRoutineStore()` returning `{ routines, activeRoutine, createRoutine, updateRoutine, deleteRoutine, cloneDefaultRoutines }`
- Routine schema: `{ id: string, title: string, subtitle: string, exercises: Array<{ exerciseId: string, sets: Array<{ type: 'warmup'|'working'|'dropset'|'failure', targetReps: number|string, targetWeight?: number }> }> }`

- [ ] **Step 1: Write the failing test**

Create `test/test-routine-store.js`:
```javascript
import assert from 'node:assert';
import { useRoutineStore } from '../src/composables/useRoutineStore.js';

console.log('Testing Routine Store...');
const store = useRoutineStore();

// Test 1: Has default routines (Atiwitch 4-Day protocol)
assert(store.routines.value.length >= 4, 'Should load 4 default daily routines');

// Test 2: Create a custom routine
const newRoutine = store.createRoutine({
  title: 'Upper Hypertrophy A',
  subtitle: 'Chest & Back Focus',
  exercises: [
    {
      exerciseId: 'barbell_bench_press',
      sets: [
        { type: 'warmup', targetReps: 15, targetWeight: 40 },
        { type: 'working', targetReps: 8, targetWeight: 70 },
        { type: 'working', targetReps: 8, targetWeight: 70 },
        { type: 'working', targetReps: 8, targetWeight: 70 }
      ]
    }
  ]
});
assert(newRoutine.id && newRoutine.title === 'Upper Hypertrophy A', 'Routine created');
assert(newRoutine.exercises[0].sets.length === 4, 'Should have 4 configured sets');
assert(newRoutine.exercises[0].sets[0].type === 'warmup', 'First set should be warmup');

console.log('✓ All Routine Store tests passed successfully!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/test-routine-store.js`
Expected: FAIL with Cannot find module

- [ ] **Step 3: Implement `src/data/defaultRoutines.js` and `src/composables/useRoutineStore.js`**

Pre-load the existing 4-day workouts (Legs, Chest, Back, Shoulders) into routine templates with sets mapped to `{ type: 'warmup' | 'working', targetReps, targetWeight }`.
Implement reactive routines store with CRUD methods and localStorage sync.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/test-routine-store.js`
Expected: PASS with "✓ All Routine Store tests passed successfully!"

- [ ] **Step 5: Commit**

```bash
git add src/data/defaultRoutines.js src/composables/useRoutineStore.js test/test-routine-store.js
git commit -m "feat(routines): add routine template store with multi-set configurator"
```

---

### Task 3: Active Workout Runner & Live Session Engine

**Files:**
- Create: `src/composables/useActiveSessionStore.js`
- Create: `test/test-active-session.js`

**Interfaces:**
- Consumes: `useTimer`, `useWeightAdvisor`, `useRoutineStore`
- Produces: `useActiveSessionStore()` returning `{ isWorkoutActive, activeSession, startSessionFromRoutine, startEmptySession, toggleSetComplete, updateSetMetric, finishSession, discardSession, sessionDurationSec }`

- [ ] **Step 1: Write the failing test**

Create `test/test-active-session.js`:
```javascript
import assert from 'node:assert';
import { useActiveSessionStore } from '../src/composables/useActiveSessionStore.js';

console.log('Testing Active Session Store...');
const store = useActiveSessionStore();

// Start session
const routine = {
  id: 'test_routine',
  title: 'Test Workout',
  exercises: [
    {
      exerciseId: 'bench_press',
      sets: [
        { type: 'warmup', targetReps: 15, targetWeight: 40 },
        { type: 'working', targetReps: 8, targetWeight: 70 }
      ]
    }
  ]
};

store.startSessionFromRoutine(routine);
assert(store.isWorkoutActive.value === true, 'Workout should be active');
assert(store.activeSession.value.exercises.length === 1, 'Should have 1 exercise');

// Mark set 0 complete
store.updateSetMetric(0, 0, 'weight', 40);
store.updateSetMetric(0, 0, 'reps', 15);
store.toggleSetComplete(0, 0);
assert(store.activeSession.value.exercises[0].sets[0].completed === true, 'Set 0 should be completed');

// Finish session
const summary = store.finishSession();
assert(summary && summary.totalVolumeKg >= 0, 'Should return summary with volume');
assert(store.isWorkoutActive.value === false, 'Session should be closed');

console.log('✓ All Active Session Store tests passed successfully!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/test-active-session.js`
Expected: FAIL with Cannot find module

- [ ] **Step 3: Implement `src/composables/useActiveSessionStore.js`**

Implement active workout tracking, elapsed timer, live volume calculation, crash recovery (`active_session_draft` in localStorage), and auto rest-timer trigger.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/test-active-session.js`
Expected: PASS with "✓ All Active Session Store tests passed successfully!"

- [ ] **Step 5: Commit**

```bash
git add src/composables/useActiveSessionStore.js test/test-active-session.js
git commit -m "feat(session): add useActiveSessionStore for live workout tracking"
```

---

### Task 4: Exercise Library & Routine Builder Modals

**Files:**
- Create: `src/components/ExerciseLibraryModal.vue`
- Create: `src/components/RoutineBuilderModal.vue`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `useExerciseStore`, `useRoutineStore`
- Produces: Modals to browse/search exercises, add custom exercises, and create/edit workout routines.

- [ ] **Step 1: Build `src/components/ExerciseLibraryModal.vue`**

Include:
- Search input with clear button
- Muscle group filter chips: [ทั้งหมด, อก, หลัง, ขา, ไหล่, แขน, ท้อง, คาร์ดิโอ]
- Exercise cards with muscle tag, equipment tag, and "เลือก (Select)" / info icon
- "+ เพิ่มท่าของฉัน (Custom Exercise)" trigger with inline form (name, muscle, equipment, notes)

- [ ] **Step 2: Build `src/components/RoutineBuilderModal.vue`**

Include:
- Routine title & subtitle inputs
- List of added exercises
- Add Exercise button (opens `ExerciseLibraryModal`)
- Per-exercise set list: rows with Set Number, Type pill (`W` Warmup, `R` Working, `D` Dropset, `F` Failure), Target Reps, and Delete Set button
- "+ เพิ่มเซ็ต" button per exercise
- Save Routine button

- [ ] **Step 3: Verify build compilation**

Run: `npm run build`
Expected: Build passes without template or syntax errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ExerciseLibraryModal.vue src/components/RoutineBuilderModal.vue
git commit -m "feat(ui): add ExerciseLibraryModal and RoutineBuilderModal components"
```

---

### Task 5: Active Workout Runner View & Summary Modal

**Files:**
- Create: `src/components/ActiveWorkoutSheet.vue`
- Create: `src/components/WorkoutSummaryModal.vue`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `useActiveSessionStore`, `usePinKeypad`, `useTimer`
- Produces: Full-screen active workout tracking view and celebration summary dialog.

- [ ] **Step 1: Build `src/components/ActiveWorkoutSheet.vue`**

Include:
- Sticky header: Session Title, Elapsed Stopwatch timer, "+ เพิ่มท่าระหว่างเล่น", "ยกเลิก (Discard)" and "เสร็จสิ้น (Finish)" buttons.
- Exercise cards displaying each configured set.
- Interactive numeric tap targets for KG and REPS that open `PinKeypad`.
- Tactile checkmark button for each set that highlights green and auto-starts `RestTimer`.
- Progressive Overload advice chip on working sets based on previous session.

- [ ] **Step 2: Build `src/components/WorkoutSummaryModal.vue`**

Include:
- Trophy / Celebration header
- Total Volume lifted (kg)
- Elapsed duration (MM:SS)
- Total completed sets
- Button "บันทึกและกลับสู่หน้าหลัก (Save & Close)"

- [ ] **Step 3: Verify build compilation**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/ActiveWorkoutSheet.vue src/components/WorkoutSummaryModal.vue
git commit -m "feat(ui): add ActiveWorkoutSheet and WorkoutSummaryModal components"
```

---

### Task 6: 4-Tab Global Shell & System Integration

**Files:**
- Create: `src/components/WorkoutsView.vue`
- Create: `src/components/ProfileView.vue`
- Modify: `src/components/DayTabs.vue`
- Modify: `src/App.vue`
- Modify: `package.json` (add new test files to test script)

**Interfaces:**
- Replaces legacy hardcoded day selector with the 4 Global Tabs:
  1. `workouts` (Routines list + Quick Start + Live session launcher)
  2. `exercises` (Exercise Library & Custom exercise viewer)
  3. `history` (Session log & Volume history)
  4. `profile` (User settings, kg/lbs unit toggle, PocketBase/Guest status)
- Backward compatibility: The default routines match Atiwitch's 4-Day protocol exactly.

- [ ] **Step 1: Build `src/components/WorkoutsView.vue` and `src/components/ProfileView.vue`**
- [ ] **Step 2: Update `src/components/DayTabs.vue` to show the 4 Global Tabs with smooth thumb navigation**
- [ ] **Step 3: Update `package.json` test script to include all new unit test suites**
- [ ] **Step 4: Run full verification suite (`npm test` and `npm run build`)**
- [ ] **Step 5: Commit**

```bash
git add src/components/WorkoutsView.vue src/components/ProfileView.vue src/components/DayTabs.vue src/App.vue package.json
git commit -m "feat(global): integrate 4-tab app shell with routine runner and exercise library"
```
