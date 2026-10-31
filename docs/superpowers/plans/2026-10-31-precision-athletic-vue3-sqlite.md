# Precision Athletic Gym Tracker (Vue 3 + SQLite + Tailwind) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-file gym tracker into a high-performance Vue 3 + Tailwind CSS PWA with a centralized SQLite backend in Docker, a human-crafted Precision Athletic UI (no AI tropes), and dual Excel/SQLite exports.

**Architecture:** A lightweight Node.js + `better-sqlite3` (or `sqlite3`) backend handles persistence and serves the compiled Vue 3 static frontend on port 8080. The frontend uses Vue 3 Composition API, Tailwind CSS, Lucide icons, and SheetJS, with optimistic auto-save to `localStorage` and the SQLite database.

**Tech Stack:** Vue 3, Vite, Tailwind CSS, Lucide Vue Next, SheetJS (`xlsx`), Node.js (v22), SQLite (`better-sqlite3` / `sqlite3`), Docker & Docker Compose.

## Global Constraints
- High-contrast Precision Athletic palette: Titanium Slate `#0E1015`, Surface `#161922`, Crimson `#E11D48`, Emerald `#059669`.
- Tabular numerals (`tabular-nums`, `font-mono`) on all weights, reps, and timer digits.
- No generic AI badges or emoji clutter — use SVG icons and clean typographic tokens (`[MAIN]`, `[SUB]`, `[TOUCH-UP]`).
- Persistent SQLite database mounted to `./data/gym.db`.
- Dual exports: Formatted Excel `.xlsx` and raw `.db` database download.
- Zero data loss: Optimistic UI with instant auto-save to local storage and SQLite.

---

### Task 1: Backend SQLite Database & REST API

**Files:**
- Create: `server/package.json`
- Create: `server/db.js`
- Create: `server/server.js`
- Create: `server/test-api.js`

**Interfaces:**
- Produces:
  - Database schema initialized in `data/gym.db`.
  - `GET /api/state` -> `{ draftState, lastWeights, todos }`
  - `POST /api/state` -> `{ success: true }`
  - `POST /api/reset-day` -> `{ success: true }`
  - `GET /api/history` -> `[ { id, date, time, dayKey, dayTitle, totalSetsDone, exercises } ]`
  - `POST /api/history` -> `{ success: true, sessionId }`
  - `DELETE /api/history/:id` -> `{ success: true }`
  - `GET /api/todos` & `POST /api/todos` -> `{ todos: [...] }`
  - `GET /api/export/db` -> Raw binary download of `gym.db`

- [ ] **Step 1: Setup server package.json and dependencies**
  Initialize `server/package.json` with dependencies `express`, `better-sqlite3`, `cors`, and native scripts.

- [ ] **Step 2: Implement SQLite initialization in server/db.js**
  Write schema migrations for `workout_sessions`, `session_exercises`, `session_sets`, `exercise_last_weights`, `daily_draft_state`, and `todos`.

- [ ] **Step 3: Implement REST API server in server/server.js**
  Implement Express endpoints for state, history, todos, and raw `.db` file download, plus static serving of `../dist`.

- [ ] **Step 4: Create and run automated test suite in server/test-api.js**
  Execute CRUD operations against the database and API to verify persistence and responses.

- [ ] **Step 5: Commit backend changes**
  Run `git add server && git commit -m "feat(server): setup SQLite database and Express REST API"`

---

### Task 2: Vue 3 + Vite + Tailwind CSS Project Scaffolding

**Files:**
- Create: `package.json` (root)
- Create: `vite.config.js`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html` (Vite HTML entry)
- Create: `src/main.js`
- Create: `src/style.css`
- Create: `src/App.vue`

**Interfaces:**
- Produces:
  - Working Vite dev and build pipeline (`npm run build` -> outputs to `dist/`).
  - Tailwind configured with Precision Athletic theme colors and tabular fonts.
  - Basic Vue 3 root component rendering.

- [ ] **Step 1: Create root package.json and install dependencies**
  Configure Vue 3, Vite, `@vitejs/plugin-vue`, `tailwindcss`, `autoprefixer`, `postcss`, `lucide-vue-next`, `xlsx`.

- [ ] **Step 2: Configure Vite, Tailwind, and PostCSS**
  Set up custom color tokens (`titanium-950: #0E1015`, `surface: #161922`, `signal-crimson: #E11D48`, `emerald-steel: #059669`).

- [ ] **Step 3: Setup index.html and src/style.css**
  Link Google Fonts (Kanit, Outfit, JetBrains Mono) and configure Tailwind base, components, utilities, and `.tabular-nums` rule.

- [ ] **Step 4: Create src/main.js and verify build**
  Run `npm run build` to confirm Vite compiles clean assets to `dist/`.

- [ ] **Step 5: Commit scaffolding**
  Run `git add . && git commit -m "chore: scaffold Vue 3 + Vite + Tailwind CSS project"`

---

### Task 3: Routine Data & Reactive State Management (Composables)

