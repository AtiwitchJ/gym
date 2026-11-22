// Per-Exercise Progression Chart & Strength Curve calculation engine.
// Pure functions: no DB access. Inputs come from repo.getExerciseHistory() and repo.getExerciseGoal().
// Uses the same e1RM formula as server/estimate.js and src/composables/useRpeAdvisor.js.

const { calculateEstimated1RM } = require('./estimate');
const { isWarmupSet } = require('./exercise-stats');

/**
 * Filter and normalize working sets from a session.
 * Excludes warm-up sets (via isWarmupSet), incomplete/un-done sets, and non-positive weights/reps.
 */
function extractWorkingSets(session) {
  if (!session || !Array.isArray(session.sets)) return [];
  const sessionId = session.sessionId || session.id || '';
  const result = [];

  for (const set of session.sets) {
    if (!set || !set.done || isWarmupSet(set)) continue;
    const weight = Number(set.weight);
    const reps = Number(set.actualReps !== undefined ? set.actualReps : set.reps);
    if (!Number.isFinite(weight) || weight <= 0) continue;
    if (!Number.isFinite(reps) || reps <= 0) continue;

    const rir = (set.rir !== null && set.rir !== undefined && set.rir !== '') ? Number(set.rir) : null;
    const e1rm = calculateEstimated1RM(weight, reps, rir ?? 0);
    const volume = Math.round(weight * reps * 10) / 10;

    result.push({
      weight,
      reps,
      rir,
      e1rm,
      volume,
      sessionId
    });
  }

  return result;
}

/**
 * Build daily progression timeline from history sessions.
 * Multiple sessions on the same date are aggregated into a single day point.
 * Timeline is returned in chronological order (date ASC).
 */
function buildTimeline(sessions, limit = 20) {
  const list = Array.isArray(sessions) ? sessions : [];
  const byDate = new Map();

  for (const session of list) {
    if (!session || typeof session.date !== 'string') continue;
    const workingSets = extractWorkingSets(session);
    if (workingSets.length === 0) continue;

    const date = session.date;
    if (!byDate.has(date)) {
      byDate.set(date, {
        date,
        sets: []
      });
    }
    byDate.get(date).sets.push(...workingSets);
  }

  // Convert map to sorted daily aggregated points (date ASC)
  const allDays = Array.from(byDate.values()).map(day => {
    const sets = day.sets;
    // Sort sets to pick bestSet: highest e1rm, tie-break on highest weight, then reps
    sets.sort((a, b) => {
      if (b.e1rm !== a.e1rm) return b.e1rm - a.e1rm;
      if (b.weight !== a.weight) return b.weight - a.weight;
      return b.reps - a.reps;
    });

    const best = sets[0];
    const maxWeight = Math.max(...sets.map(s => s.weight));
    const bestE1rm = best.e1rm;
    const totalVolume = Math.round(sets.reduce((sum, s) => sum + s.volume, 0) * 10) / 10;
    const workingSetsCount = sets.length;

    return {
      date: day.date,
      sessionId: best.sessionId,
      maxWeight,
      bestE1rm,
      totalVolume,
      workingSetsCount,
      bestSet: {
        weight: best.weight,
        reps: best.reps,
        rir: best.rir
      }
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  const effectiveLimit = Number.isInteger(limit) && limit >= 1 && limit <= 50 ? limit : 20;
  const timeline = allDays.length > effectiveLimit ? allDays.slice(-effectiveLimit) : allDays;

  return { allDays, timeline };
}

/**
 * Compute progress stats from chronological timeline points.
 */
function computeStats(allDays, timeline) {
  if (!timeline || timeline.length === 0) return null;

  const baselineE1rm = timeline[0].bestE1rm;
  const latestE1rm = timeline[timeline.length - 1].bestE1rm;
  const deltaE1rm = Math.round((latestE1rm - baselineE1rm) * 10) / 10;
  const percentageGain = baselineE1rm > 0
    ? Math.round(((latestE1rm - baselineE1rm) / baselineE1rm) * 10000) / 100
    : 0;

  const bestWeightEver = allDays.length ? Math.max(...allDays.map(d => d.maxWeight)) : 0;
  const totalSessionsLogged = allDays.length;

  return {
    baselineE1rm,
    latestE1rm,
    deltaE1rm,
    percentageGain,
    bestWeightEver,
    totalSessionsLogged
  };
}

/**
 * Main assembler for GET /api/exercises/:id/progression
 */
function buildProgression(exerciseId, history, goal = null, limit = 20) {
  const { allDays, timeline } = buildTimeline(history, limit);
  const stats = computeStats(allDays, timeline);

  const formattedGoal = goal ? {
    targetWeight: Number(goal.targetWeight),
    targetReps: Number(goal.targetReps || 1),
    targetE1rm: Number(goal.targetE1rm !== undefined && goal.targetE1rm !== null ? goal.targetE1rm : (
      Number(goal.targetReps || 1) === 1 ? Number(goal.targetWeight) : calculateEstimated1RM(Number(goal.targetWeight), Number(goal.targetReps || 1), 0)
    )),
    notes: goal.notes || ''
  } : null;

  return {
    exerciseId,
    timeline,
    stats,
    goal: formattedGoal
  };
}

module.exports = {
  extractWorkingSets,
  buildTimeline,
  computeStats,
  buildProgression
};
