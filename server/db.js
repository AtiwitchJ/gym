const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { MIN_MEMBERS } = require('./supersets');
const { calculateEstimated1RM } = require('./estimate');

const DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// GYM_DB_PATH lets tests use a throwaway database; default is the real data/gym.db.
// GYM_FORBID_REAL_DB=1 (set by scripts/run-tests.js) makes opening the real database an error.
const REAL_DB_PATH = path.join(DATA_DIR, 'gym.db');
const DB_PATH = process.env.GYM_DB_PATH || REAL_DB_PATH;
if (process.env.GYM_FORBID_REAL_DB === '1' && path.resolve(DB_PATH) === path.resolve(REAL_DB_PATH)) {
  throw new Error('GYM_FORBID_REAL_DB=1: refusing to open data/gym.db from a test step. Set GYM_DB_PATH to a temp file.');
}
if (process.env.GYM_DB_PATH) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}
const db = new Database(DB_PATH);

// High performance WAL mode
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    day_key TEXT NOT NULL,
    day_title TEXT NOT NULL,
    total_sets_done INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS session_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    category TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS session_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_exercise_id INTEGER NOT NULL,
    set_index INTEGER NOT NULL,
    type TEXT NOT NULL,
    target TEXT NOT NULL,
    weight REAL,
    actual_reps INTEGER,
    done INTEGER DEFAULT 0,
    FOREIGN KEY (session_exercise_id) REFERENCES session_exercises(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exercise_last_weights (
    exercise_id TEXT NOT NULL,
    set_index INTEGER NOT NULL,
    weight REAL NOT NULL,
    reps INTEGER,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (exercise_id, set_index)
  );

  CREATE TABLE IF NOT EXISTS daily_draft_state (
    day_key TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Exercise supersets (new). One group per workout day; an exercise belongs to at most one group per day.
  CREATE TABLE IF NOT EXISTS superset_groups (
    group_id TEXT PRIMARY KEY,
    day_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS superset_members (
    group_id TEXT NOT NULL REFERENCES superset_groups(group_id) ON DELETE CASCADE,
    day_key TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (day_key, exercise_id)
  );

  -- Custom rest seconds per exercise (synced across devices; the browser keeps a localStorage cache).
  CREATE TABLE IF NOT EXISTS exercise_rest (
    exercise_id TEXT PRIMARY KEY,
    seconds INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Gym profiles for plate inventory and barbell defaults (synced across devices).
  CREATE TABLE IF NOT EXISTS gym_profiles (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    plate_inventory TEXT NOT NULL DEFAULT '{}',
    default_bar_weight REAL DEFAULT 20,
    updated_at TEXT
  );

  -- Body weight tracking (daily logs & trend).
  CREATE TABLE IF NOT EXISTS body_weights (
    date TEXT PRIMARY KEY,
    weight REAL NOT NULL,
    note TEXT,
    updated_at TEXT
  );

  -- Weekly training goal for the calendar/streak overview.
  CREATE TABLE IF NOT EXISTS user_training_goals (
    id TEXT PRIMARY KEY,
    weekly_target_days INTEGER DEFAULT 4,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  INSERT OR IGNORE INTO user_training_goals (id, weekly_target_days) VALUES ('default_user', 4);

  -- Exercise target goals for progression chart & strength curve
  CREATE TABLE IF NOT EXISTS exercise_goals (
    exercise_id TEXT PRIMARY KEY,
    target_weight REAL NOT NULL,
    target_reps INTEGER DEFAULT 1,
    target_e1rm REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Backup and import audit logs
  CREATE TABLE IF NOT EXISTS backup_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_format TEXT NOT NULL,
    sessions_count INTEGER DEFAULT 0,
    sets_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'success'
  );

  -- Persistent exercise machine setup and form cues
  CREATE TABLE IF NOT EXISTS exercise_setup_notes (
    exercise_id TEXT PRIMARY KEY,
    pin_setting TEXT DEFAULT '',
    form_cues TEXT DEFAULT '',
    general_note TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe migrations for columns
try {
  db.exec("ALTER TABLE session_sets ADD COLUMN actual_reps INTEGER;");
} catch(e) {}

try {
  db.exec("ALTER TABLE exercise_last_weights ADD COLUMN reps INTEGER;");
} catch(e) {}

try {
  db.exec("ALTER TABLE session_exercises ADD COLUMN canonical_id TEXT;");
} catch(e) {}

try {
  db.exec("ALTER TABLE exercise_last_weights ADD COLUMN canonical_id TEXT;");
} catch(e) {}

try {
  db.exec("ALTER TABLE session_sets ADD COLUMN rir INTEGER;");
} catch(e) {}

try {
  db.exec("ALTER TABLE exercise_last_weights ADD COLUMN rir INTEGER;");
} catch(e) {}

// RIR "เหลือ 2+" is stored as rir 2 with rir_plus 1, so the "2 or more" meaning is kept (review fix).
try {
  db.exec("ALTER TABLE session_sets ADD COLUMN rir_plus INTEGER DEFAULT 0;");
} catch(e) {}

// Canonical Exercise Mapping (shared across 4-Day Split, 3-Day A/B Alternating Split, and custom routines)
const CANONICAL_MAP = {
  // 1. Shoulder Press Machine (Thursday Main <-> Mon/Tue/Wed Bonus, Program A/B)
  th1: 'shoulder_press',
  b_m_shoulder: 'shoulder_press',
  b_t_shoulder: 'shoulder_press',
  b_w_shoulder: 'shoulder_press',
  shoulder_press: 'shoulder_press',
  shoulder_press_machine: 'shoulder_press',
  seated_dumbbell_shoulder_press: 'shoulder_press',
  overhead_barbell_press: 'shoulder_press',
  b4: 'shoulder_press',
  b3_shoulder_press: 'shoulder_press',
  pa_shoulder_press: 'shoulder_press',
  pb_shoulder_press: 'shoulder_press',
  pa_shoulder: 'shoulder_press',
  pb_shoulder: 'shoulder_press',
  a_shoulder_press: 'shoulder_press',
  b_shoulder_press: 'shoulder_press',
  a_shoulder: 'shoulder_press',
  b_shoulder: 'shoulder_press',
  program_a_shoulder_press: 'shoulder_press',
  program_b_shoulder_press: 'shoulder_press',

  // 2. Chest Press Machine (Tuesday Main <-> Mon/Wed/Thu Bonus, Program A/B)
  t1: 'chest_press',
  b_m_chest: 'chest_press',
  b_w_chest: 'chest_press',
  b_th_chest: 'chest_press',
  chest_press: 'chest_press',
  chest_press_machine: 'chest_press',
  barbell_bench_press: 'chest_press',
  flat_dumbbell_bench_press: 'chest_press',
  a1: 'chest_press',
  a1_chest_press: 'chest_press',
  pa_chest_press: 'chest_press',
  pb_chest_press: 'chest_press',
  pa_chest: 'chest_press',
  pb_chest: 'chest_press',
  a_chest_press: 'chest_press',
  b_chest_press: 'chest_press',
  a_chest: 'chest_press',
  b_chest: 'chest_press',
  program_a_chest_press: 'chest_press',
  program_b_chest_press: 'chest_press',

  // 3. Lat Pulldown Machine (Wednesday Main <-> Mon/Tue/Thu Bonus, Program A/B)
  w2: 'lat_pulldown',
  b_m_back: 'lat_pulldown',
  b_t_back: 'lat_pulldown',
  b_th_back: 'lat_pulldown',
  lat_pulldown: 'lat_pulldown',
  lat_pulldown_machine: 'lat_pulldown',
  assisted_pull_up_machine: 'lat_pulldown',
  pullups: 'lat_pulldown',
  a2: 'lat_pulldown',
  a3_lat_pulldown: 'lat_pulldown',
  pa_lat_pulldown: 'lat_pulldown',
  pb_lat_pulldown: 'lat_pulldown',
  pa_back: 'lat_pulldown',
  pb_back: 'lat_pulldown',
  a_lat_pulldown: 'lat_pulldown',
  b_lat_pulldown: 'lat_pulldown',
  a_back: 'lat_pulldown',
  b_back: 'lat_pulldown',
  program_a_lat_pulldown: 'lat_pulldown',
  program_b_lat_pulldown: 'lat_pulldown',

  // 4. Seated Leg Press Machine (Monday Main <-> Tue/Wed/Thu Bonus, Program A/B)
  m1: 'seated_leg_press',
  b_t_leg: 'seated_leg_press',
  b_w_leg: 'seated_leg_press',
  b_th_leg: 'seated_leg_press',
  seated_leg_press: 'seated_leg_press',
  hack_squat_machine: 'seated_leg_press',
  barbell_back_squat: 'seated_leg_press',
  b1: 'seated_leg_press',
  b1_leg_press: 'seated_leg_press',
  pa_leg_press: 'seated_leg_press',
  pb_leg_press: 'seated_leg_press',
  pa_leg: 'seated_leg_press',
  pb_leg: 'seated_leg_press',
  a_leg_press: 'seated_leg_press',
  b_leg_press: 'seated_leg_press',
  a_leg: 'seated_leg_press',
  b_leg: 'seated_leg_press',
  program_a_leg_press: 'seated_leg_press',
  program_b_leg_press: 'seated_leg_press',

  // 5. Incline Chest Press (Tuesday Main, Program A/B)
  t2: 'incline_chest',
  incline_chest: 'incline_chest',
  incline_dumbbell_press: 'incline_chest',
  incline_smith_press: 'incline_chest',
  a3: 'incline_chest',
  a2_incline_chest: 'incline_chest',
  pa_incline_chest: 'incline_chest',
  pb_incline_chest: 'incline_chest',
  pa_incline_press: 'incline_chest',
  pb_incline_press: 'incline_chest',
  a_incline_chest: 'incline_chest',
  b_incline_chest: 'incline_chest',
  a_incline_press: 'incline_chest',
  b_incline_press: 'incline_chest',
  program_a_incline_chest: 'incline_chest',
  program_b_incline_chest: 'incline_chest',

  // 6. Seated Row / Row Back (Wednesday Main, Program A/B)
  w1: 'row_back',
  row_back: 'row_back',
  seated_row: 'row_back',
  seated_cable_row: 'row_back',
  chest_supported_row: 'row_back',
  barbell_bent_over_row: 'row_back',
  t_bar_row: 'row_back',
  a4: 'row_back',
  a4_seated_row: 'row_back',
  pa_row_back: 'row_back',
  pb_row_back: 'row_back',
  pa_seated_row: 'row_back',
  pb_seated_row: 'row_back',
  a_row_back: 'row_back',
  b_row_back: 'row_back',
  a_seated_row: 'row_back',
  b_seated_row: 'row_back',
  program_a_row_back: 'row_back',
  program_b_row_back: 'row_back',

  // 7. Pec Fly / Chest Fly (Tuesday Accessory, Program A/B)
  t3: 'chest_fly',
  chest_fly: 'chest_fly',
  pec_fly: 'chest_fly',
  pec_fly_machine: 'chest_fly',
  cable_crossover: 'chest_fly',
  cable_incline_fly: 'chest_fly',
  a5: 'chest_fly',
  a5_pec_fly: 'chest_fly',
  pa_chest_fly: 'chest_fly',
  pb_chest_fly: 'chest_fly',
  a_chest_fly: 'chest_fly',
  b_chest_fly: 'chest_fly',
  program_a_chest_fly: 'chest_fly',
  program_b_chest_fly: 'chest_fly',

  // 8. Hip Thrust (Monday Main, Program A/B)
  m2: 'hip_thrust',
  hip_thrust: 'hip_thrust',
  smith_hip_thrust: 'hip_thrust',
  b2: 'hip_thrust',
  b2_hip_thrust: 'hip_thrust',
  pa_hip_thrust: 'hip_thrust',
  pb_hip_thrust: 'hip_thrust',
  a_hip_thrust: 'hip_thrust',
  b_hip_thrust: 'hip_thrust',
  program_a_hip_thrust: 'hip_thrust',
  program_b_hip_thrust: 'hip_thrust',

  // 9. Leg Extension (Monday Accessory, Program A/B)
  m3: 'leg_extension',
  leg_extension: 'leg_extension',
  leg_extension_machine: 'leg_extension',
  b3: 'leg_extension',
  pa_leg_extension: 'leg_extension',
  pb_leg_extension: 'leg_extension',
  a_leg_extension: 'leg_extension',
  b_leg_extension: 'leg_extension',
  program_a_leg_extension: 'leg_extension',
  program_b_leg_extension: 'leg_extension',

  // 10. Secondary movements in Program A & B
  a6: 'hanging_leg_raise',
  hanging_leg_raise: 'hanging_leg_raise',
  a6_abdominal: 'abdominal_core',
  b4_lateral_raise: 'lateral_raise',
  b5: 'shrug',
  shrug: 'shrug',
  b5_shrug: 'shrug_traps',
  b6: 'triceps_pushdown',
  triceps_pushdown: 'triceps_pushdown',
  b6_biceps_curl: 'biceps_curl',
  b7: 'hammer_curl',
  hammer_curl: 'hammer_curl',
  b7_triceps_pushdown: 'triceps_pushdown'
};

function getCanonicalExerciseId(exId) {
  return CANONICAL_MAP[exId] || exId;
}

function getLinkedExerciseIds(exId) {
  const canon = getCanonicalExerciseId(exId);
  const linked = [];
  for (const [id, cId] of Object.entries(CANONICAL_MAP)) {
    if (cId === canon && !linked.includes(id)) {
      linked.push(id);
    }
  }
  if (!linked.includes(exId)) linked.push(exId);
  return linked;
}

// Repository helpers
const repo = {
  db,
  getDbPath: () => DB_PATH,
  CANONICAL_MAP,
  getCanonicalExerciseId,
  getLinkedExerciseIds,

  // Draft State (real-time cross-device sync)
  getAllDrafts() {
    const rows = db.prepare('SELECT day_key, state_json FROM daily_draft_state').all();
    const result = {};
    for (const r of rows) {
      try {
        result[r.day_key] = JSON.parse(r.state_json);
      } catch (e) {
        result[r.day_key] = {};
      }
    }
    return result;
  },

  saveDraft(dayKey, stateObj) {
    const stmt = db.prepare(`
      INSERT INTO daily_draft_state (day_key, state_json, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(day_key) DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(dayKey, JSON.stringify(stateObj));
  },

  clearDraft(dayKey) {
    db.prepare('DELETE FROM daily_draft_state WHERE day_key = ?').run(dayKey);
    this.healAllRecordsFromHistory();
  },

  // Last Weights & Reps
  getLastWeights(exerciseId = null) {
    if (exerciseId) {
      const rows = db.prepare('SELECT exercise_id, set_index, weight, reps, updated_at, canonical_id FROM exercise_last_weights WHERE exercise_id = ? ORDER BY set_index ASC').all(exerciseId);
      if (rows.length === 0) return {};
      const res = {};
      for (const r of rows) {
        res[`wt_${r.set_index}`] = r.weight;
        if (r.reps !== null && r.reps !== undefined) {
          res[`reps_${r.set_index}`] = r.reps;
        }
        if (r.rir !== null && r.rir !== undefined) {
          res[`rir_${r.set_index}`] = r.rir;
        }
        res.updatedAt = r.updated_at;
        if (r.canonical_id) {
          res.canonicalId = r.canonical_id;
        }
      }
      return res;
    }

    const rows = db.prepare('SELECT exercise_id, set_index, weight, reps, updated_at, canonical_id FROM exercise_last_weights ORDER BY updated_at ASC').all();
    const result = {};
    for (const r of rows) {
      if (!result[r.exercise_id]) result[r.exercise_id] = {};
      result[r.exercise_id][`wt_${r.set_index}`] = r.weight;
      if (r.reps !== null && r.reps !== undefined) {
        result[r.exercise_id][`reps_${r.set_index}`] = r.reps;
      }
      if (r.rir !== null && r.rir !== undefined) {
        result[r.exercise_id][`rir_${r.set_index}`] = r.rir;
      }
      result[r.exercise_id].updatedAt = r.updated_at;
      if (r.canonical_id) {
        result[r.exercise_id].canonicalId = r.canonical_id;
      }
    }
    return result;
  },

  saveLastRecord(exerciseId, setIndex, weight, reps, updatedAt = null, force = false, rir = null) {
    const dateStr = updatedAt || new Date().toISOString();
    const canon = getCanonicalExerciseId(exerciseId);
    const linkedIds = getLinkedExerciseIds(exerciseId);
    const rirNum = (rir !== null && rir !== undefined && rir !== '') ? Number(rir) : null;

    const sql = force
      ? `
        INSERT INTO exercise_last_weights (exercise_id, set_index, weight, reps, updated_at, canonical_id, rir)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(exercise_id, set_index) DO UPDATE SET
          weight = excluded.weight,
          reps = excluded.reps,
          updated_at = excluded.updated_at,
          canonical_id = excluded.canonical_id,
          rir = excluded.rir
      `
      : `
        INSERT INTO exercise_last_weights (exercise_id, set_index, weight, reps, updated_at, canonical_id, rir)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(exercise_id, set_index) DO UPDATE SET
          weight = excluded.weight,
          reps = COALESCE(excluded.reps, exercise_last_weights.reps),
          updated_at = excluded.updated_at,
          canonical_id = excluded.canonical_id,
          rir = COALESCE(excluded.rir, exercise_last_weights.rir)
        WHERE excluded.updated_at >= exercise_last_weights.updated_at OR exercise_last_weights.updated_at IS NULL
      `;

    const stmt = db.prepare(sql);

    const wNum = Number(weight) || 0;
    const rNum = reps !== undefined && reps !== '' && reps !== null ? Number(reps) : null;

    // 1. Save directly for the exercise
    stmt.run(exerciseId, setIndex, wNum, rNum, dateStr, canon, rirNum);

    // 2. Save directly under the canonical ID for centralized queries
    stmt.run(canon, setIndex, wNum, rNum, dateStr, canon, rirNum);

    // 3. Atomically propagate to all linked peer exercises across days
    // e.g., b_m_shoulder (Monday Bonus) <-> th1 (Thursday Main)
    for (const targetId of linkedIds) {
      if (targetId === exerciseId) continue;

      if (setIndex === 0) {
        // Warmup set links to warmup set (set_index = 0)
        stmt.run(targetId, 0, wNum, rNum, dateStr, canon, rirNum);
      } else {
        // Working set / touchup set
        // If target has multiple sets (not a single-set bonus touchup),
        // seed/sync sets 1, 2, and 3 so all working sets have this latest record!
        if (!targetId.startsWith('b_')) {
          if (exerciseId.startsWith('b_')) {
            // Source is a bonus touchup (which only performs set 1)
            // Seed sets 1, 2, and 3 so all working sets on the main day have this latest record!
            stmt.run(targetId, 1, wNum, rNum, dateStr, canon, rirNum);
            stmt.run(targetId, 2, wNum, rNum, dateStr, canon, rirNum);
            stmt.run(targetId, 3, wNum, rNum, dateStr, canon, rirNum);
          } else {
            // Standard working set maps to the corresponding working set index
            stmt.run(targetId, setIndex, wNum, rNum, dateStr, canon, rirNum);
          }
        } else {
          // Target is a bonus touchup exercise (which reads set_index = 1).
          // Only primary working set 1 (or single working set) propagates to bonus touchup set 1,
          // so drop/variation sets (sets 2, 3) don't overwrite the primary lift weight/reps!
          if (setIndex === 1) {
            stmt.run(targetId, 1, wNum, rNum, dateStr, canon, rirNum);
          }
        }
      }
    }
  },

  // History Sessions
  getHistory() {
    const sessions = db.prepare('SELECT * FROM workout_sessions ORDER BY date DESC, time DESC, created_at DESC').all();
    const getExercises = db.prepare('SELECT * FROM session_exercises WHERE session_id = ? ORDER BY id ASC');
    const getSets = db.prepare('SELECT * FROM session_sets WHERE session_exercise_id = ? ORDER BY set_index ASC');

    return sessions.map(s => {
      const exercises = getExercises.all(s.id).map(ex => {
        const sets = getSets.all(ex.id).map(set => ({
          setIndex: set.set_index,
          type: set.type,
          target: set.target,
          weight: set.weight,
          actualReps: set.actual_reps,
          done: Boolean(set.done),
          rir: set.rir !== undefined ? set.rir : null,
          rirPlus: Boolean(set.rir_plus)
        }));
        return {
          id: ex.exercise_id,
          name: ex.exercise_name,
          category: ex.category,
          canonicalId: ex.canonical_id || getCanonicalExerciseId(ex.exercise_id),
          sets
        };
      });

      return {
        id: s.id,
        date: s.date,
        time: s.time,
        dayKey: s.day_key,
        dayTitle: s.day_title,
        totalSetsDone: s.total_sets_done,
        exercises
      };
    });
  },

  // Get cross-day unified exercise history (e.g. all shoulder press sessions across Mon and Thu)
  getExerciseHistory(exerciseIdOrCanon) {
    const canon = getCanonicalExerciseId(exerciseIdOrCanon);
    const linkedIds = getLinkedExerciseIds(exerciseIdOrCanon);
    const placeholders = linkedIds.map(() => '?').join(',');

    const query = db.prepare(`
      SELECT DISTINCT ws.id as session_id, ws.date, ws.time, ws.day_key, ws.day_title,
             se.id as session_exercise_id, se.exercise_id, se.exercise_name, se.category, se.canonical_id
      FROM session_exercises se
      JOIN workout_sessions ws ON ws.id = se.session_id
      WHERE se.canonical_id = ? OR se.exercise_id IN (${placeholders})
      ORDER BY ws.date DESC, ws.time DESC
    `);

    const rows = query.all(canon, ...linkedIds);
    const getSets = db.prepare('SELECT * FROM session_sets WHERE session_exercise_id = ? ORDER BY set_index ASC');

    return rows.map(r => ({
      sessionId: r.session_id,
      date: r.date,
      time: r.time,
      dayKey: r.day_key,
      dayTitle: r.day_title,
      exerciseId: r.exercise_id,
      exerciseName: r.exercise_name,
      category: r.category,
      canonicalId: r.canonical_id || canon,
      sets: getSets.all(r.session_exercise_id).map(s => ({
        setIndex: s.set_index,
        type: s.type,
        target: s.target,
        weight: s.weight,
        actualReps: s.actual_reps,
        done: Boolean(s.done),
        rir: s.rir !== undefined ? s.rir : null,
        rirPlus: Boolean(s.rir_plus)
      }))
    }));
  },

  saveSession(session) {
    const deleteExisting = db.prepare('DELETE FROM workout_sessions WHERE id = ?');
    const insertSession = db.prepare(`
      INSERT INTO workout_sessions (id, date, time, day_key, day_title, total_sets_done)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertExercise = db.prepare(`
      INSERT INTO session_exercises (session_id, exercise_id, exercise_name, category, canonical_id)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertSet = db.prepare(`
      INSERT INTO session_sets (session_exercise_id, set_index, type, target, weight, actual_reps, done, rir, rir_plus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      deleteExisting.run(session.id);
      insertSession.run(
        session.id,
        session.date,
        session.time,
        session.dayKey,
        session.dayTitle,
        session.totalSetsDone || 0
      );

      if (Array.isArray(session.exercises)) {
        for (const ex of session.exercises) {
          const canonId = getCanonicalExerciseId(ex.id);
          const exInfo = insertExercise.run(session.id, ex.id, ex.name, ex.category || '', canonId);
          const exerciseRowId = exInfo.lastInsertRowid;

          if (Array.isArray(ex.sets)) {
            for (const set of ex.sets) {
              const isSetDone = set.done === undefined || set.done === null || Boolean(set.done);
              // Only a completed set carries weight, reps or RIR. An unfinished set is stored without values.
              const wt = (isSetDone && set.weight !== undefined && set.weight !== '') ? Number(set.weight) : null;
              const reps = (isSetDone && set.actualReps !== undefined && set.actualReps !== '') ? Number(set.actualReps) : null;
              const rir = (isSetDone && set.rir !== undefined && set.rir !== '' && set.rir !== null) ? Number(set.rir) : null;

              insertSet.run(
                exerciseRowId,
                set.setIndex,
                set.type,
                set.target,
                wt,
                reps,
                set.done ? 1 : 0,
                rir,
                (rir !== null && set.rirPlus) ? 1 : 0
              );

              // Persist to last record with bidirectional cross-day propagation
              // Only record when set is completed (done) or if done is undefined (implied completed session)
              if (isSetDone && wt !== null) {
                const sessionDateStr = session.date && session.time
                  ? `${session.date}T${session.time}:00.000Z`
                  : (session.date || new Date().toISOString());
                this.saveLastRecord(ex.id, set.setIndex - 1, wt, reps, sessionDateStr, false, rir);
              }
            }
          }
        }
      }
    });

    transaction();
    return { success: true, id: session.id };
  },

  // Completed sets only (done = 1) with their exercise id and session date/time. Read-only; feeds /api/recovery.
  getCompletedSetRows() {
    return db.prepare(`
      SELECT se.exercise_id AS exerciseId, ws.date AS date, ws.time AS time, ss.done AS done
      FROM session_sets ss
      JOIN session_exercises se ON se.id = ss.session_exercise_id
      JOIN workout_sessions ws ON ws.id = se.session_id
      WHERE ss.done = 1
    `).all();
  },

  // Completed sets with weight and reps (volume input). Read-only; feeds /api/volume/weekly.
  getCompletedSetVolumeRows() {
    return db.prepare(`
      SELECT se.exercise_id AS exerciseId, se.exercise_name AS exerciseName, ws.date AS date,
             ss.done AS done, ss.type AS type, ss.weight AS weight, ss.actual_reps AS actualReps
      FROM session_sets ss
      JOIN session_exercises se ON se.id = ss.session_exercise_id
      JOIN workout_sessions ws ON ws.id = se.session_id
      WHERE ss.done = 1
    `).all();
  },

  // Exercise supersets (per workout day). Read/write only the superset tables.
  getSupersetGroup(groupId) {
    const g = db.prepare('SELECT group_id, day_key FROM superset_groups WHERE group_id = ?').get(groupId);
    if (!g) return null;
    const members = db.prepare('SELECT exercise_id FROM superset_members WHERE group_id = ? ORDER BY position ASC').all(groupId);
    return { groupId: g.group_id, dayKey: g.day_key, exerciseIds: members.map((m) => m.exercise_id) };
  },

  getSupersets(dayKey) {
    const ids = db.prepare('SELECT group_id FROM superset_groups WHERE day_key = ? ORDER BY created_at ASC, group_id ASC').all(dayKey);
    return ids.map((r) => this.getSupersetGroup(r.group_id));
  },

  // Creates a group. Throws status 409 if any exercise is already grouped on that day.
  createSuperset(dayKey, exerciseIds) {
    const findMember = db.prepare('SELECT group_id FROM superset_members WHERE day_key = ? AND exercise_id = ?');
    const insertGroup = db.prepare('INSERT INTO superset_groups (group_id, day_key) VALUES (?, ?)');
    const insertMember = db.prepare('INSERT INTO superset_members (group_id, day_key, exercise_id, position) VALUES (?, ?, ?, ?)');

    const groupId = `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const transaction = db.transaction(() => {
      for (const id of exerciseIds) {
        if (findMember.get(dayKey, id)) {
          throw Object.assign(new Error(`${id} is already in a superset on ${dayKey}`), { status: 409 });
        }
      }
      insertGroup.run(groupId, dayKey);
      exerciseIds.forEach((id, i) => insertMember.run(groupId, dayKey, id, i));
    });
    transaction();
    return this.getSupersetGroup(groupId);
  },

  // Removes one exercise from its group. A group left with fewer than MIN_MEMBERS is dissolved.
  // Throws status 404 when the exercise is not a member of that group.
  removeSupersetMember(groupId, exerciseId) {
    const deleteMember = db.prepare('DELETE FROM superset_members WHERE group_id = ? AND exercise_id = ?');
    const deleteGroup = db.prepare('DELETE FROM superset_groups WHERE group_id = ?');
    let dissolved = false;
    let dayKey = null;
    let exerciseIds = [];

    const transaction = db.transaction(() => {
      const before = this.getSupersetGroup(groupId);
      if (!before || !before.exerciseIds.includes(exerciseId)) {
        throw Object.assign(new Error('exercise is not in this superset'), { status: 404 });
      }
      dayKey = before.dayKey;
      deleteMember.run(groupId, exerciseId);
      const remaining = this.getSupersetGroup(groupId);
      if (remaining.exerciseIds.length < MIN_MEMBERS) {
        deleteGroup.run(groupId); // members cascade
        dissolved = true;
        exerciseIds = [];
      } else {
        exerciseIds = remaining.exerciseIds;
      }
    });
    transaction();
    return { groupId, dayKey, exerciseIds, dissolved };
  },

  deleteSession(sessionId) {
    const result = db.prepare('DELETE FROM workout_sessions WHERE id = ?').run(sessionId);
    return { success: result.changes > 0 };
  },

  // Todos
  getTodos() {
    return db.prepare('SELECT id, text, done, created_at FROM todos ORDER BY created_at ASC').all().map(t => ({
      id: t.id,
      text: t.text,
      done: Boolean(t.done)
    }));
  },

  saveTodos(todosList) {
    const deleteOld = db.prepare('DELETE FROM todos');
    const insertTodo = db.prepare('INSERT INTO todos (id, text, done) VALUES (?, ?, ?)');

    const transaction = db.transaction(() => {
      deleteOld.run();
      if (Array.isArray(todosList)) {
        for (const t of todosList) {
          insertTodo.run(String(t.id), t.text, t.done ? 1 : 0);
        }
      }
    });

    transaction();
    return { success: true };
  },

  // Custom rest seconds per exercise (synced across devices).
  getExerciseRest() {
    const rows = db.prepare('SELECT exercise_id, seconds FROM exercise_rest').all();
    const map = {};
    for (const r of rows) {
      map[r.exercise_id] = r.seconds;
    }
    return map;
  },

  saveExerciseRest(exerciseId, seconds) {
    const id = String(exerciseId);
    const value = Number(seconds);
    db.prepare(
      `INSERT INTO exercise_rest (exercise_id, seconds, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(exercise_id) DO UPDATE SET seconds = excluded.seconds, updated_at = excluded.updated_at`
    ).run(id, value, new Date().toISOString());
    return { success: true, exerciseId: id, seconds: value };
  },

  // Gym profiles (plate inventory and barbell defaults per gym)
  getGymProfiles() {
    const rows = db.prepare('SELECT id, name, plate_inventory, default_bar_weight, updated_at FROM gym_profiles ORDER BY id ASC').all();
    return rows.map(r => this.formatGymProfile(r));
  },

  getGymProfileById(id) {
    const row = db.prepare('SELECT id, name, plate_inventory, default_bar_weight, updated_at FROM gym_profiles WHERE id = ?').get(Number(id));
    return row ? this.formatGymProfile(row) : null;
  },

  formatGymProfile(r) {
    let inventory = {};
    try {
      inventory = typeof r.plate_inventory === 'string' ? JSON.parse(r.plate_inventory) : (r.plate_inventory || {});
    } catch (e) {
      inventory = {};
    }
    return {
      id: r.id,
      name: r.name,
      plate_inventory: inventory,
      default_bar_weight: r.default_bar_weight !== null && r.default_bar_weight !== undefined ? Number(r.default_bar_weight) : 20,
      updated_at: r.updated_at
    };
  },

  saveGymProfile(profile) {
    const name = String(profile.name || '').trim();
    let inventoryStr = '{}';
    const rawInv = profile.plate_inventory !== undefined ? profile.plate_inventory : profile.plateInventory;
    if (rawInv !== undefined && rawInv !== null) {
      inventoryStr = typeof rawInv === 'string' ? rawInv : JSON.stringify(rawInv);
    }

    let barWeight = 20;
    const rawBar = profile.default_bar_weight !== undefined ? profile.default_bar_weight : profile.defaultBarWeight;
    if (rawBar !== undefined && rawBar !== null) {
      barWeight = Number(rawBar);
    }

    const updatedAt = profile.updated_at || profile.updatedAt || new Date().toISOString();

    if (profile.id) {
      const id = Number(profile.id);
      const existing = db.prepare('SELECT id FROM gym_profiles WHERE id = ?').get(id);
      if (existing) {
        db.prepare(`
          UPDATE gym_profiles
          SET name = ?, plate_inventory = ?, default_bar_weight = ?, updated_at = ?
          WHERE id = ?
        `).run(name, inventoryStr, barWeight, updatedAt, id);
        return this.getGymProfileById(id);
      } else {
        db.prepare(`
          INSERT INTO gym_profiles (id, name, plate_inventory, default_bar_weight, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, name, inventoryStr, barWeight, updatedAt);
        return this.getGymProfileById(id);
      }
    } else {
      const info = db.prepare(`
        INSERT INTO gym_profiles (name, plate_inventory, default_bar_weight, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(name, inventoryStr, barWeight, updatedAt);
      return this.getGymProfileById(info.lastInsertRowid);
    }
  },

  deleteGymProfile(id) {
    const numId = Number(id);
    const result = db.prepare('DELETE FROM gym_profiles WHERE id = ?').run(numId);
    return { success: result.changes > 0, id: numId };
  },

  // Body weight tracking (daily logs & trend)
  getBodyWeights() {
    const rows = db.prepare('SELECT date, weight, note, updated_at FROM body_weights ORDER BY date DESC').all();
    return rows.map(r => this.formatBodyWeight(r));
  },

  getBodyWeightByDate(date) {
    const row = db.prepare('SELECT date, weight, note, updated_at FROM body_weights WHERE date = ?').get(String(date));
    return row ? this.formatBodyWeight(row) : null;
  },

  formatBodyWeight(r) {
    return {
      date: r.date,
      weight: Number(r.weight),
      note: r.note || '',
      updated_at: r.updated_at
    };
  },

  saveBodyWeight(data) {
    const date = String(data.date).trim();
    const weight = Number(data.weight);
    const note = data.note !== undefined && data.note !== null ? String(data.note) : '';
    const updatedAt = data.updated_at || new Date().toISOString();

    const existing = db.prepare('SELECT date FROM body_weights WHERE date = ?').get(date);
    const isUpdate = Boolean(existing);

    db.prepare(`
      INSERT INTO body_weights (date, weight, note, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        weight = excluded.weight,
        note = excluded.note,
        updated_at = excluded.updated_at
    `).run(date, weight, note, updatedAt);

    return {
      isUpdate,
      record: this.getBodyWeightByDate(date)
    };
  },

  deleteBodyWeight(date) {
    const d = String(date).trim();
    const result = db.prepare('DELETE FROM body_weights WHERE date = ?').run(d);
    return { success: result.changes > 0, date: d };
  },

  // Training calendar & streak
  getWeeklyTarget() {
    const row = db.prepare('SELECT weekly_target_days FROM user_training_goals WHERE id = ?').get('default_user');
    const value = row ? Number(row.weekly_target_days) : 4;
    return Number.isInteger(value) && value >= 1 && value <= 7 ? value : 4;
  },

  setWeeklyTarget(target) {
    const value = Number(target);
    db.prepare(`
      INSERT INTO user_training_goals (id, weekly_target_days, updated_at)
      VALUES ('default_user', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        weekly_target_days = excluded.weekly_target_days,
        updated_at = excluded.updated_at
    `).run(value, new Date().toISOString());
    return { success: true, weeklyTarget: this.getWeeklyTarget() };
  },

  getWorkoutDates() {
    return db.prepare('SELECT DISTINCT date FROM workout_sessions ORDER BY date ASC').all().map(r => r.date);
  },

  getSessionsByMonth(prefix) {
    return db.prepare(`
      SELECT id, date, day_key, day_title, total_sets_done
      FROM workout_sessions
      WHERE date LIKE ?
      ORDER BY date ASC, time ASC
    `).all(`${String(prefix)}%`);
  },

  // Exercise target goals
  getExerciseGoal(exerciseId) {
    if (!exerciseId) return null;
    const canon = getCanonicalExerciseId(exerciseId);
    const linkedIds = getLinkedExerciseIds(exerciseId);
    const placeholders = linkedIds.map(() => '?').join(',');
    const row = db.prepare(`
      SELECT exercise_id, target_weight, target_reps, target_e1rm, notes
      FROM exercise_goals
      WHERE exercise_id = ? OR exercise_id = ? OR exercise_id IN (${placeholders})
      ORDER BY CASE WHEN exercise_id = ? THEN 1 WHEN exercise_id = ? THEN 2 ELSE 3 END, updated_at DESC
      LIMIT 1
    `).get(exerciseId, canon, ...linkedIds, exerciseId, canon);

    if (!row) return null;
    return {
      targetWeight: Number(row.target_weight),
      targetReps: Number(row.target_reps),
      targetE1rm: row.target_e1rm !== null ? Number(row.target_e1rm) : null,
      notes: row.notes || ''
    };
  },

  setExerciseGoal(exerciseId, data) {
    const w = Number(data.targetWeight);
    const r = data.targetReps !== undefined && data.targetReps !== null && data.targetReps !== ''
      ? parseInt(data.targetReps, 10)
      : 1;
    const e1rm = data.targetE1rm !== undefined && data.targetE1rm !== null && data.targetE1rm !== ''
      ? Number(data.targetE1rm)
      : (r === 1 ? w : calculateEstimated1RM(w, r, 0));
    const notes = data.notes !== undefined && data.notes !== null ? String(data.notes) : '';
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO exercise_goals (exercise_id, target_weight, target_reps, target_e1rm, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(exercise_id) DO UPDATE SET
        target_weight = excluded.target_weight,
        target_reps = excluded.target_reps,
        target_e1rm = excluded.target_e1rm,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `).run(exerciseId, w, r, e1rm, notes, now, now);

    return {
      success: true,
      exerciseId,
      goal: {
        targetWeight: w,
        targetReps: r,
        targetE1rm: e1rm,
        notes
      }
    };
  },

  // Heal all canonical records from true historical sessions
  healCanonicalRecords() {
    const canons = [
      'shoulder_press',
      'chest_press',
      'lat_pulldown',
      'seated_leg_press',
      'incline_chest',
      'row_back',
      'chest_fly',
      'hip_thrust',
      'leg_extension'
    ];
    let healedCount = 0;

    for (const canon of canons) {
      const history = this.getExerciseHistory(canon);
      if (!Array.isArray(history) || history.length === 0) continue;

      // Find newest session with valid sets
      const newestSession = history.find(s => Array.isArray(s.sets) && s.sets.some(st => st.weight !== null && st.weight !== undefined));
      if (!newestSession) continue;

      const dateStr = newestSession.date && newestSession.time
        ? `${newestSession.date}T${newestSession.time}:00.000Z`
        : (newestSession.date || new Date().toISOString());

      // Save each set
      newestSession.sets.forEach((set, sIdx) => {
        if (set.weight !== null && set.weight !== undefined && (set.done === undefined || set.done === true)) {
          const setIndexToSave = (set.setIndex !== undefined && set.setIndex !== null) ? (set.setIndex - 1) : sIdx;
          this.saveLastRecord(newestSession.exerciseId, setIndexToSave, set.weight, set.actualReps, dateStr, true);
        }
      });
      healedCount++;
    }

    return { success: true, healedCount };
  },

  // Heal and restore all exercises from true historical workout sessions
  healAllRecordsFromHistory() {
    this.healCanonicalRecords();
    const sessions = this.getHistory();
    if (!sessions || sessions.length === 0) return { success: true, healedCount: 0 };

    let healedCount = 0;
    const seen = new Set();
    for (const s of sessions) {
      if (!Array.isArray(s.exercises)) continue;
      const dateStr = s.date && s.time ? `${s.date}T${s.time}:00.000Z` : (s.date || new Date().toISOString());
      for (const ex of s.exercises) {
        if (!Array.isArray(ex.sets)) continue;
        for (const set of ex.sets) {
          const sIdx = (set.setIndex !== undefined && set.setIndex !== null) ? (set.setIndex - 1) : 0;
          const key = `${ex.id}_${sIdx}`;
          if (!seen.has(key) && (set.done === undefined || set.done === true) && set.weight !== null && set.weight !== undefined) {
            this.saveLastRecord(ex.id, sIdx, set.weight, set.actualReps, dateStr, true);
            seen.add(key);
            healedCount++;
          }
        }
      }
    }
    return { success: true, healedCount };
  },

  // Backup and import operations
  importBackupData({ sessions = [], bodyWeights = [], dedupe = true, sourceFormat = 'json_gym' }) {
    const checkExisting = db.prepare('SELECT id FROM workout_sessions WHERE date = ? AND time = ?');
    const insertSession = db.prepare(`
      INSERT INTO workout_sessions (id, date, time, day_key, day_title, total_sets_done, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertExercise = db.prepare(`
      INSERT INTO session_exercises (session_id, exercise_id, exercise_name, category, canonical_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertSet = db.prepare(`
      INSERT INTO session_sets (session_exercise_id, set_index, type, target, weight, actual_reps, done, rir)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertLog = db.prepare(`
      INSERT INTO backup_logs (source_format, sessions_count, sets_count, skipped_count, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertBodyWeight = db.prepare(`
      INSERT INTO body_weights (date, weight, note, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        weight = excluded.weight,
        note = excluded.note,
        updated_at = excluded.updated_at
    `);

    let sessionsImported = 0;
    let setsImported = 0;
    let duplicatesSkipped = 0;
    let bodyWeightsImported = 0;

    const runAtomic = db.transaction(() => {
      // 1. Process sessions
      for (const s of sessions) {
        if (!s.date || typeof s.date !== 'string') {
          throw new Error('Missing or invalid session date');
        }
        const time = s.time ? String(s.time) : '12:00:00';

        if (dedupe) {
          const exists = checkExisting.get(s.date, time);
          if (exists) {
            duplicatesSkipped++;
            continue;
          }
        }

        const sessionId = s.id ? String(s.id) : `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const dayKey = s.dayKey ? String(s.dayKey) : 'day1';
        const dayTitle = s.dayTitle ? String(s.dayTitle) : 'Workout Session';
        const totalSets = Number(s.totalSetsDone) || 0;
        const createdAt = s.createdAt || new Date().toISOString();

        insertSession.run(sessionId, s.date, time, dayKey, dayTitle, totalSets, createdAt);
        sessionsImported++;

        for (const ex of (s.exercises || [])) {
          const exName = ex.exerciseName || ex.name || 'Exercise';
          const exId = ex.exerciseId || ex.id || exName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'ex';
          const cat = ex.category ? String(ex.category) : 'General';
          const canon = ex.canonicalId || getCanonicalExerciseId(exId);

          const exResult = insertExercise.run(sessionId, exId, exName, cat, canon);
          const sessionExerciseId = exResult.lastInsertRowid;

          for (const set of (ex.sets || [])) {
            const w = Number(set.weight);
            if (!Number.isFinite(w) || w < 0) {
              throw new Error(`Invalid set weight: ${set.weight}`);
            }
            const reps = Number(set.actualReps !== undefined ? set.actualReps : set.reps);
            if (!Number.isInteger(reps) || reps < 0) {
              throw new Error(`Invalid set reps: ${reps}`);
            }

            const setIdx = Number.isInteger(Number(set.setIndex)) ? Number(set.setIndex) : 0;
            const setType = set.type ? String(set.type) : 'work';
            const target = set.target ? String(set.target) : String(reps);
            const done = set.done ? 1 : 0;
            const rir = (set.rir !== undefined && set.rir !== null && set.rir !== '') ? Number(set.rir) : null;

            insertSet.run(sessionExerciseId, setIdx, setType, target, w, reps, done, rir);
            setsImported++;
          }
        }
      }

      // 2. Process body weights
      for (const bw of bodyWeights) {
        if (!bw.date || typeof bw.date !== 'string') continue;
        const w = Number(bw.weight);
        if (!Number.isFinite(w) || w <= 0) continue;
        const note = bw.note ? String(bw.note) : '';
        const now = new Date().toISOString();
        insertBodyWeight.run(bw.date, w, note, now);
        bodyWeightsImported++;
      }

      // 3. Log backup
      insertLog.run(sourceFormat, sessionsImported, setsImported, duplicatesSkipped, 'success');
    });

    runAtomic();

    return {
      success: true,
      sessionsImported,
      setsImported,
      duplicatesSkipped,
      bodyWeightsImported
    };
  },

  getBackupLogs(limit = 10) {
    return db.prepare('SELECT * FROM backup_logs ORDER BY imported_at DESC LIMIT ?').all(limit);
  },

  // Persistent exercise machine setup and form cues
  getExerciseSetupNote(exerciseId) {
    if (!exerciseId || typeof exerciseId !== 'string') {
      return {
        exerciseId: String(exerciseId || ''),
        pinSetting: '',
        formCues: '',
        generalNote: '',
        updatedAt: null
      };
    }
    const cleanId = exerciseId.trim();
    const row = db.prepare('SELECT exercise_id, pin_setting, form_cues, general_note, updated_at FROM exercise_setup_notes WHERE exercise_id = ?').get(cleanId);
    if (!row) {
      return {
        exerciseId: cleanId,
        pinSetting: '',
        formCues: '',
        generalNote: '',
        updatedAt: null
      };
    }
    return {
      exerciseId: row.exercise_id,
      pinSetting: row.pin_setting !== null && row.pin_setting !== undefined ? String(row.pin_setting) : '',
      formCues: row.form_cues !== null && row.form_cues !== undefined ? String(row.form_cues) : '',
      generalNote: row.general_note !== null && row.general_note !== undefined ? String(row.general_note) : '',
      updatedAt: row.updated_at || null
    };
  },

  saveExerciseSetupNote(data) {
    const exerciseId = String(data.exerciseId || data.exercise_id || '').trim();
    if (!exerciseId) {
      throw new Error('exerciseId is required');
    }
    const pinSetting = data.pinSetting !== undefined && data.pinSetting !== null
      ? String(data.pinSetting)
      : (data.pin_setting !== undefined && data.pin_setting !== null ? String(data.pin_setting) : '');
    const formCues = data.formCues !== undefined && data.formCues !== null
      ? String(data.formCues)
      : (data.form_cues !== undefined && data.form_cues !== null ? String(data.form_cues) : '');
    const generalNote = data.generalNote !== undefined && data.generalNote !== null
      ? String(data.generalNote)
      : (data.general_note !== undefined && data.general_note !== null ? String(data.general_note) : '');
    const updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();

    db.prepare(`
      INSERT INTO exercise_setup_notes (exercise_id, pin_setting, form_cues, general_note, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(exercise_id) DO UPDATE SET
        pin_setting = excluded.pin_setting,
        form_cues = excluded.form_cues,
        general_note = excluded.general_note,
        updated_at = excluded.updated_at
    `).run(exerciseId, pinSetting, formCues, generalNote, updatedAt);

    return {
      exerciseId,
      pinSetting,
      formCues,
      generalNote,
      updatedAt
    };
  },

  getAllExerciseSetupNotes() {
    const rows = db.prepare('SELECT exercise_id, pin_setting, form_cues, general_note, updated_at FROM exercise_setup_notes ORDER BY updated_at DESC').all();
    return rows.map(r => ({
      exerciseId: r.exercise_id,
      pinSetting: r.pin_setting || '',
      formCues: r.form_cues || '',
      generalNote: r.general_note || '',
      updatedAt: r.updated_at || null
    }));
  },

  deleteExerciseSetupNote(exerciseId) {
    if (!exerciseId) return false;
    const info = db.prepare('DELETE FROM exercise_setup_notes WHERE exercise_id = ?').run(String(exerciseId).trim());
    return info.changes > 0;
  }
};

// Run healing pass on DB initialization
try {
  repo.healCanonicalRecords();
} catch (e) {
  console.error('Error healing canonical records:', e.message);
}

module.exports = repo;
