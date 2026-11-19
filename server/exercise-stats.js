// Per-exercise personal records (PR). Pure function: no DB or clock access.
// Uses the same e1RM formula as the frontend (src/composables/useRpeAdvisor.js).

const { calculateEstimated1RM } = require('./estimate');

// Warm-up detection matches src/composables/useWeightAdvisor.js (isWarmupType).
// The app stores the set type on every saved set: 'warm' (W1 in the UI), 'warmup', or the Thai label 'วอร์ม'.
const WARMUP_TYPES = new Set(['warm', 'warmup', 'วอร์ม']);
function isWarmupSet(set) {
  return Boolean(set) && WARMUP_TYPES.has(set.type);
}

// sessions: output of repo.getExerciseHistory() -> [{ sets: [{ type, weight, actualReps, rir, done }] }]
// Only completed working sets count: skipped sets (done falsy) and warm-up sets are excluded.
// Returns { bestWeight, bestReps, estimated1RM }; each is null when no qualifying set exists.
function computePr(sessions) {
  let bestWeight = null;
  let bestReps = null;
  let estimated1RM = null;

  for (const session of Array.isArray(sessions) ? sessions : []) {
    for (const set of Array.isArray(session && session.sets) ? session.sets : []) {
      if (!set || !set.done || isWarmupSet(set)) continue;
      const weight = Number(set.weight);
      const reps = Number(set.actualReps);
      const hasWeight = Number.isFinite(weight) && weight > 0;
      const hasReps = Number.isFinite(reps) && reps > 0;

      if (hasWeight && (bestWeight === null || weight > bestWeight)) bestWeight = weight;
      if (hasReps && (bestReps === null || reps > bestReps)) bestReps = reps;
      if (hasWeight && hasReps) {
        const e1rm = calculateEstimated1RM(weight, reps, set.rir);
        if (e1rm > 0 && (estimated1RM === null || e1rm > estimated1RM)) estimated1RM = e1rm;
      }
    }
  }

  return { bestWeight, bestReps, estimated1RM };
}

// Attach the same PR to every history item. Keeps the response an array (smoke test and older clients expect that).
function withPr(sessions) {
  const pr = computePr(sessions);
  return (Array.isArray(sessions) ? sessions : []).map((s) => ({ ...s, pr }));
}

module.exports = { computePr, withPr, isWarmupSet };
