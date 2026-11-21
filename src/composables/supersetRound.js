// Superset round rule for the set screen (pure: no store, no DOM).
// A superset is a group of exercises of one day (see useSupersets.js). Its sets are done in rounds:
// round 0 = set 0 of each member in group order, round 1 = set 1 of each member, and so on.
// Rest starts only after a whole round is done; until then the next member of the group is the next step.
// Ungrouped exercises are not affected: they rest after every set, as before.

import { groupForExercise } from './useSupersets.js';
import { setLabel } from './useRestPanel.js';

/** isDone(exerciseId, setIndex) for one day's saved state (userState[day]). */
export function doneFromState(dayState) {
  return (exerciseId, setIndex) => !!(dayState && dayState[exerciseId] && dayState[exerciseId][`set_${setIndex}`]);
}

/** setCountFor(exerciseId) for a day's main + bonus exercises. */
export function countFromExercises(dayExercises) {
  const byId = new Map((Array.isArray(dayExercises) ? dayExercises : []).map((ex) => [ex.id, ex]));
  return (exerciseId) => {
    const ex = byId.get(exerciseId);
    return ex && Array.isArray(ex.sets) ? ex.sets.length : 0;
  };
}

/** Member ids of the group that holds this exercise on the day, in group order; null when ungrouped. */
export function groupMembersFor(groups, exerciseId) {
  const group = groupForExercise(groups, exerciseId);
  return group ? [...group.exerciseIds] : null;
}

/** Number of sets of an exercise (0 when unknown). */
function countOf(setCountFor, exerciseId) {
  const n = setCountFor(exerciseId);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Every member's set `setIndex` (members that have that many sets) is done. */
export function roundComplete(members, setIndex, isDone, setCountFor) {
  return members.every((id) => countOf(setCountFor, id) <= setIndex || isDone(id, setIndex));
}

/**
 * Should a rest start after this set was ticked?
 * Ungrouped: always (unchanged behaviour). Grouped: only when the round is complete.
 */
export function shouldRestAfterTick(groups, exerciseId, setIndex, isDone, setCountFor) {
  const members = groupMembersFor(groups, exerciseId);
  if (!members) return true;
  return roundComplete(members, setIndex, isDone, setCountFor);
}

/** The first undone set of a group in round order, or null when the group is finished. */
export function groupNextUndone(members, isDone, setCountFor) {
  const rounds = Math.max(0, ...members.map((id) => countOf(setCountFor, id)));
  for (let setIndex = 0; setIndex < rounds; setIndex++) {
    for (const id of members) {
      if (setIndex < countOf(setCountFor, id) && !isDone(id, setIndex)) {
        return { exerciseId: id, setIndex };
      }
    }
  }
  return null;
}

/**
 * Next undone set for the rest panel ("ต่อไป"), group-aware.
 * Same as nextUndoneSet (exercise order, then set order) for ungrouped exercises.
 * When that set belongs to a group, the next step is the group's round-order step instead.
 * dayExercises: main + bonus exercises of the day, each { id, name, sets }.
 * Returns { exerciseId, exerciseName, setIndex, label } or null when every set is done.
 */
export function nextUndoneWithGroups(dayExercises, isDone, groups) {
  const list = Array.isArray(dayExercises) ? dayExercises : [];
  const byId = new Map(list.map((ex) => [ex.id, ex]));
  const setCountFor = (id) => (byId.has(id) && Array.isArray(byId.get(id).sets) ? byId.get(id).sets.length : 0);

  let base = null;
  for (const ex of list) {
    const sets = Array.isArray(ex.sets) ? ex.sets : [];
    for (let setIndex = 0; setIndex < sets.length; setIndex++) {
      if (!isDone(ex.id, setIndex)) {
        base = { exerciseId: ex.id, setIndex };
        break;
      }
    }
    if (base) break;
  }
  if (!base) return null;

  let pick = base;
  const members = groupMembersFor(groups, base.exerciseId);
  if (members) {
    const step = groupNextUndone(members, isDone, setCountFor);
    if (step) pick = step;
  }
  const ex = byId.get(pick.exerciseId);
  const set = ex.sets[pick.setIndex];
  return {
    exerciseId: pick.exerciseId,
    exerciseName: ex.name || ex.id,
    setIndex: pick.setIndex,
    label: setLabel(set, pick.setIndex)
  };
}
