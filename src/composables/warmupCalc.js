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

/** True for the warm-up type names already used across the app. */
export function isWarmSetType(type) {
  if (!type) return false;
  const t = String(type).toLowerCase().trim();
  return t === 'warm' || t === 'warmup' || t === 'วอร์ม' || t === 'w';
}

/**
 * Plan a one-click warm-up insert. Rows go immediately before the first working
 * set (after any warm-up sets already in the routine). Pure: no store or DOM writes.
 * Returns null when there is no working set or the working weight is unusable.
 */
export function planWarmupInsert(exercise, workWeight, plan = DEFAULT_WARMUP_PLAN) {
  const sets = Array.isArray(exercise && exercise.sets) ? exercise.sets : [];
  const insertAt = sets.findIndex((s) => !isWarmSetType(s && s.type));
  if (insertAt < 0) return null;
  const built = buildWarmupSets(workWeight, plan);
  if (!built.length) return null;
  const rows = built.map((s) => ({
    type: 'warm',
    targetWeight: s.weight,
    targetReps: s.reps,
    percent: s.percent,
    _generatedWarmup: true
  }));
  return { insertAt, rows };
}
