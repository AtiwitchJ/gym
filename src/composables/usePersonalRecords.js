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
