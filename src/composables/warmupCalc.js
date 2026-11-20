// Warm-up calculator: percent of the working weight, rounded to 0.5 kg.
// Default plan 40%×5, 60%×5, 80%×3 is taken from the public Hevy help page and is NOT tested in this app,
// so it is only a starting point. The plan can be passed in and changed.
// Pure: no store, no DOM. Produces `warm` sets only; no data schema change.

export const DEFAULT_WARMUP_PLAN = Object.freeze([
  Object.freeze({ percent: 40, reps: 5 }),
  Object.freeze({ percent: 60, reps: 5 }),
  Object.freeze({ percent: 80, reps: 3 })
]);

/** Round to the nearest 0.5 kg (plate-friendly). */
export function roundToHalfKg(kg) {
  return Math.round(kg * 2) / 2;
}

/**
 * Warm-up sets for a working weight. Returns [] when the working weight is not a positive number,
 * so callers keep the old behavior. Each set: { type: 'warm', weight, reps, percent }.
 */
export function buildWarmupSets(workWeight, plan = DEFAULT_WARMUP_PLAN) {
  const w = typeof workWeight === 'string' && workWeight.trim() === '' ? NaN : Number(workWeight);
  if (!Number.isFinite(w) || w <= 0) return [];
  return plan
    .map((step) => ({
      type: 'warm',
      weight: roundToHalfKg((w * step.percent) / 100),
      reps: step.reps,
      percent: step.percent
    }))
    .filter((set) => set.weight > 0);
}
