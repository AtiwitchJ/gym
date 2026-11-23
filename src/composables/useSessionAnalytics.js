/**
 * Session time analytics — split total workout time into active lifting time and rest time,
 * and compute the average rest between sets. Hevy/Strong show this in the post-workout
 * summary; GYM previously only stored one wall-clock duration (dayDurationSec).
 *
 * Pure functions: no store, no DOM, no network, no localStorage.
 *
 * Data source: every completed set carries a `completedAt` timestamp —
 *  - runner flow: useActiveSessionStore.toggleSetComplete() sets ISO `completedAt`
 *  - day flow: useWorkoutStore.toggleSetDone() stores ISO `ts_<idx>`, which
 *    buildSessionSummary() exposes as `completedAt`
 * Consecutive completed timestamps define a rest interval. Intervals outside
 * [MIN_REST_SEC, MAX_REST_SEC] are dropped so a phone call or a gym exit cannot
 * destroy the average.
 */

export const MIN_REST_SEC = 5;
export const MAX_REST_SEC = 600;

/** Parse an ISO string or epoch-ms number into ms; null when unusable. */
function toMs(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Rest gaps (whole seconds) between chronologically consecutive completed sets.
 * @param {object} session session or summary with an `exercises` array
 * @param {{minRestSec?:number, maxRestSec?:number}} options
 * @returns {number[]}
 */
export function computeRestIntervals(session, options = {}) {
  const min = Number.isFinite(options.minRestSec) ? options.minRestSec : MIN_REST_SEC;
  const max = Number.isFinite(options.maxRestSec) ? options.maxRestSec : MAX_REST_SEC;
  const exercises = session && Array.isArray(session.exercises) ? session.exercises : [];
  const times = [];

  for (const ex of exercises) {
    const sets = ex && Array.isArray(ex.sets) ? ex.sets : [];
    for (const set of sets) {
      if (!set || !set.completed) continue;
      const ms = toMs(set.completedAt);
      if (ms !== null) times.push(ms);
    }
  }
  times.sort((a, b) => a - b);

  const intervals = [];
  for (let i = 1; i < times.length; i += 1) {
    const gapSec = Math.round((times[i] - times[i - 1]) / 1000);
    if (gapSec >= min && gapSec <= max) intervals.push(gapSec);
  }
  return intervals;
}

/**
 * Split a finished session into total / rest / active time and average rest per set.
 * @param {object} session finished session with durationSec or startedAt+finishedAt, and sets
 * @param {object} options passed to computeRestIntervals
 * @returns {{totalSec:number, restSec:number, activeSec:number, avgRestSec:number,
 *            restCount:number, hasTimestamps:boolean}}
 */
export function computeSessionAnalytics(session, options = {}) {
  const intervals = computeRestIntervals(session, options);
  const restSec = intervals.reduce((sum, gap) => sum + gap, 0);
  const restCount = intervals.length;
  const avgRestSec = restCount > 0 ? Math.round(restSec / restCount) : 0;

  let totalSec = 0;
  if (session) {
    if (Number.isFinite(session.durationSec) && session.durationSec > 0) {
      totalSec = Math.round(session.durationSec);
    } else {
      const start = toMs(session.startedAt) !== null
        ? toMs(session.startedAt)
        : (Number.isFinite(session.startTime) ? session.startTime : null);
      const end = toMs(session.finishedAt) !== null
        ? toMs(session.finishedAt)
        : (Number.isFinite(session.endTime) ? session.endTime : null);
      if (start !== null && end !== null && end >= start) {
        totalSec = Math.round((end - start) / 1000);
      }
    }
  }

  return {
    totalSec,
    restSec,
    activeSec: Math.max(0, totalSec - restSec),
    avgRestSec,
    restCount,
    hasTimestamps: restCount > 0
  };
}

/** "00:00", "01:15", "1:01:01" — safe on null / negative / garbage input. */
export function formatDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}
