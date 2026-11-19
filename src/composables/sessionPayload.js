import { normalizeRir } from './useRir.js';

/**
 * Pure helpers for saving a finished workout. No Vue, no fetch: safe to unit-test.
 *
 * Rule: only completed sets (done) carry weight, reps or RIR.
 *  - An unfinished set is saved with no values, even if a weight or reps were typed or pre-filled.
 *  - An exercise with no completed set is left out of the session.
 *  - Only completed sets are returned as last-record writes.
 */

const pick = (state, fallback, key) => {
  if (state[key] !== undefined && state[key] !== '') return state[key];
  return (fallback && fallback[key]) || '';
};

function buildExercise(ex, exState, lastForEx, { category, workLabel }) {
  const sets = [];
  const records = [];
  let doneCount = 0;

  (Array.isArray(ex.sets) ? ex.sets : []).forEach((set, sIdx) => {
    const isDone = !!exState[`set_${sIdx}`];
    const weight = pick(exState, lastForEx, `wt_${sIdx}`);
    const reps = pick(exState, lastForEx, `reps_${sIdx}`);

    if (isDone) {
      doneCount++;
      records.push({ exId: ex.id, sIdx, wt: weight, reps });
    }

    sets.push({
      setIndex: sIdx + 1,
      type: set.type === 'warm' ? 'วอร์ม' : workLabel,
      target: set.reps,
      weight: isDone ? weight : '',
      actualReps: isDone ? reps : '',
      done: isDone,
      rir: isDone ? normalizeRir(exState[`rir_${sIdx}`]) : null,
      rirPlus: isDone && normalizeRir(exState[`rir_${sIdx}`]) === 2 && !!exState[`rirPlus_${sIdx}`]
    });
  });

  return {
    doneCount,
    records,
    exercise: doneCount > 0 ? { id: ex.id, name: ex.name, category, sets } : null
  };
}

/**
 * Build the session exercises for one finished day.
 * @returns {{ sessionExercises: object[], totalSetsDone: number, lastRecords: {exId, sIdx, wt, reps}[] }}
 */
export function buildSessionExercises(dayData = {}, dayState = {}, lastWeights = {}) {
  let totalSetsDone = 0;
  const sessionExercises = [];
  const lastRecords = [];

  const addAll = (list, meta) => {
    for (const ex of Array.isArray(list) ? list : []) {
      const built = buildExercise(ex, dayState[ex.id] || {}, lastWeights[ex.id], meta(ex));
      totalSetsDone += built.doneCount;
      lastRecords.push(...built.records);
      if (built.exercise) sessionExercises.push(built.exercise);
    }
  };

  addAll(dayData.exercises, (ex) => ({ category: ex.isMain ? 'ท่าหลัก' : 'ท่าเสริม', workLabel: 'เล่นจริง' }));
  addAll(dayData.bonusExercises, () => ({ category: 'ซ้อมเสริม', workLabel: 'ซ้อมเสริม' }));

  return { sessionExercises, totalSetsDone, lastRecords };
}

/**
 * Last-record values for one exercise, from its history sets.
 * Skips unfinished or skipped sets (done === false). Undefined done counts as completed (older saved data).
 */
export function recordValuesFromSets(sets) {
  const values = {};
  (Array.isArray(sets) ? sets : []).forEach((s, idx) => {
    if (!s || s.done === false) return;
    if (s.weight !== undefined && s.weight !== null && s.weight !== '') values[`wt_${idx}`] = s.weight;
    if (s.actualReps !== undefined && s.actualReps !== null && s.actualReps !== '') values[`reps_${idx}`] = s.actualReps;
  });
  return values;
}
