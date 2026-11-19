/**
 * Step math for the set-row ± steppers (step 3 of the set-screen plan).
 * Pure functions: no store, no DOM.
 */

// Guess from the UX plan: 2.5 kg per tap works for most machines and pairs of dumbbells in 2.5 kg steps.
export const WEIGHT_STEP_KG = 2.5;
export const REPS_STEP = 1;

/** '' / null / undefined -> null; numeric strings and numbers -> number; anything else -> null. */
export function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Next value after one tap.
 * - The current value is used when set; when empty, the previous record is the base (prefill).
 * - dir is +1 or -1. The result is never below `min` and is rounded to one decimal.
 */
export function stepFrom(current, previous, dir, step, min = 0) {
  const base = toNumberOrNull(current) ?? toNumberOrNull(previous) ?? 0;
  const next = base + dir * step;
  return Math.max(min, Math.round(next * 10) / 10);
}
