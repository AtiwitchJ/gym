// Copy a set into the next set that is not ticked done (swipe or tap).
// Pure: no store, no DOM. The card applies the plan with the existing update functions.
// Rule (product decision): the target is the next set of the same kind that is NOT ticked done,
// even when the store auto-filled it from set 1 (harmonize). Weight and reps are written over;
// a RIR the target already has is kept.

import { normalizeRir } from './useRir.js';

export const SWIPE_MIN_PX = 56;

export const COPY_NO_SOURCE = 'เซ็ตนี้ยังไม่มีค่าให้คัดลอก';
export const COPY_NO_TARGET = 'ไม่มีเซ็ตถัดไปที่ยังไม่ติ๊กเสร็จให้คัดลอก';

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

/** Ticked done. A done set is never a copy target. */
export function isSetDone(state, sIdx) {
  return !!(state && state[`set_${sIdx}`]);
}

/** Warm-up sets copy only to warm-up sets, working sets only to working sets. */
function kindOf(set) {
  return set && set.type === 'warm' ? 'warm' : 'work';
}

/**
 * Index of the next copy target (after fromIdx) of the same kind that is not ticked done, or null.
 * Auto-filled weight/reps do not block the copy: writing over them is the point of the feature.
 */
export function findCopyTarget(sets, state, fromIdx) {
  const list = Array.isArray(sets) ? sets : [];
  const src = list[fromIdx];
  if (!src) return null;
  for (let j = fromIdx + 1; j < list.length; j++) {
    if (kindOf(list[j]) !== kindOf(src)) continue;
    if (!isSetDone(state, j)) return j;
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
 * Empty fields of the source are not written. rir is null when there is nothing to write, which
 * also covers a target that already has its own RIR (that value is kept).
 */
export function planCopy(sets, state, fromIdx) {
  const src = sourceValues(state, fromIdx);
  if (!src) return { ok: false, message: COPY_NO_SOURCE };
  const targetIdx = findCopyTarget(sets, state, fromIdx);
  if (targetIdx === null) return { ok: false, message: COPY_NO_TARGET };
  const targetHasRir = normalizeRir(state && state[`rir_${targetIdx}`]) !== null;
  return {
    ok: true,
    targetIdx,
    weight: src.weight,
    reps: src.reps,
    rir: targetHasRir ? null : src.rir,
    rirPlus: targetHasRir ? false : src.rirPlus
  };
}

/** Horizontal swipe: far enough, and clearly more horizontal than vertical (so scrolling still wins). */
export function isHorizontalSwipe(dx, dy, minPx = SWIPE_MIN_PX) {
  return Math.abs(dx) >= minPx && Math.abs(dx) >= 2 * Math.abs(dy);
}

/** Thai toast after a successful copy, set labelled as on the card. */
export function copiedMessage(targetIdx) {
  return `คัดลอกไปเซ็ตที่ ${targetIdx} แล้ว`;
}
