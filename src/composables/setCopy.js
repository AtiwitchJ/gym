// Copy the previous set into the next empty set of the same exercise (swipe or tap).
// Pure: no store, no DOM. The card applies the plan with the existing update functions.
// A set that already has any value (weight, reps, RIR, or done) is never overwritten.

import { normalizeRir } from './useRir.js';

export const SWIPE_MIN_PX = 56;

export const COPY_NO_SOURCE = 'เซ็ตนี้ยังไม่มีค่าให้คัดลอก';
export const COPY_NO_TARGET = 'ไม่มีเซ็ตว่างถัดไปให้คัดลอก';

function isEmpty(v) {
  return v === undefined || v === null || v === '';
}

/** A set counts as having values when it has a weight, reps, a RIR, or is ticked done. */
export function setHasValues(state, sIdx) {
  if (!state) return false;
  return !isEmpty(state[`wt_${sIdx}`])
    || !isEmpty(state[`reps_${sIdx}`])
    || normalizeRir(state[`rir_${sIdx}`]) !== null
    || !!state[`set_${sIdx}`];
}

/** Warm-up sets copy only to warm-up sets, working sets only to working sets. */
function kindOf(set) {
  return set && set.type === 'warm' ? 'warm' : 'work';
}

/** Index of the next empty set (after fromIdx) of the same kind, or null. */
export function findCopyTarget(sets, state, fromIdx) {
  const list = Array.isArray(sets) ? sets : [];
  const src = list[fromIdx];
  if (!src) return null;
  for (let j = fromIdx + 1; j < list.length; j++) {
    if (kindOf(list[j]) !== kindOf(src)) continue;
    if (!setHasValues(state, j)) return j;
  }
  return null;
}

/** The values to copy from a set: needs a weight or reps. */
export function sourceValues(state, fromIdx) {
  if (!state) return null;
  const weight = state[`wt_${fromIdx}`];
  const reps = state[`reps_${fromIdx}`];
  if (isEmpty(weight) && isEmpty(reps)) return null;
  return {
    weight: isEmpty(weight) ? '' : String(weight),
    reps: isEmpty(reps) ? '' : String(reps),
    rir: normalizeRir(state[`rir_${fromIdx}`]),
    rirPlus: !!state[`rirPlus_${fromIdx}`]
  };
}

/**
 * Plan the copy: { ok: true, targetIdx, weight, reps, rir, rirPlus } or { ok: false, message }.
 * Empty fields of the source are not written (the target keeps its own empty value).
 */
export function planCopy(sets, state, fromIdx) {
  const src = sourceValues(state, fromIdx);
  if (!src) return { ok: false, message: COPY_NO_SOURCE };
  const targetIdx = findCopyTarget(sets, state, fromIdx);
  if (targetIdx === null) return { ok: false, message: COPY_NO_TARGET };
  return { ok: true, targetIdx, ...src };
}

/** Horizontal swipe: far enough, and clearly more horizontal than vertical (so scrolling still wins). */
export function isHorizontalSwipe(dx, dy, minPx = SWIPE_MIN_PX) {
  return Math.abs(dx) >= minPx && Math.abs(dx) >= 2 * Math.abs(dy);
}

/** Thai toast after a successful copy, set labelled as on the card. */
export function copiedMessage(targetIdx) {
  return `คัดลอกไปเซ็ตที่ ${targetIdx} แล้ว`;
}
