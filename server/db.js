const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'gym.db');
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

// Canonical Exercise Mapping (shared across days between main lifts and bonus touch-ups)
const CANONICAL_MAP = {
  // Shoulder Press Machine (Thursday Main <-> Mon/Tue/Wed Bonus)
  th1: 'shoulder_press',
  b_m_shoulder: 'shoulder_press',
  b_t_shoulder: 'shoulder_press',
  b_w_shoulder: 'shoulder_press',

  // Chest Press Machine (Tuesday Main <-> Mon/Wed/Thu Bonus)
  t1: 'chest_press',
  b_m_chest: 'chest_press',
  b_w_chest: 'chest_press',
  b_th_chest: 'chest_press',

  // Lat Pulldown Machine (Wednesday Main <-> Mon/Tue/Thu Bonus)
  w2: 'lat_pulldown',
  b_m_back: 'lat_pulldown',
  b_t_back: 'lat_pulldown',
  b_th_back: 'lat_pulldown',

  // Seated Leg Press Machine (Monday Main <-> Tue/Wed/Thu Bonus)
  m1: 'seated_leg_press',
  b_t_leg: 'seated_leg_press',
  b_w_leg: 'seated_leg_press',
  b_th_leg: 'seated_leg_press'
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
      result[r.exercise_id].updatedAt = r.updated_at;
      if (r.canonical_id) {
        result[r.exercise_id].canonicalId = r.canonical_id;
      }
    }
    return result;
  },

  saveLastRecord(exerciseId, setIndex, weight, reps, updatedAt = null) {
    const dateStr = updatedAt || new Date().toISOString();
    const canon = getCanonicalExerciseId(exerciseId);
    const linkedIds = getLinkedExerciseIds(exerciseId);

    const stmt = db.prepare(`
      INSERT INTO exercise_last_weights (exercise_id, set_index, weight, reps, updated_at, canonical_id)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(exercise_id, set_index) DO UPDATE SET
        weight = excluded.weight,
        reps = COALESCE(excluded.reps, exercise_last_weights.reps),
        updated_at = excluded.updated_at,
        canonical_id = excluded.canonical_id
    `);

    const wNum = Number(weight) || 0;
    const rNum = reps !== undefined && reps !== '' && reps !== null ? Number(reps) : null;

    // 1. Save directly for the exercise
    stmt.run(exerciseId, setIndex, wNum, rNum, dateStr, canon);

    // 2. Save directly under the canonical ID for centralized queries
    stmt.run(canon, setIndex, wNum, rNum, dateStr, canon);

    // 3. Atomically propagate to all linked peer exercises across days
    // e.g., b_m_shoulder (Monday Bonus) <-> th1 (Thursday Main)
    for (const targetId of linkedIds) {
      if (targetId === exerciseId) continue;

      if (setIndex === 0) {
        // Warmup set links to warmup set (set_index = 0)
        stmt.run(targetId, 0, wNum, rNum, dateStr, canon);
      } else {
        // Working set / touchup set
        stmt.run(targetId, setIndex, wNum, rNum, dateStr, canon);

        // If target is a main lift (e.g. th1, t1, w2, m1) and source is a bonus touchup (set 1),
        // seed/sync sets 1, 2, and 3 so all working sets on the main day have this latest record!
        if (['th1', 't1', 'w2', 'm1'].includes(targetId)) {
          stmt.run(targetId, 1, wNum, rNum, dateStr, canon);
          stmt.run(targetId, 2, wNum, rNum, dateStr, canon);
          stmt.run(targetId, 3, wNum, rNum, dateStr, canon);
        } else {
          // Target is a bonus touchup exercise (which reads set_index = 1)
          stmt.run(targetId, 1, wNum, rNum, dateStr, canon);
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
          done: Boolean(set.done)
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
        done: Boolean(s.done)
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
      INSERT INTO session_sets (session_exercise_id, set_index, type, target, weight, actual_reps, done)
      VALUES (?, ?, ?, ?, ?, ?, ?)
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
              const wt = (set.weight !== undefined && set.weight !== '') ? Number(set.weight) : null;
              const reps = (set.actualReps !== undefined && set.actualReps !== '') ? Number(set.actualReps) : null;

              insertSet.run(
                exerciseRowId,
                set.setIndex,
                set.type,
                set.target,
                wt,
                reps,
                set.done ? 1 : 0
              );

              // Persist to last record with bidirectional cross-day propagation
              if (wt !== null || reps !== null) {
                this.saveLastRecord(ex.id, set.setIndex - 1, wt || 0, reps, session.date);
              }
            }
          }
        }
      }
    });

    transaction();
    return { success: true, id: session.id };
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
  }
};

module.exports = repo;
