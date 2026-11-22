// Universal Workout Data Import & Export engine.
// Handles JSON export/import and CSV parsing for Strong, Hevy, and GYM formats.
// Pure logic + helpers; SQLite transaction is performed via repo.importBackupData.

/**
 * Robust RFC-4180 compliant CSV parser.
 * Supports quoted fields with commas, escaped quotes (""), and varied line breaks (\r\n, \n).
 */
function parseCSV(text) {
  if (typeof text !== 'string') return null;
  let clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  clean = clean.trim();
  if (!clean) return null;

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some(f => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return null;

  const headers = rows[0].map(h => h.toLowerCase().trim().replace(/^"/, '').replace(/"$/, ''));
  const data = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] !== undefined ? row[j].replace(/^"/, '').replace(/"$/, '').trim() : '';
    }
    data.push(obj);
  }

  return { headers, data };
}

/**
 * Flexible Date and Time parser supporting ISO, standard datetime, and date-only strings.
 */
function parseDateTime(str) {
  if (!str) return null;
  const s = String(str).trim().replace(/^"/, '').replace(/"$/, '');
  const matchIso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (matchIso) {
    const date = `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;
    const hh = matchIso[4] ? String(matchIso[4]).padStart(2, '0') : '12';
    const mm = matchIso[5] ? String(matchIso[5]).padStart(2, '0') : '00';
    const ss = matchIso[6] ? String(matchIso[6]).padStart(2, '0') : '00';
    return { date, time: `${hh}:${mm}:${ss}` };
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const iso = d.toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 19) };
  }
  return null;
}

/**
 * Helper to retrieve a value from a row given candidate header names.
 */
function getField(row, candidates) {
  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== null && row[c] !== '') {
      return row[c];
    }
  }
  return '';
}

/**
 * Detect source format from headers and parse CSV into normalized session structures.
 */
function parseCSVContent(csvText) {
  const parsed = parseCSV(csvText);
  if (!parsed || !parsed.data || parsed.data.length === 0) {
    throw new Error('CSV is empty or missing data rows');
  }

  const { headers, data } = parsed;

  let sourceFormat = 'csv_generic';
  if (headers.some(h => h.includes('exercise title') || h.includes('weight (kg)'))) {
    sourceFormat = 'csv_hevy';
  } else if (headers.some(h => h.includes('rpe') || h.includes('workout name'))) {
    sourceFormat = 'csv_strong';
  } else if (headers.some(h => h.includes('day key') || h.includes('day_key') || h.includes('category'))) {
    sourceFormat = 'csv_gym';
  }

  const sessionMap = new Map();

  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];

    const rawDate = getField(row, ['date', 'workout date', 'date/time']);
    const dt = parseDateTime(rawDate);
    if (!dt) {
      throw new Error(`Row ${rowIndex + 1}: Invalid or missing date`);
    }

    const rawWorkout = getField(row, ['workout name', 'workout_name', 'day title', 'day_title', 'routine name', 'title']) || 'Workout Session';
    const sessionKey = `${dt.date}_${dt.time}_${rawWorkout}`;

    if (!sessionMap.has(sessionKey)) {
      sessionMap.set(sessionKey, {
        id: `session_import_${Date.now()}_${sessionMap.size + 1}_${Math.random().toString(36).slice(2, 6)}`,
        date: dt.date,
        time: dt.time,
        dayKey: getField(row, ['day key', 'day_key']) || 'day1',
        dayTitle: rawWorkout,
        exercisesMap: new Map()
      });
    }

    const session = sessionMap.get(sessionKey);
    const exerciseName = getField(row, ['exercise title', 'exercise name', 'exercise_name', 'exercise_title', 'exercise']);
    if (!exerciseName) {
      throw new Error(`Row ${rowIndex + 1}: Missing exercise name`);
    }

    const category = getField(row, ['category']) || 'General';
    const exerciseId = getField(row, ['exercise id', 'exercise_id']) ||
      exerciseName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'ex';

    if (!session.exercisesMap.has(exerciseName)) {
      session.exercisesMap.set(exerciseName, {
        exerciseId,
        exerciseName,
        category,
        sets: []
      });
    }

    const ex = session.exercisesMap.get(exerciseName);

    // Validate weight
    const rawWeight = getField(row, ['weight (kg)', 'weight(kg)', 'weight_kg', 'weight', 'kg']);
    if (rawWeight === '' || rawWeight === null || rawWeight === undefined) {
      throw new Error(`Row ${rowIndex + 1}: Missing weight`);
    }
    const weight = Number(rawWeight);
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error(`Row ${rowIndex + 1}: Weight must be a non-negative number`);
    }

    // Validate reps
    const rawReps = getField(row, ['reps', 'reps done', 'actual reps', 'actual_reps']);
    if (rawReps === '' || rawReps === null || rawReps === undefined) {
      throw new Error(`Row ${rowIndex + 1}: Missing reps`);
    }
    const reps = Number(rawReps);
    if (!Number.isInteger(reps) || reps < 0) {
      throw new Error(`Row ${rowIndex + 1}: Reps must be a non-negative integer`);
    }

    // Set order / index
    const rawSetOrder = getField(row, ['set order', 'set_order', 'set index', 'set_index', 'set']);
    const setIndex = rawSetOrder !== '' && Number.isInteger(Number(rawSetOrder))
      ? Math.max(0, Number(rawSetOrder) - 1)
      : ex.sets.length;

    // Set type (warmup vs work)
    const rawType = getField(row, ['set type', 'set_type', 'type']).toLowerCase();
    const isWarm = rawType === 'warmup' || rawType === 'warm' || rawType === 'วอร์ม' || rawType.startsWith('w');
    const type = isWarm ? 'warm' : 'work';

    // RPE / RIR
    const rawRir = getField(row, ['rir']);
    const rawRpe = getField(row, ['rpe']);
    let rir = null;
    if (rawRir !== '') {
      const numRir = Number(rawRir);
      if (Number.isFinite(numRir)) rir = Math.max(0, Math.min(10, Math.round(numRir)));
    } else if (rawRpe !== '') {
      const numRpe = Number(rawRpe);
      if (Number.isFinite(numRpe) && numRpe >= 5 && numRpe <= 10) {
        rir = Math.max(0, Math.min(4, Math.round(10 - numRpe)));
      }
    }

    ex.sets.push({
      setIndex,
      type,
      target: String(reps),
      weight,
      actualReps: reps,
      done: 1,
      rir
    });
  }

  // Convert sessionMap to normalized sessions array
  const sessions = [];
  for (const s of sessionMap.values()) {
    const exercises = Array.from(s.exercisesMap.values());
    const totalSetsDone = exercises.reduce((sum, e) => sum + e.sets.filter(st => st.done).length, 0);
    sessions.push({
      id: s.id,
      date: s.date,
      time: s.time,
      dayKey: s.dayKey,
      dayTitle: s.dayTitle,
      totalSetsDone,
      exercises
    });
  }

  if (sessions.length === 0) {
    throw new Error('No valid sessions could be extracted from CSV');
  }

  return { sourceFormat, sessions, bodyWeights: [] };
}

/**
 * Parse JSON backup content into normalized structures.
 */
function parseJSONContent(raw) {
  let obj = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      throw new Error('Invalid JSON string');
    }
  }

  if (!obj || typeof obj !== 'object') {
    throw new Error('JSON content must be an object or array');
  }

  const rawSessions = Array.isArray(obj.sessions) ? obj.sessions : (Array.isArray(obj) ? obj : []);
  const bodyWeights = Array.isArray(obj.bodyWeights) ? obj.bodyWeights : [];

  if (rawSessions.length === 0 && bodyWeights.length === 0) {
    throw new Error('No sessions or body weights found in JSON');
  }

  const sessions = [];
  for (let sIdx = 0; sIdx < rawSessions.length; sIdx++) {
    const s = rawSessions[sIdx];
    if (!s || typeof s.date !== 'string') {
      throw new Error(`Session ${sIdx + 1}: Missing valid date`);
    }

    const dt = parseDateTime(s.date) || { date: s.date, time: s.time || '12:00:00' };
    const sessionId = s.id ? String(s.id) : `session_import_${Date.now()}_${sIdx + 1}`;
    const dayKey = s.dayKey ? String(s.dayKey) : 'day1';
    const dayTitle = s.dayTitle ? String(s.dayTitle) : 'Workout Session';

    const exercises = [];
    for (let eIdx = 0; eIdx < (s.exercises || []).length; eIdx++) {
      const ex = s.exercises[eIdx];
      const exName = ex.exerciseName || ex.name || 'Exercise';
      const exId = ex.exerciseId || ex.id || exName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'ex';
      const category = ex.category ? String(ex.category) : 'General';

      const sets = [];
      for (let stIdx = 0; stIdx < (ex.sets || []).length; stIdx++) {
        const st = ex.sets[stIdx];
        const w = Number(st.weight);
        if (!Number.isFinite(w) || w < 0) {
          throw new Error(`Session ${sIdx + 1}, Exercise ${eIdx + 1}, Set ${stIdx + 1}: Invalid weight`);
        }
        const reps = Number(st.actualReps !== undefined ? st.actualReps : st.reps);
        if (!Number.isInteger(reps) || reps < 0) {
          throw new Error(`Session ${sIdx + 1}, Exercise ${eIdx + 1}, Set ${stIdx + 1}: Invalid reps`);
        }

        sets.push({
          setIndex: Number.isInteger(Number(st.setIndex)) ? Number(st.setIndex) : stIdx,
          type: st.type ? String(st.type) : 'work',
          target: st.target ? String(st.target) : String(reps),
          weight: w,
          actualReps: reps,
          done: st.done ? 1 : 0,
          rir: st.rir !== undefined && st.rir !== null && st.rir !== '' ? Number(st.rir) : null
        });
      }

      exercises.push({
        exerciseId: exId,
        exerciseName: exName,
        category,
        sets
      });
    }

    const totalSetsDone = s.totalSetsDone !== undefined
      ? Number(s.totalSetsDone)
      : exercises.reduce((sum, e) => sum + e.sets.filter(st => st.done).length, 0);

    sessions.push({
      id: sessionId,
      date: dt.date,
      time: s.time || dt.time,
      dayKey,
      dayTitle,
      totalSetsDone,
      exercises
    });
  }

  return { sourceFormat: 'json_gym', sessions, bodyWeights };
}

/**
 * Build the full JSON backup object for GET /api/backup/export/json.
 */
function buildJsonExport(repo) {
  const history = repo.getHistory() || [];
  const sessions = history.map(s => ({
    id: s.id,
    date: s.date,
    time: s.time,
    dayKey: s.dayKey,
    dayTitle: s.dayTitle,
    totalSetsDone: s.totalSetsDone,
    exercises: (s.exercises || []).map(ex => ({
      exerciseId: ex.id || ex.exerciseId,
      exerciseName: ex.name || ex.exerciseName,
      category: ex.category,
      sets: (ex.sets || []).map(st => ({
        setIndex: st.setIndex,
        type: st.type,
        target: st.target,
        weight: Number(st.weight),
        actualReps: Number(st.actualReps),
        done: st.done ? 1 : 0,
        rir: st.rir !== undefined ? st.rir : null
      }))
    }))
  }));

  const bodyWeights = (repo.getBodyWeights ? repo.getBodyWeights() : []).map(bw => ({
    date: bw.date,
    weight: bw.weight,
    note: bw.note || ''
  }));

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions,
    bodyWeights
  };
}

module.exports = {
  parseCSV,
  parseDateTime,
  parseCSVContent,
  parseJSONContent,
  buildJsonExport
};
