const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const repo = require('./db');

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
    const { dayKey, state, weights } = req.body;
    if (dayKey && state) {
      repo.saveDraft(dayKey, state);
    }
    if (weights && typeof weights === 'object') {
      for (const [exId, wObj] of Object.entries(weights)) {
        for (const [k, v] of Object.entries(wObj)) {
          if (k.startsWith('wt_') && v !== '' && v !== undefined) {
            const setIdx = parseInt(k.replace('wt_', ''), 10);
            if (!isNaN(setIdx)) {
              const repsVal = wObj[`reps_${setIdx}`];
              repo.saveLastRecord(exId, setIdx, v, repsVal);
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
