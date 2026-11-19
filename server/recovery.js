// Muscle Fatigue & Recovery Indicator (docs/COMPETITOR-RE-BENCHMARK-SPEC.md §2.3)
// Pure functions only: no DB or clock access inside, so they can be unit-tested directly.

const MUSCLE_BY_EXERCISE_ID = require('./muscle-map');

const RECOVERY_WINDOW_HOURS = 48;
const HOUR_MS = 60 * 60 * 1000;

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// Every distinct mainMuscle label, in map order. Muscles never trained still appear in the response.
function listMuscles(muscleById = MUSCLE_BY_EXERCISE_ID) {
  return [...new Set(Object.values(muscleById))];
}

// Spec thresholds: 0–49 fatigued, 50–84 recovering, 85–100 ready.
function statusFromPct(pct) {
  if (pct < 50) return 'fatigued';
  if (pct < 85) return 'recovering';
  return 'ready';
}

// workout_sessions stores date 'YYYY-MM-DD' and time 'HH:MM'. Same UTC convention as the existing lastWeights code.
function toTrainedAtMs(date, time) {
  if (!date) return NaN;
  const hms = /^\d{2}:\d{2}$/.test(String(time || '')) ? `${time}:00` : '00:00:00';
  return Date.parse(`${date}T${hms}.000Z`);
}

// rows: [{ exerciseId, date, time, done }], one per set.
// Returns Map<muscle, latestTrainedMs>. Only completed sets count (done truthy).
function buildTrainingEvents(rows, muscleById = MUSCLE_BY_EXERCISE_ID) {
  const lastByMuscle = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || !row.done) continue;
    if (!hasOwn(muscleById, row.exerciseId)) continue;
    const muscle = muscleById[row.exerciseId];
    const ms = toTrainedAtMs(row.date, row.time);
    if (Number.isNaN(ms)) continue;
    if (!lastByMuscle.has(muscle) || ms > lastByMuscle.get(muscle)) {
      lastByMuscle.set(muscle, ms);
    }
  }
  return lastByMuscle;
}

// recoveryPct = min(100, hoursSinceLast / 48 * 100), rounded to an integer.
// A future timestamp (clock skew) counts as 0 hours.
function computeRecovery(lastByMuscle, nowMs = Date.now(), muscles = listMuscles()) {
  return muscles.map((muscle) => {
    const last = lastByMuscle.get(muscle);
    if (last === undefined) {
      return { muscle, lastTrainedAt: null, recoveryPct: 100, status: 'ready' };
    }
    const hours = Math.max(0, (nowMs - last) / HOUR_MS);
    const recoveryPct = Math.round(Math.min(100, (hours / RECOVERY_WINDOW_HOURS) * 100));
    return {
      muscle,
      lastTrainedAt: new Date(last).toISOString(),
      recoveryPct,
      status: statusFromPct(recoveryPct),
    };
  });
}

// Full pipeline: completed-set rows -> response array for GET /api/recovery.
function buildRecovery(rows, nowMs = Date.now(), muscleById = MUSCLE_BY_EXERCISE_ID) {
  const lastByMuscle = buildTrainingEvents(rows, muscleById);
  return computeRecovery(lastByMuscle, nowMs, listMuscles(muscleById));
}

module.exports = {
  RECOVERY_WINDOW_HOURS,
  MUSCLE_BY_EXERCISE_ID,
  listMuscles,
  statusFromPct,
  toTrainedAtMs,
  buildTrainingEvents,
  computeRecovery,
  buildRecovery,
};
