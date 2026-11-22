// Personal Records Timeline & Set Records (read-only).
// Derives everything from existing workout history; no new tables.
const { calculateEstimated1RM } = require('./estimate');
const { isWarmupSet } = require('./exercise-stats');

const TYPES = {
  heaviestWeight: 'weight',
  bestE1rm: 'e1rm',
  bestSetVolume: 'setVolume',
  mostReps: 'reps'
};

function collectEntries(repo, exerciseId) {
  const history = typeof repo.getHistory === 'function' ? repo.getHistory() : [];
  const entries = [];
  for (const session of Array.isArray(history) ? history : []) {
    for (const ex of Array.isArray(session.exercises) ? session.exercises : []) {
      if (ex.id !== exerciseId && ex.canonicalId !== exerciseId) continue;
      for (const set of Array.isArray(ex.sets) ? ex.sets : []) {
        if (!set || !set.done || isWarmupSet(set)) continue;
        const weight = Number(set.weight);
        const reps = Number(set.actualReps);
        if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps <= 0) continue;
        const rir = set.rir === null || set.rir === undefined ? 0 : Number(set.rir);
        entries.push({
          date: session.date,
          sessionId: session.id,
          weight,
          reps,
          e1rm: calculateEstimated1RM(weight, reps, Number.isFinite(rir) ? rir : 0),
          setVolume: weight * reps
        });
      }
    }
  }
  return entries;
}

function buildPrRecords(repo, exerciseId) {
  const id = typeof exerciseId === 'string' ? exerciseId.trim() : String(exerciseId || '');
  const entries = collectEntries(repo, id);
  if (!entries.length) return { exerciseId: id, records: {}, setRecords: [], timeline: [] };

  const records = {};
  for (const [type, key] of Object.entries(TYPES)) {
    let best = null;
    for (const entry of entries) {
      if (!best || entry[key] > best.value) {
        best = { value: entry[key], date: entry.date, sessionId: entry.sessionId };
      }
    }
    records[type] = best;
  }

  const byReps = new Map();
  for (const entry of entries) {
    const prev = byReps.get(entry.reps);
    if (!prev || entry.weight > prev.weight) {
      byReps.set(entry.reps, { reps: entry.reps, weight: entry.weight, date: entry.date });
    }
  }
  const setRecords = [...byReps.values()].sort((a, b) => a.reps - b.reps);

  const ascending = [...entries].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const timeline = [];
  let previousValue = null;
  for (const entry of ascending) {
    if (previousValue === null || entry.e1rm > previousValue) {
      timeline.push({
        date: entry.date,
        type: 'bestE1rm',
        value: entry.e1rm,
        previousValue,
        sessionId: entry.sessionId
      });
      previousValue = entry.e1rm;
    }
  }

  return { exerciseId: id, records, setRecords, timeline: timeline.reverse() };
}

module.exports = { buildPrRecords };
