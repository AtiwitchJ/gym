// Muscle Fatigue & Recovery Indicator (docs/COMPETITOR-RE-BENCHMARK-SPEC.md §2.3)
// Pure functions only: no DB or clock access inside, so they can be unit-tested directly.

const MUSCLE_BY_EXERCISE_ID = require('./muscle-map');
const { MUSCLE_KEYS, muscleKeyFor, normalizeToWhitelist } = require('./muscle-slug-map');

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

// 2D Anatomical Heatmap payload (GET /api/recovery/heatmap).
// Extends the legacy recovery data with a standard English slug, display name
// and hours remaining, grouped into one canonical muscle per heatmap region.
// Existing GET /api/recovery is intentionally left untouched for backward
// compatibility with the strict array-shape contract tests.
const HEATMAP_DISPLAY_NAMES = {
  chest: 'อก (Chest)',
  lats: 'หลัง/ปีก (Lats)',
  biceps: 'หน้าแขน (Biceps)',
  triceps: 'หลังแขน (Triceps)',
  quads: 'ต้นขาด้านหน้า (Quads)',
  hamstrings: 'ต้นขาด้านหลัง (Hamstrings)',
  glutes: 'ก้น/สะโพก (Glutes)',
  delts: 'หัวไหล่ (Delts)',
  abs: 'หน้าท้อง/แกนกลาง (Abs)',
  calves: 'น่อง (Calves)',
  traps: 'บ่า/สะพานคอ (Traps)'
};

function statusWithUntrained(pct, hasHistory) {
  if (!hasHistory) return 'untrained';
  return statusFromPct(pct);
}

function buildRecoveryHeatmap(rows, nowMs = Date.now(), muscleById = MUSCLE_BY_EXERCISE_ID) {
  const lastByMuscle = buildTrainingEvents(rows, muscleById);

  // Aggregate the latest training event per canonical slug. A muscle may have
  // several free-text labels mapped to the same slug; the most recent wins.
  const lastByKey = new Map();
  for (const [label, trainedMs] of lastByMuscle) {
    const key = normalizeToWhitelist(muscleKeyFor(label));
    if (!key) continue;
    if (!lastByKey.has(key) || trainedMs > lastByKey.get(key)) {
      lastByKey.set(key, trainedMs);
    }
  }

  const muscles = MUSCLE_KEYS.map((key) => {
    const trainedMs = lastByKey.get(key);
    const hasHistory = trainedMs !== undefined;
    const hours = hasHistory ? Math.max(0, (nowMs - trainedMs) / HOUR_MS) : 0;
    const recoveryPct = hasHistory
      ? Math.round(Math.min(100, (hours / RECOVERY_WINDOW_HOURS) * 100))
      : 100;
    const status = statusWithUntrained(recoveryPct, hasHistory);
    const hoursRemaining = recoveryPct >= 85
      ? 0
      : Math.max(0, Math.round(((85 - recoveryPct) / 100) * RECOVERY_WINDOW_HOURS));
    return {
      muscleKey: key,
      displayName: HEATMAP_DISPLAY_NAMES[key],
      recoveryPct,
      status,
      lastTrainedAt: hasHistory ? new Date(trainedMs).toISOString() : null,
      hoursRemaining
    };
  });

  const fatiguedCount = muscles.filter((m) => m.status === 'fatigued').length;
  const recoveringCount = muscles.filter((m) => m.status === 'recovering').length;
  const readyCount = muscles.filter((m) => m.status === 'ready').length;
  let overallStatus = 'ready';
  if (fatiguedCount > 2) overallStatus = 'fatigued';
  else if (fatiguedCount > 0 || recoveringCount > 3) overallStatus = 'recovering';

  return {
    summary: { overallStatus, fatiguedCount, recoveringCount, readyCount },
    muscles
  };
}

module.exports = {
  RECOVERY_WINDOW_HOURS,
  MUSCLE_BY_EXERCISE_ID,
  MUSCLE_KEYS,
  HEATMAP_DISPLAY_NAMES,
  listMuscles,
  statusFromPct,
  toTrainedAtMs,
  buildTrainingEvents,
  computeRecovery,
  buildRecovery,
  buildRecoveryHeatmap,
};
