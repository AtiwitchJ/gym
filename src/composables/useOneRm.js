import { ref } from 'vue';
import { calculateEstimated1RM } from './useRpeAdvisor.js';

/**
 * Standalone 1RM calculator (gap list item 4). Uses the same formula as the set PR logic:
 * e1RM = weight × (1 + (reps + RIR) / 30)  (useRpeAdvisor.js and server/estimate.js).
 */

export const ONE_RM_RIR_CHOICES = [0, 1, 2, 3].map((value) => ({
  value,
  label: value >= 3 ? 'RIR 3+' : `RIR ${value}`
}));

const oneRmOpen = ref(false);

/** Shared open/close state; the modal is mounted once in App.vue. */
export function useOneRmCalculator() {
  return {
    isOpen: oneRmOpen,
    open() {
      oneRmOpen.value = true;
    },
    close() {
      oneRmOpen.value = false;
    }
  };
}

/**
 * Estimated 1RM as text with one decimal, or '—' when weight or reps is missing, zero, or not a number.
 * @param {number|string} weight kg
 * @param {number|string} reps completed reps
 * @param {number|string|null} rir reps in reserve (0–3; 3 means 3 or more)
 */
export function formatOneRm(weight, reps, rir = 0) {
  const w = parseFloat(weight);
  const r = parseInt(reps, 10);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(r) || r <= 0) return '—';
  const e = calculateEstimated1RM(w, r, rir);
  return e > 0 ? e.toFixed(1) : '—';
}
