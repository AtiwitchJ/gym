import { calculateEstimated1RM } from './useRpeAdvisor.js';

/**
 * PR badge on tick (step 6 of the set-screen plan).
 * A set is a PR when its estimated 1RM beats the stored PR of that exercise.
 * The stored PR comes from GET /api/exercises/:id/history (pr.estimated1RM, warm-up sets already excluded).
 * No prior record -> no badge (the first logged set is not a PR), so the badge only means "beat your best".
 */

/** Stored PR per exercise id for this page session; cleared after a save so the next check is fresh. */
const baselineCache = new Map();

/**
 * @param {{weight:number|string, reps:number|string, rir?:number|null, isWarm?:boolean}} set
 * @param {number|null|undefined} baseline stored best e1RM (null = no record yet)
 * @returns {{isPr:boolean, e1rm:number}}
 */
export function isNewPr(set, baseline) {
  const weight = Number(set?.weight);
  const reps = Number(set?.reps);
  if (set?.isWarm || !Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) {
    return { isPr: false, e1rm: 0 };
  }
  const rir = Number.isFinite(Number(set?.rir)) && set?.rir !== null ? Number(set.rir) : 0;
  const e1rm = calculateEstimated1RM(weight, reps, rir);
  const hasBaseline = typeof baseline === 'number' && Number.isFinite(baseline) && baseline > 0;
  return { isPr: hasBaseline && e1rm > baseline, e1rm };
}

/**
 * Stored best e1RM for an exercise. Cached per page session.
 * Resolves to a number, null (no record yet), or undefined (could not load -> no badge).
 */
export async function getBaselineE1rm(exerciseId, fetchImpl = globalThis.fetch) {
  const key = String(exerciseId);
  if (baselineCache.has(key)) return baselineCache.get(key);
  try {
    const res = await fetchImpl(`/api/exercises/${encodeURIComponent(key)}/history`);
    if (!res.ok) return undefined;
    const payload = await res.json();
    const pr = Array.isArray(payload) && payload[0] ? payload[0].pr : null;
    const value = pr && Number.isFinite(Number(pr.estimated1RM)) && Number(pr.estimated1RM) > 0
      ? Number(pr.estimated1RM)
      : null;
    baselineCache.set(key, value);
    return value;
  } catch (err) {
    return undefined;
  }
}

/** Forget the cached baselines (call after a session is saved). */
export function clearPrCache() {
  baselineCache.clear();
}

/** Get the currently cached baseline for an exercise */
export function getCachedBaseline(exerciseId) {
  return baselineCache.get(String(exerciseId));
}

/** Set or override the cached baseline for an exercise (useful for tests and pre-warming) */
export function setCachedBaseline(exerciseId, value) {
  baselineCache.set(String(exerciseId), value);
}

/**
 * Evaluates PR status for each set of an exercise, taking into account baseline reliability
 * and intra-session progression (each subsequent PR must beat preceding sets in this session).
 *
 * @param {Object} exercise Exercise object with sets array
 * @param {number|null|undefined} baseline Stored best e1RM from history
 * @returns {Array<{ setIndex: number, isPr: boolean, e1rm: number }>}
 */
export function evaluateExercisePrs(exercise, baseline) {
  if (!exercise || !Array.isArray(exercise.sets)) return [];

  const results = [];
  const hasValidBaseline = typeof baseline === 'number' && Number.isFinite(baseline) && baseline > 0;
  let currentBestE1rm = hasValidBaseline ? baseline : 0;

  for (let sIdx = 0; sIdx < exercise.sets.length; sIdx++) {
    const s = exercise.sets[sIdx];
    if (!s) {
      results.push({ setIndex: sIdx, isPr: false, e1rm: 0 });
      continue;
    }

    // Uncompleted sets never count as PR
    if (!s.completed) {
      s.isPr = false;
      results.push({ setIndex: sIdx, isPr: false, e1rm: 0 });
      continue;
    }

    // Warmup sets never give a PR
    const isWarm = s.type === 'warmup' || s.type === 'warm' || Boolean(s.isWarm);
    if (isWarm) {
      s.isPr = false;
      results.push({ setIndex: sIdx, isPr: false, e1rm: 0 });
      continue;
    }

    // Incomplete, zero, or negative data never gives a PR
    const weight = Number(s.weight !== undefined && s.weight !== null ? s.weight : s.targetWeight);
    const reps = Number(s.reps !== undefined && s.reps !== null ? s.reps : s.targetReps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) {
      s.isPr = false;
      results.push({ setIndex: sIdx, isPr: false, e1rm: 0 });
      continue;
    }

    const rir = Number.isFinite(Number(s.rir)) && s.rir !== null ? Number(s.rir) : 0;
    const e1rm = calculateEstimated1RM(weight, reps, rir);
    s.e1rm = e1rm;

    // Must beat baseline and prior sets within the current session
    if (hasValidBaseline && e1rm > currentBestE1rm) {
      s.isPr = true;
      currentBestE1rm = e1rm;
      results.push({ setIndex: sIdx, isPr: true, e1rm });
    } else {
      s.isPr = false;
      results.push({ setIndex: sIdx, isPr: false, e1rm });
    }
  }

  return results;
}

/**
 * Collect all PR achievements from an active session for the finish summary.
 *
 * @param {Object} session Active session object with exercises array
 * @returns {Array<{ exerciseId: string, exerciseName: string, setIndex: number, weight: string, reps: string, e1rm?: number }>}
 */
export function collectSessionPrs(session) {
  if (!session || !Array.isArray(session.exercises)) return [];
  const prs = [];
  for (const ex of session.exercises) {
    if (!ex || !Array.isArray(ex.sets)) continue;
    ex.sets.forEach((set, sIdx) => {
      if (set && set.completed && set.isPr) {
        prs.push({
          exerciseId: ex.exerciseId || ex.id || 'ex',
          exerciseName: ex.name || ex.exerciseId || 'แบบฝึก',
          setIndex: sIdx,
          weight: set.weight !== undefined && set.weight !== null ? String(set.weight) : (set.targetWeight !== undefined ? String(set.targetWeight) : ''),
          reps: set.reps !== undefined && set.reps !== null ? String(set.reps) : (set.targetReps !== undefined ? String(set.targetReps) : ''),
          e1rm: set.e1rm || 0
        });
      }
    });
  }
  return prs;
}
