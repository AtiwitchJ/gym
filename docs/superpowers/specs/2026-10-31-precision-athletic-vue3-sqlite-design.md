# Precision Athletic Gym Tracker (Vue 3 + SQLite + Tailwind) — Design Specification

- **Date:** 2026-10-31
- **Author:** Antigravity & User
- **Status:** Approved for Implementation

---

## 1. Vision & Problem Statement

### 1.1 Goal
Transform the existing single-file gym tracker into a high-performance, full-stack, athletic web application tailored for real gym workouts (Jetts Fitness 4-day split + bonus touch-ups). It must be:
1. **Human-Crafted Athletic UI (Non-AI Aesthetic):** Designed like dedicated instruments (Hevy, Whoop, Eleiko timers) with tabular numbers, thumb-friendly tactile rows, smart quick-add chips, and zero emoji clutter.
2. **Modern & Maintainable Stack:** Built with Vue 3, Vite, and Tailwind CSS.
3. **Cross-Device Persistent Database (SQLite):** Centralized `gym.db` hosted on Mac/server via Docker over Tailscale VPN so training logs sync seamlessly across iPhone, iPad, and desktop.
4. **Dual Exporting:** Instant one-click export for both formatted Excel (`.xlsx`) and raw SQLite database backup (`.db`).
5. **Offline-First & Screen-Sleep Resilient:** Fully functional PWA when gym Wi-Fi drops, with a timestamp-based countdown timer that never freezes or drifts when the phone locks.

---

## 2. Design System: Precision Athletic

### 2.1 Aesthetic Archetype
- **Look & Feel:** Machined dark slate, high-contrast typography, industrial gym instrument styling.
- **Tone:** Direct, concise, functional. No generic AI badges, glowing neon borders, or emoji spam.

### 2.2 Color Tokens
- **Background (Titanium Slate):** `#0E1015`
- **Surface / Card (Machined Plate):** `#161922`
- **Card Border:** `#232736`
- **Signal Accent (Jetts Crimson):** `#E11D48` (Rose-600)
- **Confirmed Set (Emerald Plate):** `#059669` (Solid deep emerald, clear tactile state)
- **Text Primary (Crisp White):** `#F8FAFC`
- **Text Secondary (Cool Steel):** `#94A3B8`
- **Warmup Tag:** `#38BDF8` (Sky)
- **Bonus Touchup Tag:** `#F59E0B` (Amber)

### 2.3 Typography & Numbers
- **Display / Headers:** `Kanit` Bold & `Outfit` with tight tracking (`tracking-tight`) for strong athletic identity.
- **Numbers & Metrics:** Tabular numerals (`font-mono`, `font-variant-numeric: tabular-nums`) so weights, reps, and stopwatch seconds never jitter or shift layout during ticks.

### 2.4 Layout & Interactions
- **Tactile Set Rows:**
  - Column 1: Set Badge (`W1` for warmup, `S1..S3` for working sets, `B1..B2` for bonus).
  - Column 2: Target Reps (e.g., `6–8 reps`).
  - Column 3: Decimal weight input (`inputmode="decimal"`) with smart Quick Chips (`[Use Prev]`, `[+2.5]`).
  - Column 4: Large square checkmark button (`48x48px` minimum) with tactile vibration (Web Haptics API).
- **Persistent Gym Stopwatch Dock:** Fixed at the bottom of the screen with bold digital numerals, quick preset pills (`60s`, `90s`, `120s`, `180s`), and Web Audio beep on completion.

---

## 3. System Architecture

```
       📱 Mobile (In Gym)            💻 Mac / Desktop (At Home)
              │                                │
              └──────────────┬─────────────────┘
                             │ (Tailscale VPN)
                             ▼
             ┌────────────────────────────────┐
             │    Docker Container (:8080)    │
             │  Node.js API + Static Server   │
             └───────────────┬────────────────┘
                             │
                             ▼
             ┌────────────────────────────────┐
             │ Volume Mount: ./data/gym.db    │
             │       SQLite Database          │
             └────────────────────────────────┘
```

### 3.1 Frontend (`/src`)
- **Vue 3 (Composition API) + Vite:** Fast compilation, component modularity.
- **Tailwind CSS:** Utility-first styling with custom theme tokens.
- **Lucide Icons (Vue):** High-precision SVG icons replacing all emojis.
- **SheetJS (`xlsx`):** Client-side Excel `.xlsx` generator with customized headers and formatting.
- **Service Worker / PWA:** Offline caching of application assets.

### 3.2 Backend (`/server`)
- **Runtime:** Node.js (v20+ / v22).
- **Framework:** Express.js (or Fastify) with lightweight footprint.
- **Database Driver:** `better-sqlite3` (synchronous, blazing fast, zero native crash overhead).
- **Static File Serving:** Serves compiled Vue 3 frontend (`dist/`) directly on port `8080`.
- **API Endpoints:**
  - `GET /api/state` — Retrieve current draft state & latest recorded weights.
  - `POST /api/state` — Real-time auto-save draft weights & checked sets.
  - `POST /api/reset-day` — Clear draft ticks for a specific day.
  - `GET /api/history` — Get list of completed workout sessions.
  - `POST /api/history` — Commit completed session & update historical weight records.
  - `DELETE /api/history/:id` — Delete a recorded session.
  - `GET /api/todos` & `POST /api/todos` — Get and update custom todo items.
  - `GET /api/export/db` — Download raw `gym.db` binary file.
  - `GET /api/export/xlsx` — Optional server-side Excel download (or generated client-side).

