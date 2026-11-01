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

// Repository helpers
const repo = {
  db,
  getDbPath: () => DB_PATH,

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
  getLastWeights() {
    const rows = db.prepare('SELECT exercise_id, set_index, weight, reps, updated_at FROM exercise_last_weights').all();
    const result = {};
    for (const r of rows) {
      if (!result[r.exercise_id]) result[r.exercise_id] = {};
      result[r.exercise_id][`wt_${r.set_index}`] = r.weight;
      if (r.reps !== null && r.reps !== undefined) {
        result[r.exercise_id][`reps_${r.set_index}`] = r.reps;
      }
      result[r.exercise_id].updatedAt = r.updated_at;
    }
    return result;
  },

  saveLastRecord(exerciseId, setIndex, weight, reps) {
    const dateStr = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      INSERT INTO exercise_last_weights (exercise_id, set_index, weight, reps, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(exercise_id, set_index) DO UPDATE SET
        weight = excluded.weight,
        reps = COALESCE(excluded.reps, exercise_last_weights.reps),
        updated_at = excluded.updated_at
    `);
    stmt.run(
      exerciseId,
      setIndex,
      Number(weight) || 0,
      reps !== undefined && reps !== '' && reps !== null ? Number(reps) : null,
      dateStr
    );
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

  saveSession(session) {
    const insertSession = db.prepare(`
      INSERT INTO workout_sessions (id, date, time, day_key, day_title, total_sets_done)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertExercise = db.prepare(`
      INSERT INTO session_exercises (session_id, exercise_id, exercise_name, category)
      VALUES (?, ?, ?, ?)
    `);

    const insertSet = db.prepare(`
      INSERT INTO session_sets (session_exercise_id, set_index, type, target, weight, actual_reps, done)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
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
          const exInfo = insertExercise.run(session.id, ex.id, ex.name, ex.category || '');
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

              // Persist to last record
              if (wt !== null || reps !== null) {
                this.saveLastRecord(ex.id, set.setIndex - 1, wt || 0, reps);
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
