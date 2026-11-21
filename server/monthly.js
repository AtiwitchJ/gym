// Monthly summary (read-only). Pure functions: no DB access.
// Input is repo.getHistory() (saved sessions only, newest first).
//
// Rules (same as the rest of the server):
//  - A session counts when its date (YYYY-MM-DD) is in the requested month.
//  - Completed working sets: done and not a warm-up (isWarmupSet, same as exercise PR).
//  - Volume = weight × actual reps over completed working sets (same as server/volume.js).
//  - Best PR per exercise id = computePr() over that exercise's completed working sets in the month.

const { computePr, isWarmupSet } = require('./exercise-stats');

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

// 'YYYY-MM' -> normalized string, or throws ValidationError (400).
function validateMonth(month) {
  if (typeof month !== 'string' || !MONTH_RE.test(month)) {
    throw new ValidationError('month must be YYYY-MM, for example 2026-11');
  }
  return month;
}

function inMonth(date, month) {
  return typeof date === 'string' && date.startsWith(`${month}-`);
}

function buildMonthlySummary(history, month) {
  const sessions = (Array.isArray(history) ? history : []).filter((s) => s && inMonth(s.date, month));

  let completedWorkingSets = 0;
  let volumeKg = 0;
  const byExercise = new Map(); // exerciseId -> { exerciseId, exerciseName, sessions: [{sets}] }

  for (const session of sessions) {
    for (const ex of Array.isArray(session.exercises) ? session.exercises : []) {
      const working = (Array.isArray(ex.sets) ? ex.sets : []).filter((s) => s && s.done && !isWarmupSet(s));
      if (working.length === 0) continue;

      if (!byExercise.has(ex.id)) {
        byExercise.set(ex.id, { exerciseId: ex.id, exerciseName: ex.name || ex.id, sessions: [] });
      }
      byExercise.get(ex.id).sessions.push({ sets: working });

      for (const s of working) {
        completedWorkingSets++;
        const weight = Number(s.weight);
        const reps = Number(s.actualReps);
        if (weight > 0 && reps > 0) volumeKg += weight * reps;
      }
    }
  }

  const prs = [...byExercise.values()].map((e) => {
    const pr = computePr(e.sessions);
    return {
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      bestWeight: pr.bestWeight,
      bestReps: pr.bestReps,
      estimated1RM: pr.estimated1RM
    };
  });
  // Highest estimated 1RM first; exercises with no e1RM last, then by name.
  prs.sort((a, b) => {
    if (a.estimated1RM === null && b.estimated1RM === null) return a.exerciseName.localeCompare(b.exerciseName);
    if (a.estimated1RM === null) return 1;
    if (b.estimated1RM === null) return -1;
    return b.estimated1RM - a.estimated1RM;
  });

  return {
    month,
    sessions: sessions.length,
    completedWorkingSets,
    volumeKg: Math.round(volumeKg * 10) / 10,
    prs
  };
}

module.exports = { validateMonth, buildMonthlySummary, ValidationError };
