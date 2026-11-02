# Design Spec: Global Workout Platform (Custom Routines, Sets & PocketBase Auth)

- **Date:** 2026-11-02
- **Branch:** `feature/global-workout-platform`
- **Status:** Approved (Ready for Implementation Planning)
- **Target Stack:** Vue 3, Vite, Tailwind CSS, PocketBase (SQLite + Auth + REST API), Lucide Icons

---

## 1. Executive Summary

This specification outlines the evolution of the personal 4-day workout tracker into a full-fledged, multi-user **Global Workout Platform** (modeled after industry standards like Hevy and Strong). 

Key capabilities:
1. **User Authentication & Isolation:** Secure sign-up/sign-in with per-user data isolation via PocketBase.
2. **Exercise Library & Custom Exercises:** A built-in library of 40+ categorized exercises plus the ability for users to create and manage their own custom exercises.
3. **Flexible Workout Routines & Set Configuration:** Users can build and customize routines, assigning specific set types (**Warm-up [W]**, **Working [R]**, **Drop set [D]**, **Failure [F]**), target reps, and target weights.
4. **Active Workout Mode & Smart Overload:** Live session runner with auto-docked rest timer, crash recovery, and automated progressive overload recommendations.
5. **Mobile-First App Shell:** Thumb-friendly bottom tab navigation, in-app numeric keypad, and safe-area support.

---

## 2. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Vue 3 Frontend (PWA)                  │
├────────────────────────────────────────────────────────┤
│  [Views & Modals]                                      │
│  - WorkoutTab (Routines List + Quick Start)            │
│  - ActiveSessionSheet (Live tracking + PinKeypad)      │
│  - ExerciseLibraryModal (Search, Filter, Custom add)   │
│  - RoutineBuilderModal (Drag & drop, Set config)       │
│  - HistoryTab (Logs, Volume charts, PR badges)         │
│  - ProfileTab (Auth state, Unit toggle, Settings)      │
├────────────────────────────────────────────────────────┤
│  [Composables & State Layer]                           │
│  - useAuthStore: Auth state, token, profile            │
│  - useRoutineStore: Library, custom exercises, routines │
│  - useActiveSessionStore: Timer, set log, crash-cache  │
│  - useTimer: Rest interval countdown & audio beep      │
│  - useWeightAdvisor: Progressive overload calculator   │
├────────────────────────────────────────────────────────┤
│  [Data Client & Offline Layer]                         │
│  - PocketBase JS SDK (`pocketbase`)                    │
│  - LocalStorage / IndexedDB fallback cache             │
└────────────────────────────────────────────────────────┘
                           │ (REST / Realtime)
                           ▼