**Files:**
- Create: `src/data/workouts.js`
- Create: `src/data/defaultTodos.js`
- Create: `src/composables/useWorkoutStore.js`
- Create: `src/composables/useTimer.js`
- Create: `src/composables/useExcelExport.js`

**Interfaces:**
- Produces:
  - `workoutData`: Complete Jetts Fitness 4-day workout plan + bonus touch-ups.
  - `useWorkoutStore()`: Reactive state for current day, inputs, auto-save status (`saving`, `saved`, `idle`), API sync with localStorage fallback.
  - `useTimer()`: Timestamp-safe stopwatch with presets, audio beep, and haptic feedback.
  - `useExcelExport()`: Function to export workout history to styled `.xlsx` file.

- [ ] **Step 1: Extract and clean workout routines into src/data/workouts.js**
  Port all exercise metadata, sets, reps, video URLs, and cues with clean labels (`isMain`, `part`).

- [ ] **Step 2: Implement useTimer composable with timestamp tracking**
  Use `Date.now()` and `visibilitychange` event handler so timer never drifts when screen sleeps.

- [ ] **Step 3: Implement useWorkoutStore with optimistic auto-save**
  Sync state to `localStorage` immediately and debounce sync to `/api/state`.

- [ ] **Step 4: Implement useExcelExport using SheetJS**
  Generate customized `.xlsx` workbook with columns: Date, Time, Day, Exercise, Category, Set, Reps, Weight (kg), Done.

- [ ] **Step 5: Test composables and commit**
  Verify state and export logic, then commit: `git commit -m "feat(store): add workout data, timer composable, and store"`

---

### Task 4: Precision Athletic UI Components (Non-AI Aesthetic)

**Files:**
- Create: `src/components/HeaderBar.vue`
- Create: `src/components/DayTabs.vue`
- Create: `src/components/ExerciseCard.vue`
- Create: `src/components/BonusCard.vue`
- Create: `src/components/RestTimer.vue`
- Create: `src/components/HistoryView.vue`
- Create: `src/components/TodoView.vue`
- Create: `src/components/RestDayView.vue`
- Modify: `src/App.vue`

**Interfaces:**
- Produces:
  - Polished, thumb-friendly athletic interface.
  - No emoji clutter; clean SVG icons and tabular numbers.
  - Quick-weight chips (`[Use Prev]`, `[+2.5]`) and large touch targets.
  - Dual export buttons in History view (Excel `.xlsx` and SQLite `.db`).

- [ ] **Step 1: Build HeaderBar.vue and DayTabs.vue**
  Header with Jetts brand badge, auto-save pill (`✓ SAVED` / `SYNCING...`), reset day button, and athletic day tabs.

- [ ] **Step 2: Build ExerciseCard.vue and BonusCard.vue**
  Tactile set rows, `[MAIN]` / `[SUB]` / `[TOUCH-UP]` badges, previous record stats, decimal inputs, and tactile checkmarks.

- [ ] **Step 3: Build RestTimer.vue**
  Bottom-docked athletic stopwatch with tabular numbers and 60s/90s/120s presets.

- [ ] **Step 4: Build HistoryView.vue and TodoView.vue**
  Session list with detailed exercise badges, Excel `.xlsx` export button, and SQLite `.db` download button.

- [ ] **Step 5: Assemble App.vue and test UI in browser**
  Verify all views, interactions, and responsive mobile layouts.

- [ ] **Step 6: Commit UI components**
  Run `git commit -m "feat(ui): implement Precision Athletic components and views"`

---

### Task 5: Multi-Stage Dockerfile & Tailscale Deployment

**Files:**
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `serve.sh`
- Modify: `.gitignore`

**Interfaces:**
- Produces:
  - Multi-stage Docker build: Node.js compiles frontend -> Node.js production container runs server on port 8080 with mounted `./data`.
  - Easy launch via `./serve.sh tailscale` or `docker compose up -d --build`.

- [ ] **Step 1: Write multi-stage Dockerfile**
  Stage 1: Build Vue app with Vite. Stage 2: Install production server dependencies and serve static `dist/` + SQLite API.

- [ ] **Step 2: Update docker-compose.yml and serve.sh**
  Ensure volume `./data:/app/data` is mounted and port 8080 is exposed.

- [ ] **Step 3: Test Docker build and run locally**
  Run `docker compose up -d --build` (or container test) to verify health check and endpoints.

- [ ] **Step 4: Commit deployment configuration**
  Run `git commit -m "feat(deploy): multi-stage Dockerfile with SQLite volume persistence"`

---

### Task 6: End-to-End Verification & Remote Push

**Files:**
- Test end-to-end functionality across all components.

- [ ] **Step 1: Verify data persistence & SQLite sync**
  Test saving weights, completing sets, refreshing, and verifying data in `gym.db`.

- [ ] **Step 2: Verify Dual Exports (Excel & SQLite .db)**
  Test downloading `.xlsx` and `.db` files from the History view.

- [ ] **Step 3: Verify Stopwatch Screen-Sleep Resilience**
  Verify timer counts down accurately without drift.

- [ ] **Step 4: Push to origin main on GitHub**
  Run `git push origin main` and confirm repository is up to date.
