const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const repo = require('./db');
const recovery = require('./recovery');
const { withPr } = require('./exercise-stats');

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

// Muscle fatigue & recovery (SPEC §2.3). Derived from completed sets; no new tables.
app.get('/api/recovery', (req, res) => {
  try {
    res.json(recovery.buildRecovery(repo.getCompletedSetRows(), Date.now()));
  } catch (err) {
    console.error('Error computing recovery:', err);
    res.status(500).json({ error: err.message });
  }
});

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
