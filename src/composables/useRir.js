/**
 * RIR (reps in reserve) buttons shown after a set is done (step 5 of the set-screen plan).
 * Three choices only. Pure functions: no store, no DOM.
 *
 * Mapping: "ล้ม" = RIR 0, "เหลือ 1" = RIR 1, "เหลือ 2+" = RIR 2 (stored as 2, meaning 2 or more).
 *
 * NOT YET CONFIRMED: this mapping is a guess, not checked with gym users.
 * The user should confirm it (or change the values) before it is relied on.
 */

export const RIR_CHOICES = [
  { value: 2, plus: true, label: 'เหลือ 2+', title: 'เหลืออีก 2 ครั้งขึ้นไป (RIR 2+)' },
  { value: 1, label: 'เหลือ 1', title: 'เหลืออีก 1 ครั้ง (RIR 1)' },
  { value: 0, label: 'ล้ม', title: 'หมดแรง ยกต่อไม่ได้ (RIR 0)' }
];

/** Stored RIR for a set: 0, 1, 2, or null when not chosen. Values above 2 count as 2 ("2+"). */
export function normalizeRir(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(2, Math.floor(n));
}

/** Tapping the chosen button clears it; tapping another button selects it. */
export function nextRir(current, picked) {
  const cur = normalizeRir(current);
  const pick = normalizeRir(picked);
  return cur === pick ? null : pick;
}

/**
 * "เหลือ 2+" is stored as rir 2 plus rirPlus true, so "2 or more" is not lost (review fix).
 * The plain "2" choice does not exist in the buttons; rirPlus false with rir 2 is an old record.
 */
export function rirPlusFor(choice) {
  return !!(choice && choice.value === 2 && choice.plus);
}

/** Next selection {rir, rirPlus} after tapping `choice`. Tapping the chosen button again clears it. */
export function nextRirSelection(current, currentPlus, choice) {
  const picked = normalizeRir(choice?.value);
  const pickedPlus = rirPlusFor(choice);
  const same = normalizeRir(current) === picked && (picked !== 2 || !!currentPlus === pickedPlus);
  if (same || picked === null) return { rir: null, rirPlus: false };
  return { rir: picked, rirPlus: picked === 2 ? pickedPlus : false };
}

/** Whether `choice` is the current selection (used for the highlighted button). */
export function isRirChoiceSelected(current, currentPlus, choice) {
  const picked = normalizeRir(choice?.value);
  if (normalizeRir(current) !== picked) return false;
  return picked !== 2 || !!currentPlus === rirPlusFor(choice);
}

/** Label shown in history: "2+" for the 2-or-more choice, "—" when no RIR was chosen. */
export function rirLabel(rir, rirPlus) {
  const n = normalizeRir(rir);
  if (n === null) return '—';
  if (n === 2 && rirPlus) return '2+';
  return String(n);
}
