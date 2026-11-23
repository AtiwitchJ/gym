/**
 * Session summary shown after "Save Session" (step 6b). Pure functions: no store, no DOM.
 */

import {
  normalizeSrpe,
  normalizePumpRating,
  normalizeJointComfort,
  computeSessionLoadAu,
  DEFAULT_SESSION_RPE,
  DEFAULT_PUMP_RATING,
  DEFAULT_JOINT_COMFORT
} from './useSessionDebrief.js';

/**
 * @param {object} dayData  workoutData[day] (exercises, bonusExercises, title)
 * @param {object} dayState userState[day] as it was before the reset
 * @param {object} [options] optional debrief fields or overrides
 * @returns {{title:string, setsDone:number, setsTotal:number, prs:Array<{exerciseId:string, exerciseName:string, setIndex:number, weight:string, reps:string}>, sessionRpe:number, sessionLoadAu:number, pumpRating:string, jointComfort:string}}
 */
export function buildSessionSummary(dayData, dayState, options = {}) {
  // Same field names as the runner summary, so WorkoutSummaryModal shows both (one summary modal).
  const durationSec = Number(options?.durationSec || 0);
  const sessionRpe = options?.sessionRpe !== undefined ? normalizeSrpe(options.sessionRpe) : DEFAULT_SESSION_RPE;
  const pumpRating = options?.pumpRating !== undefined ? normalizePumpRating(options.pumpRating) : DEFAULT_PUMP_RATING;
  const jointComfort = options?.jointComfort !== undefined ? normalizeJointComfort(options.jointComfort) : DEFAULT_JOINT_COMFORT;
  const sessionLoadAu = options?.sessionLoadAu !== undefined ? Number(options.sessionLoadAu) : computeSessionLoadAu(durationSec, sessionRpe);

  const summary = {
    title: dayData?.title || '',
    subtitle: 'ท่าที่บันทึกในรอบนี้',
    setsDone: 0,
    setsTotal: 0,
    completedSetsCount: 0,
    totalSetsCount: 0,
    totalVolumeKg: 0,
    durationSec,
    exercises: [],
    prs: [],
    sessionRpe,
    sessionLoadAu,
    pumpRating,
    jointComfort
  };
  if (!dayData) return summary;
  const groups = [
    ...(Array.isArray(dayData.exercises) ? dayData.exercises : []),
    ...(Array.isArray(dayData.bonusExercises) ? dayData.bonusExercises : [])
  ];
  for (const ex of groups) {
    const exState = (dayState && dayState[ex.id]) || {};
    const sets = Array.isArray(ex.sets) ? ex.sets : [];
    const exerciseSets = sets.map((_, sIdx) => {
      const completed = !!exState[`set_${sIdx}`];
      const weight = Number(exState[`wt_${sIdx}`]);
      const reps = Number(exState[`reps_${sIdx}`]);
      if (completed && weight > 0 && reps > 0) summary.totalVolumeKg += weight * reps;
      return {
        completed,
        completedAt: completed && exState[`ts_${sIdx}`] ? exState[`ts_${sIdx}`] : null
      };
    });
    summary.exercises.push({ name: ex.name || ex.id, sets: exerciseSets });
    sets.forEach((_, sIdx) => {
      summary.setsTotal += 1;
      if (exState[`set_${sIdx}`]) summary.setsDone += 1;
      if (exState[`pr_${sIdx}`]) {
        summary.prs.push({
          exerciseId: ex.id,
          exerciseName: ex.name || ex.id,
          setIndex: sIdx,
          weight: exState[`wt_${sIdx}`] !== undefined ? String(exState[`wt_${sIdx}`]) : '',
          reps: exState[`reps_${sIdx}`] !== undefined ? String(exState[`reps_${sIdx}`]) : ''
        });
      }
    });
  }
  summary.completedSetsCount = summary.setsDone;
  summary.totalSetsCount = summary.setsTotal;
  summary.totalVolumeKg = Math.round(summary.totalVolumeKg * 10) / 10;
  return summary;
}

/** "Flat DB Bench 22.5 kg × 9" */
export function prLabel(pr) {
  const weight = pr.weight !== '' ? `${pr.weight} kg` : '—';
  const reps = pr.reps !== '' ? ` × ${pr.reps}` : '';
  return `${pr.exerciseName} ${weight}${reps}`;
}
