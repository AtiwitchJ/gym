/**
 * Rest panel helpers (step 4 of the set-screen plan). Pure functions: no store, no DOM.
 */

/** Label used on set rows: warm-up is W1, working sets are S<index>. */
export function setLabel(set, sIdx) {
  return set && set.type === 'warm' ? 'W1' : `S${sIdx}`;
}

/**
 * First set that is not done yet in the day, in exercise order (main exercises, then bonus).
 * Returns { exerciseId, exerciseName, setIndex, label } or null when every set is done.
 */
export function nextUndoneSet(dayData, dayState) {
  if (!dayData) return null;
  const groups = [
    ...(Array.isArray(dayData.exercises) ? dayData.exercises : []),
    ...(Array.isArray(dayData.bonusExercises) ? dayData.bonusExercises : [])
  ];
  for (const ex of groups) {
    const exState = (dayState && dayState[ex.id]) || {};
    const sets = Array.isArray(ex.sets) ? ex.sets : [];
    for (let sIdx = 0; sIdx < sets.length; sIdx++) {
      if (!exState[`set_${sIdx}`]) {
        return {
          exerciseId: ex.id,
          exerciseName: ex.name || ex.id,
          setIndex: sIdx,
          label: setLabel(sets[sIdx], sIdx)
        };
      }
    }
  }
  return null;
}

/** Hint line under the timer. */
export function restHint(next) {
  if (!next) return 'จบทุกท่าแล้ว — ข้ามพักได้เลย';
  return `ต่อไป: ${next.exerciseName} · ${next.label}`;
}

/** Short name of a program key: prog_b -> "Program B", anything else -> "Program A". */
export function programLabel(key) {
  return key === 'prog_b' ? 'Program B' : 'Program A';
}

/** Line shown on the rest view: the program that comes next after the last completed session. */
export function nextProgramHint(key) {
  return `ต่อไป: ${programLabel(key)} · ต่อจากครั้งล่าสุดที่ทำเสร็จ`;
}