---

## 4. Database Schema (`data/gym.db`)

### 4.1 Tables
```sql
-- Workout Sessions (History)
CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  day_key TEXT NOT NULL,
  day_title TEXT NOT NULL,
  total_sets_done INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exercises in a Session
CREATE TABLE IF NOT EXISTS session_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  category TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
);

-- Individual Sets in a Session
CREATE TABLE IF NOT EXISTS session_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_exercise_id INTEGER NOT NULL,
  set_index INTEGER NOT NULL,
  type TEXT NOT NULL,
  target TEXT NOT NULL,
  weight REAL,
  done INTEGER DEFAULT 0,
  FOREIGN KEY (session_exercise_id) REFERENCES session_exercises(id) ON DELETE CASCADE
);

-- Last Recorded Weights (For Quick-fill and previous hints)
CREATE TABLE IF NOT EXISTS exercise_last_weights (
  exercise_id TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  weight REAL NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (exercise_id, set_index)
);

-- Real-time Draft State (Persists mid-workout progress across devices)
CREATE TABLE IF NOT EXISTS daily_draft_state (
  day_key TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Todo List
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  done INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Workout Routine Structure (`src/data/workouts.js`)

Maintains the exact Jetts Fitness 4-day plan with explicit Main (`ท่าหลัก`) and Sub (`ท่าเสริม`) labels, plus 2-set Bonus Touch-Ups:
- **Monday (Day 1):** Chest + Biceps + Abs
  - Main: Barbell Bench Press, Incline DB Press, DB Bicep Curl
  - Sub: Cable Crossover, Hammer Curl, Hanging Knee Raise, Cable Woodchoppers
  - Bonus Touch-Up: Shoulder (DB Overhead Press 2 sets), Triceps (Triceps Pushdown 2 sets)
- **Tuesday (Day 2):** Back + Triceps
  - Main: Lat Pulldown, Seated Cable Row, Cable Triceps Pushdown
  - Sub: DB Row, Overhand Pulldown, DB Overhead Triceps Ext, Dips
  - Bonus Touch-Up: Chest (Barbell Bench Press 2 sets), Biceps (DB Bicep Curl 2 sets)
- **Wednesday (Day 3):** Active Rest & Recovery (Mobility, Foam Roller, Nutrition guide)
- **Thursday (Day 4):** Legs + Calves + Abs
  - Main: Leg Press, Romanian Deadlift (RDL)
  - Sub: Leg Extension, Lying Leg Curl, Standing Calf Raise, Cable Woodchopper, Hanging Leg Raise
  - Bonus Touch-Up: Back (Lat Pulldown 2 sets), Shoulders (Lateral Raise 2 sets)
- **Friday (Day 5):** Shoulders + Full Arms (Touch-Up)
  - Main: Dumbbell Overhead Press, Barbell Upright Row
  - Sub: DB Lateral Raise, Reverse Pec Deck, Incline DB Curl, Overhead Cable Triceps Ext
  - Bonus Touch-Up: Chest (Incline DB Press 2 sets), Back (Seated Cable Row 2 sets)
- **Saturday - Sunday:** Weekend Recovery

---

## 6. Deployment & Self-Hosting

### 6.1 Multi-Stage Dockerfile
- **Stage 1 (Builder):** `node:22-alpine` runs `npm ci` and `npm run build` to generate `dist/`.
- **Stage 2 (Runner):** Lightweight `node:22-alpine` with `better-sqlite3`, serves static files & `/api` on port `8080`.
- **Data Persistence:** Mounted volume `./data:/app/data` ensures `gym.db` survives container restarts and upgrades.

### 6.2 Tailscale & Serve Scripts
- `./serve.sh tailscale` configures or runs `tailscale serve --bg 8080` or prints the direct machine IP for Tailscale VPN access.
- `docker-compose.yml` configured with `ports: ["8080:8080"]` and `restart: unless-stopped`.

---

## 7. Migration Plan

1. Scaffold project structure (`server/`, `src/`, `public/`).
2. Implement backend SQLite schema & Express REST API in `server/`.
3. Configure Vite, Tailwind CSS, and Lucide icons.
4. Extract workout data cleanly into `src/data/workouts.js`.
5. Implement Vue 3 components (`HeaderBar`, `DayTabs`, `ExerciseCard`, `BonusCard`, `RestTimer`, `HistoryView`, `TodoView`).
6. Implement composables (`useWorkoutStore`, `useTimer`, `useExcelExport`).
7. Update Dockerfile and `docker-compose.yml` for multi-stage build and volume mount.
8. Verify end-to-end functionality (State sync, SQLite persistence, Excel export, DB download, timer accuracy, responsive layout).
