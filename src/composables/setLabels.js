/**
 * Set labels for history (review fix: numbering drift and "S4 ข้าม").
 * - Warm-up sets are "วอร์ม" ("วอร์ม 2" for a second one); working sets are "เซ็ต 1", "เซ็ต 2" ...
 * - Working sets count among working sets only (not the raw set index).
 * - A set that was not ticked is shown only if it has a value typed; it is "ยังไม่ได้ติ๊ก",
 *   never "ข้าม" (the app has no skip action, so nothing is recorded as skipped).
 * - A set with no ticks and no values is not shown.
 * Pure functions: no Vue, no DOM.
 */

const isWarm = (set) => set && (set.type === 'วอร์ม' || set.type === 'warm' || set.type === 'warmup');

function hasValue(set) {
  const hasWeight = set.weight !== undefined && set.weight !== null && set.weight !== '' && Number(set.weight) > 0;
  const hasReps = set.actualReps !== undefined && set.actualReps !== null && set.actualReps !== '' && Number(set.actualReps) > 0;
  return hasWeight || hasReps;
}

/**
 * @param {object[]} sets saved sets of one exercise, in order
 * @returns {{key:string, label:string, set:object, status:'done'|'unticked'}[]} visible rows only
 */
export function labelSets(sets) {
  const rows = [];
  let warm = 0;
  let working = 0;
  (Array.isArray(sets) ? sets : []).forEach((set, i) => {
    if (!set) return;
    if (isWarm(set)) {
      warm += 1;
    } else {
      working += 1;
    }
    const label = isWarm(set) ? (warm > 1 ? `วอร์ม ${warm}` : 'วอร์ม') : `เซ็ต ${working}`;
    if (set.done) {
      rows.push({ key: `${i}`, label, set, status: 'done' });
    } else if (hasValue(set)) {
      rows.push({ key: `${i}`, label, set, status: 'unticked' });
    }
  });
  return rows;
}

/** Label for one set in a list (used by Excel export). Returns '' when the set is not shown. */
export function labelFor(sets, index) {
  const row = labelSets(sets).find((r) => r.key === `${index}`);
  return row ? row.label : '';
}
