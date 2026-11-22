const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const repo = require('./db');
const recovery = require('./recovery');
const { withPr } = require('./exercise-stats');
const volume = require('./volume');
const advice = require('./advice');
const supersets = require('./supersets');
const monthly = require('./monthly');
const exerciseRest = require('./exercise-rest');
const calendar = require('./calendar');
const progression = require('./exercise-progression');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Full state sync
app.get('/api/state', (req, res) => {
  try {
    const drafts = repo.getAllDrafts();
    const lastWeights = repo.getLastWeights();
    const todos = repo.getTodos();
    res.json({ drafts, lastWeights, todos });
  } catch (err) {
    console.error('Error fetching state:', err);
    res.status(500).json({ error: err.message });
  }
});

// Save draft & weights
app.post('/api/state', (req, res) => {
  try {
    const { dayKey, state } = req.body;
    if (dayKey && state) {
      // 1. Separate daily_draft_state strictly for draft storage
      repo.saveDraft(dayKey, state);

      // 2. Only record to exercise_last_weights if that specific set is completed (toggled done)
      // Strictly forbid updating exercise_last_weights from draft weights typed in-progress
      if (typeof state === 'object') {
        const nowIso = new Date().toISOString();
        for (const [exId, sObj] of Object.entries(state)) {
          if (!sObj || typeof sObj !== 'object') continue;
          for (const [k, isDone] of Object.entries(sObj)) {
            // Check if set is marked as completed (e.g. set_0: true, set_1: true)
            if (k.startsWith('set_') && Boolean(isDone)) {
              const setIdx = parseInt(k.replace('set_', ''), 10);
              if (!isNaN(setIdx)) {
                const v = sObj[`wt_${setIdx}`];
                const repsVal = sObj[`reps_${setIdx}`];
                if (v !== '' && v !== undefined && v !== null) {
                  const objUpdatedAt = sObj.updatedAt || nowIso;
                  repo.saveLastRecord(exId, setIdx, v, repsVal, objUpdatedAt);
                }
              }
            }
          }
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving state:', err);
    res.status(500).json({ error: err.message });
  }
});

// Heal canonical records endpoint
app.post('/api/heal-canonical', (req, res) => {
  try {
    const result = repo.healCanonicalRecords();
    res.json(result);
  } catch (err) {
    console.error('Error healing canonical records:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reset day draft
app.post('/api/reset-day', (req, res) => {
  try {
    const { dayKey } = req.body;
    if (dayKey) {
      repo.clearDraft(dayKey);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error resetting day draft:', err);
    res.status(500).json({ error: err.message });
  }
});

// Workout History
app.get('/api/history', (req, res) => {
  try {
    const history = repo.getHistory();
    res.json(history);
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/history', (req, res) => {
  try {
    const result = repo.saveSession(req.body);
    res.json(result);
  } catch (err) {
    console.error('Error saving session:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/history/:id', (req, res) => {
  try {
    const result = repo.deleteSession(req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Error deleting session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cross-Day Unified Exercise History
app.get('/api/exercises/:id/history', (req, res) => {
  try {
    const history = repo.getExerciseHistory(req.params.id);
    res.json(withPr(history));
  } catch (err) {
    console.error('Error fetching exercise history:', err);
    res.status(500).json({ error: err.message });
  }
});

// History-based weight advice for the next working set (read-only). Rule: server/advice.js
app.get('/api/exercises/:id/advice', (req, res) => {
  try {
    const parsed = Number.parseInt(req.query.n, 10);
    const lastN = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, advice.MAX_LAST_N) : advice.DEFAULT_LAST_N;
    const history = repo.getExerciseHistory(req.params.id);
    res.json({ exerciseId: req.params.id, ...advice.buildAdvice(history, { lastN }) });
  } catch (err) {
    console.error('Error computing exercise advice:', err);
    res.status(500).json({ error: err.message });
  }
});

// Per-Exercise Progression Chart & Strength Curve
app.get('/api/exercises/:id/progression', (req, res) => {
  try {
    const exerciseId = req.params.id;
    if (!exerciseId) {
      return res.status(400).json({ error: 'Exercise ID is required' });
    }

    let limit = 20;
    if (req.query.limit !== undefined && req.query.limit !== null && req.query.limit !== '') {
      const parsed = Number(req.query.limit);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
        return res.status(400).json({ error: 'limit must be an integer between 1 and 50' });
      }
      limit = parsed;
    }

    const history = repo.getExerciseHistory(exerciseId);
    const goal = repo.getExerciseGoal(exerciseId);
    res.json(progression.buildProgression(exerciseId, history, goal, limit));
  } catch (err) {
    console.error('Error fetching exercise progression:', err);
    res.status(500).json({ error: err.message });
  }
});

const handleSetExerciseGoal = (req, res) => {
  try {
    const exerciseId = req.params.id;
    if (!exerciseId) {
      return res.status(400).json({ error: 'Exercise ID is required' });
    }

    const body = req.body || {};
    const { targetWeight, targetReps, notes } = body;

    if (targetWeight === undefined || targetWeight === null || targetWeight === '') {
      return res.status(400).json({ error: 'targetWeight is required' });
    }
    const tw = Number(targetWeight);
    if (!Number.isFinite(tw) || tw <= 0 || tw > 1000) {
      return res.status(400).json({ error: 'targetWeight must be a positive number up to 1000' });
    }

    let tr = 1;
    if (targetReps !== undefined) {
      const parsedReps = Number(targetReps);
      if (targetReps === null || targetReps === '' || !Number.isInteger(parsedReps) || parsedReps < 1 || parsedReps > 100) {
        return res.status(400).json({ error: 'targetReps must be an integer between 1 and 100' });
      }
      tr = parsedReps;
    }

    const result = repo.setExerciseGoal(exerciseId, {
      targetWeight: tw,
      targetReps: tr,
      notes: notes || ''
    });

    res.json(result);
  } catch (err) {
    console.error('Error setting exercise goal:', err);
    res.status(500).json({ error: err.message });
  }
};

app.put('/api/exercises/:id/goal', handleSetExerciseGoal);
app.post('/api/exercises/:id/goal', handleSetExerciseGoal);

// Muscle fatigue & recovery (SPEC §2.3). Derived from completed sets; no new tables.
app.get('/api/recovery', (req, res) => {
  try {
    res.json(recovery.buildRecovery(repo.getCompletedSetRows(), Date.now()));
  } catch (err) {
    console.error('Error computing recovery:', err);
    res.status(500).json({ error: err.message });
  }
});

// Weekly training volume per muscle and per exercise, last 8 weeks (completed sets only)
app.get('/api/volume/weekly', (req, res) => {
  try {
    res.json(volume.buildWeeklyVolume(repo.getCompletedSetVolumeRows(), Date.now()));
  } catch (err) {
    console.error('Error computing weekly volume:', err);
    res.status(500).json({ error: err.message });
  }
});

// Exercise supersets (per workout day). Rules live in server/db.js and server/supersets.js.
// GET    /api/supersets?dayKey=mon                       -> { dayKey, groups: [{ groupId, dayKey, exerciseIds }] }
// POST   /api/supersets  { dayKey, exerciseIds: [..2+] } -> 201 { groupId, dayKey, exerciseIds }
// DELETE /api/supersets/:groupId/exercises/:exerciseId   -> { groupId, dayKey, exerciseIds, dissolved }
function sendSupersetError(res, err) {
  const status = err && err.status ? err.status : 500;
  if (status === 500) console.error('Superset error:', err);
  res.status(status).json({ error: err.message });
}

app.get('/api/supersets', (req, res) => {
  try {
    const dayKey = supersets.validateDayKey(req.query.dayKey);
    res.json({ dayKey, groups: repo.getSupersets(dayKey) });
  } catch (err) {
    sendSupersetError(res, err);
  }
});

app.post('/api/supersets', (req, res) => {
  try {
    const input = supersets.validateCreateInput(req.body);
    const group = repo.createSuperset(input.dayKey, input.exerciseIds);
    res.status(201).json(group);
  } catch (err) {
    sendSupersetError(res, err);
  }
});

app.delete('/api/supersets/:groupId/exercises/:exerciseId', (req, res) => {
  try {
    res.json(repo.removeSupersetMember(req.params.groupId, req.params.exerciseId));
  } catch (err) {
    sendSupersetError(res, err);
  }
});

// Monthly summary (read-only): GET /api/summary/monthly?month=YYYY-MM -> rules in server/monthly.js
app.get('/api/summary/monthly', (req, res) => {
  try {
    const month = monthly.validateMonth(req.query.month);
    res.json(monthly.buildMonthlySummary(repo.getHistory(), month));
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    if (status === 500) console.error('Error computing monthly summary:', err);
    res.status(status).json({ error: err.message });
  }
});

// Custom rest seconds per exercise (synced across devices).
// GET  /api/exercise-rest            -> { "<exerciseId>": 120, ... }
// PUT  /api/exercise-rest/:exerciseId { seconds: 120 } -> { success, exerciseId, seconds }
app.get('/api/exercise-rest', (req, res) => {
  try {
    res.json(repo.getExerciseRest());
  } catch (err) {
    console.error('Error reading exercise rest:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/exercise-rest/:exerciseId', (req, res) => {
  try {
    const exerciseId = exerciseRest.validateExerciseId(req.params.exerciseId);
    const seconds = exerciseRest.validateSeconds(req.body && req.body.seconds);
    res.json(repo.saveExerciseRest(exerciseId, seconds));
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    if (status === 500) console.error('Error saving exercise rest:', err);
    res.status(status).json({ error: err.message });
  }
});

// Gym profiles (plate inventory and barbell defaults per gym).
// GET    /api/gym-profiles            -> [ { id, name, plate_inventory, default_bar_weight, updated_at }, ... ]
// GET    /api/gym-profiles/:id        -> { id, name, plate_inventory, default_bar_weight, updated_at }
// POST   /api/gym-profiles            -> 201 (create) or 200 (update if id provided)
// PUT    /api/gym-profiles/:id        -> 200 (update)
// DELETE /api/gym-profiles/:id        -> 200 { success: true, id }
function validateGymProfile(body, { requireName = true } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const err = new Error('Request body must be a JSON object');
    err.status = 400;
    throw err;
  }

  // Name
  let name;
  if (body.name !== undefined) {
    if (typeof body.name !== 'string') {
      const err = new Error('name must be a string');
      err.status = 400;
      throw err;
    }
    const trimmed = body.name.trim();
    if (trimmed.length === 0) {
      const err = new Error('name cannot be empty');
      err.status = 400;
      throw err;
    }
    if (trimmed.length > 100) {
      const err = new Error('name must be at most 100 characters');
      err.status = 400;
      throw err;
    }
    name = trimmed;
  } else if (requireName) {
    const err = new Error('name is required');
    err.status = 400;
    throw err;
  }

  // Plate inventory
  let plateInventory = {};
  const rawInv = body.plate_inventory !== undefined ? body.plate_inventory : body.plateInventory;
  if (rawInv !== undefined && rawInv !== null) {
    if (typeof rawInv === 'string') {
      try {
        plateInventory = JSON.parse(rawInv);
      } catch (e) {
        const err = new Error('plate_inventory must be valid JSON');
        err.status = 400;
        throw err;
      }
    } else if (typeof rawInv === 'object' && !Array.isArray(rawInv)) {
      plateInventory = rawInv;
    } else {
      const err = new Error('plate_inventory must be a JSON object or valid JSON string');
      err.status = 400;
      throw err;
    }

    if (typeof plateInventory !== 'object' || plateInventory === null || Array.isArray(plateInventory)) {
      const err = new Error('plate_inventory must be an object');
      err.status = 400;
      throw err;
    }
  }

  // Default bar weight
  let defaultBarWeight = 20;
  const rawBar = body.default_bar_weight !== undefined ? body.default_bar_weight : body.defaultBarWeight;
  if (rawBar !== undefined && rawBar !== null) {
    const num = Number(rawBar);
    if (!Number.isFinite(num) || num < 0 || num > 500) {
      const err = new Error('default_bar_weight must be a number between 0 and 500');
      err.status = 400;
      throw err;
    }
    defaultBarWeight = num;
  }

  // ID
  let id;
  if (body.id !== undefined && body.id !== null) {
    const numId = Number(body.id);
    if (!Number.isInteger(numId) || numId <= 0) {
      const err = new Error('id must be a positive integer');
      err.status = 400;
      throw err;
    }
    id = numId;
  }

  return {
    id,
    name,
    plate_inventory: plateInventory,
    default_bar_weight: defaultBarWeight
  };
}

app.get('/api/gym-profiles', (req, res) => {
  try {
    res.json(repo.getGymProfiles());
  } catch (err) {
    console.error('Error reading gym profiles:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gym-profiles/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id must be a positive integer' });
    }
    const profile = repo.getGymProfileById(id);
    if (!profile) {
      return res.status(404).json({ error: 'Gym profile not found' });
    }
    res.json(profile);
  } catch (err) {
    console.error('Error fetching gym profile:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gym-profiles', (req, res) => {
  try {
    const input = validateGymProfile(req.body);
    const isUpdate = Boolean(input.id && repo.getGymProfileById(input.id));
    const saved = repo.saveGymProfile(input);
    res.status(isUpdate ? 200 : 201).json(saved);
  } catch (err) {
    const status = err && err.status ? err.status : 400;
    if (status === 500) console.error('Error saving gym profile:', err);
    res.status(status).json({ error: err.message });
  }
});

app.put('/api/gym-profiles/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id must be a positive integer' });
    }
    const existing = repo.getGymProfileById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Gym profile not found' });
    }
    const input = validateGymProfile({ ...req.body, id });
    const saved = repo.saveGymProfile(input);
    res.json(saved);
  } catch (err) {
    const status = err && err.status ? err.status : 400;
    if (status === 500) console.error('Error updating gym profile:', err);
    res.status(status).json({ error: err.message });
  }
});

app.delete('/api/gym-profiles/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id must be a positive integer' });
    }
    const result = repo.deleteGymProfile(id);
    if (!result.success) {
      return res.status(404).json({ error: 'Gym profile not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('Error deleting gym profile:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/gym-profiles', (req, res) => {
  try {
    const rawId = req.body && req.body.id;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id must be a positive integer' });
    }
    const result = repo.deleteGymProfile(id);
    if (!result.success) {
      return res.status(404).json({ error: 'Gym profile not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('Error deleting gym profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// Body Weight Tracker & Daily Trend (parity with Strong/Hevy/FitNotes).
// GET    /api/body-weights            -> 200 [ { date, weight, note, updated_at } ] ORDER BY date DESC
// GET    /api/body-weights/:date      -> 200 { date, weight, note, updated_at } or 404
// POST   /api/body-weights            -> 201 (new) or 200 (upsert existing date)
// DELETE /api/body-weights/:date      -> 200 { success: true, date } or 404

function validateDateString(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const d = parseInt(dayStr, 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  return (
    dateObj.getUTCFullYear() === y &&
    dateObj.getUTCMonth() === m - 1 &&
    dateObj.getUTCDate() === d
  );
}

function validateBodyWeight(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const err = new Error('Request body must be a JSON object');
    err.status = 400;
    throw err;
  }

  // Date
  if (typeof body.date !== 'string' || !validateDateString(body.date)) {
    const err = new Error('date must be a valid calendar date in YYYY-MM-DD format');
    err.status = 400;
    throw err;
  }

  // Weight
  if (body.weight === undefined || body.weight === null || body.weight === '') {
    const err = new Error('weight is required');
    err.status = 400;
    throw err;
  }
  const weight = Number(body.weight);
  if (!Number.isFinite(weight) || weight < 20 || weight > 300) {
    const err = new Error('weight must be a finite number between 20 and 300 kg');
    err.status = 400;
    throw err;
  }

  // Note
  let note = '';
  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note !== 'string') {
      const err = new Error('note must be a string');
      err.status = 400;
      throw err;
    }
    if (body.note.length > 500) {
      const err = new Error('note must be at most 500 characters');
      err.status = 400;
      throw err;
    }
    note = body.note;
  }

  return {
    date: body.date,
    weight,
    note
  };
}

app.get('/api/body-weights', (req, res) => {
  try {
    res.json(repo.getBodyWeights());
  } catch (err) {
    console.error('Error reading body weights:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/body-weights/:date', (req, res) => {
  try {
    const date = req.params.date;
    if (!validateDateString(date)) {
      return res.status(400).json({ error: 'date must be a valid calendar date in YYYY-MM-DD format' });
    }
    const item = repo.getBodyWeightByDate(date);
    if (!item) {
      return res.status(404).json({ error: 'Body weight record not found' });
    }
    res.json(item);
  } catch (err) {
    console.error('Error fetching body weight:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/body-weights', (req, res) => {
  try {
    const input = validateBodyWeight(req.body);
    const result = repo.saveBodyWeight(input);
    res.status(result.isUpdate ? 200 : 201).json(result.record);
  } catch (err) {
    const status = err && err.status ? err.status : 400;
    if (status === 500) console.error('Error saving body weight:', err);
    res.status(status).json({ error: err.message });
  }
});

app.delete('/api/body-weights/:date', (req, res) => {
  try {
    const date = req.params.date;
    if (!validateDateString(date)) {
      return res.status(400).json({ error: 'date must be a valid calendar date in YYYY-MM-DD format' });
    }
    const result = repo.deleteBodyWeight(date);
    if (!result.success) {
      return res.status(404).json({ error: 'Body weight record not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('Error deleting body weight:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/body-weights', (req, res) => {
  try {
    const date = req.body && req.body.date;
    if (!validateDateString(date)) {
      return res.status(400).json({ error: 'date must be a valid calendar date in YYYY-MM-DD format' });
    }
    const result = repo.deleteBodyWeight(date);
    if (!result.success) {
      return res.status(404).json({ error: 'Body weight record not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('Error deleting body weight:', err);
    res.status(500).json({ error: err.message });
  }
});

// Training Calendar & Consistency Streak (read-only calendar + weekly goal).
// GET  /api/calendar/month?year=YYYY&month=M -> month grid & workout days
// GET  /api/calendar/streak                  -> streak & weekly target progress
// PUT  /api/calendar/target                  -> set weekly target days (1-7)

app.get('/api/calendar/month', (req, res) => {
  try {
    const { year, month } = calendar.validateYearMonth(req.query.year, req.query.month);
    const prefix = `${year}-${String(month).padStart(2, '0')}-`;
    res.json(calendar.buildMonthData(repo.getSessionsByMonth(prefix), year, month));
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    if (status === 500) console.error('Error building calendar month:', err);
    res.status(status).json({ error: err.message });
  }
});

app.get('/api/calendar/streak', (req, res) => {
  try {
    res.json(calendar.buildStreak(repo.getWorkoutDates(), repo.getWeeklyTarget(), new Date()));
  } catch (err) {
    console.error('Error building streak:', err);
    res.status(500).json({ error: err.message });
  }
});

const saveWeeklyTarget = (req, res) => {
  try {
    const weeklyTarget = calendar.validateWeeklyTarget(req.body);
    res.json(repo.setWeeklyTarget(weeklyTarget));
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    if (status === 500) console.error('Error saving weekly target:', err);
    res.status(status).json({ error: err.message });
  }
};

app.put('/api/calendar/target', saveWeeklyTarget);
app.post('/api/calendar/target', saveWeeklyTarget);

// Todos
app.get('/api/todos', (req, res) => {
  try {
    const todos = repo.getTodos();
    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/todos', (req, res) => {
  try {
    const { todos } = req.body;
    const result = repo.saveTodos(todos);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download raw SQLite Database
app.get('/api/export/db', (req, res) => {
  try {
    const dbPath = repo.getDbPath();
    if (!fs.existsSync(dbPath)) {
      return res.status(404).send('Database file not found');
    }
    const filename = `gym-backup-${new Date().toISOString().split('T')[0]}.db`;
    res.download(dbPath, filename);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static assets from public/ and dist/
const PUBLIC_DIR = path.resolve(__dirname, '../public');
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}

// Serve frontend build if dist/ exists
const DIST_DIR = path.resolve(__dirname, '../dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
}

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Atiwitch Workout Server running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
