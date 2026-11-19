import { isWarmupType } from './useWeightAdvisor.js';

/**
 * Working volume = weight × reps over completed working sets. Warm-up sets are excluded.
 * Same rule as the weekly chart (server/volume.js) and the exercise PR (server/exercise-stats.js).
 */

export function sessionWorkingVolume(session) {
  let total = 0;
  const exercises = Array.isArray(session?.exercises) ? session.exercises : [];
  for (const ex of exercises) {
    for (const set of Array.isArray(ex?.sets) ? ex.sets : []) {
      if (!set || !set.done || isWarmupType(set.type)) continue;
      const weight = Number(set.weight);
      const reps = Number(set.actualReps);
      if (weight > 0 && reps > 0) total += weight * reps;
    }
  }
  return Math.round(total * 10) / 10;
}

export function totalWorkingVolume(sessions) {
  const list = Array.isArray(sessions) ? sessions : [];
  const total = list.reduce((sum, s) => sum + sessionWorkingVolume(s), 0);
  return Math.round(total * 10) / 10;
}