┌────────────────────────────────────────────────────────┐
│             PocketBase Backend (Server / Docker)       │
├────────────────────────────────────────────────────────┤
│  - SQLite Engine & WAL mode                            │
│  - Built-in JWT Authentication & Account Management    │
│  - Collections: users, exercises, routines, sessions   │
│  - Admin Web GUI (Port 8090)                           │
└────────────────────────────────────────────────────────┘
```

---

## 3. Data Schema & PocketBase Collections

### 3.1 `users` (System Auth Collection)
- `id` (Text, Primary Key)
- `email` (Email, Unique)
- `name` (Text)
- `unit_preference` (Select: `'kg'` | `'lbs'`, default: `'kg'`)
- `default_rest_sec` (Number, default: `90`)

### 3.2 `exercises`
- `id` (Text, Primary Key)
- `name` (Text, e.g. "Barbell Bench Press", "Leg Press")
- `muscle_group` (Select: `'chest'`, `'back'`, `'quads'`, `'hamstrings'`, `'delts'`, `'arms'`, `'abs'`, `'cardio'`)
- `equipment` (Select: `'barbell'`, `'dumbbell'`, `'cable'`, `'machine'`, `'smith'`, `'bodyweight'`)
- `user_id` (Relation -> `users`, Optional: `null` indicates standard global system exercise, while a `user_id` indicates a user-created custom exercise)
- `notes` (Text, form cues & instructions)
- `image_url` (Text, optional thumbnail / gif)

### 3.3 `routines`
- `id` (Text, Primary Key)
- `user_id` (Relation -> `users`, Required)
- `title` (Text, e.g., "Push Day", "4-Day Hypertrophy Routine")
- `description` (Text)
- `order_index` (Number)
- `is_template` (Bool, default: `true`)

### 3.4 `routine_exercises`
- `id` (Text, Primary Key)
- `routine_id` (Relation -> `routines`, Cascade Delete)
- `exercise_id` (Relation -> `exercises`)
- `order_index` (Number)
- `default_sets` (JSON array: `[{ set_number: 1, type: "warmup", target_reps: 15, target_weight: null }, { set_number: 2, type: "working", target_reps: "6-8", target_weight: null }]`)
- `rest_seconds` (Number, default: `90`)

### 3.5 `workout_sessions`
- `id` (Text, Primary Key)
- `user_id` (Relation -> `users`, Required)
- `routine_id` (Relation -> `routines`, Optional)
- `title` (Text, e.g. "Monday: Legs & Glutes")
- `started_at` (DateTime)
- `completed_at` (DateTime)
- `duration_seconds` (Number)
- `total_volume_kg` (Number, sum of `weight * reps` across completed working sets)
- `notes` (Text)

### 3.6 `session_sets`
- `id` (Text, Primary Key)
- `session_id` (Relation -> `workout_sessions`, Cascade Delete)
- `exercise_id` (Relation -> `exercises`)
- `set_number` (Number)
- `set_type` (Select: `'warmup'` | `'working'` | `'dropset'` | `'failure'`)
- `weight_kg` (Number)
- `reps_performed` (Number)
- `rpe` (Number, 1-10)
- `is_completed` (Bool, default: `false`)
- `is_pr` (Bool, default: `false`)

---

## 4. Core Domain Logic & State Management

### 4.1 Authentication (`useAuthStore`)
- Manages `pocketbase.authStore` token persistence in `localStorage`.
- Methods: `login(email, password)`, `register(email, password, name)`, `logout()`, `continueAsGuest()`.
- Guest Mode: If not logged in, user can still exercise and create routines stored locally; once they register, local records can be synced to their new account.

### 4.2 Routine & Custom Exercise Management (`useRoutineStore`)
- Loads both system exercises (`user_id = null`) and the user's custom exercises.
- Provides `createCustomExercise(payload)`, `createRoutine(payload)`, `updateRoutine(id, payload)`, and `deleteRoutine(id)`.
- Starter Seeding: Automatically clones the default 4-day workout plan into the user's routines collection on first login.

### 4.3 Active Session Runner (`useActiveSessionStore`)
- **Start Workout**: Instantiates a live session state from a selected routine template or opens a blank "Quick Start" session.
- **Set Completion & Rest Timer Auto-Trigger**:
  - Marking a set as completed immediately calls `startTimer()` on `useTimer` with the exercise's target rest duration.
  - Recalculates total volume in real-time.
- **Progressive Overload Integration**:
  - Automatically queries the last completed working set weight for that exercise from `session_sets`.
  - Suggests target weight adjustment via `useWeightAdvisor`:
    - Working Set: If last reps > 8 -> recommend +2kg; if < 6 -> recommend -2kg; 6-8 -> maintain.
    - Warm-up Set: Uses 15 reps baseline.
- **Crash Recovery**:
  - Syncs the active session state to `localStorage.getItem('active_session_draft')` every time a field changes.
  - If the app is refreshed or browser restarts, prompts "Resume ongoing workout?".

---

## 5. UI/UX Specifications

### 5.1 Mobile Bottom Navigation (4 Primary Tabs)
1. **Workouts Tab (`workout`)**:
   - Displays Routine Cards (e.g., Day 1 Legs, Day 2 Chest, custom splits).
   - "Start Workout" button on each card.
   - "+ New Routine" and "⚡ Quick Start (Empty Session)" buttons.
2. **Exercises Tab (`exercises`)**:
   - Filter chips by muscle group: [All, Chest, Back, Legs, Shoulders, Arms, Core].
   - Search bar with instant filtering.
   - "+ Custom Exercise" modal sheet.
3. **History Tab (`history`)**:
   - Chronological list of completed sessions with date, duration, total volume, and exercises performed.
   - Export to Excel / CSV / JSON button.
4. **Profile Tab (`profile`)**:
   - Logged-in user information or "Login / Register" card.
   - Unit toggle: kg / lbs.
   - Rest timer default interval settings.

### 5.2 Active Workout Sheet
- Overlays the main viewport when a workout is in progress.
- Clean exercise list with table columns: `SET` | `PREV` | `KG` | `REPS` | `✓`.
- Tapping on `KG` or `REPS` opens the custom `PinKeypad` bottom sheet with quick overload chips.
- Docked RestTimer running above the bottom bar.
- Finish Workout button triggers the Summary Celebration Modal.

---

## 6. Implementation Phasing

- **Phase 1: PocketBase Setup & Data Collections**
  - Setup PocketBase script / binary / schema in `server/pocketbase` or Docker.
  - Define collections and seed initial 40+ exercises and default 4-day routine.
  - Install and initialize `pocketbase` JS SDK in client.

- **Phase 2: Auth & User Store**
  - Implement `useAuthStore` (login, signup, guest mode).
  - Create Profile/Auth modal in UI.

- **Phase 3: Routine Builder & Custom Exercise Engine**
  - Implement `useRoutineStore`.
  - Build Exercise Library view and Custom Exercise modal.
  - Build Routine Editor view (add/remove sets, set types W/R/D/F, target reps).

- **Phase 4: Active Workout Runner & Rest Timer Integration**
  - Build `useActiveSessionStore` with live crash recovery.
  - Integrate with existing `PinKeypad`, `RestTimer`, and `useWeightAdvisor`.
  - Build Workout Summary modal and session log persistence.

- **Phase 5: Verification & Polish**
  - Run end-to-end user journeys (Register -> Create Routine -> Run Session -> Save History).
  - Unit tests for data adapters and advisor logic.
