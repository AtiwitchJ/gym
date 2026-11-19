// Server-side copy of calculateEstimated1RM from src/composables/useRpeAdvisor.js.
// The Docker runner image ships only server/ and dist/, so server code must not require src/.
// test/test-server-isolation.js checks that this formula matches the frontend version.

function calculateEstimated1RM(weight, reps, rir = 0) {
  const w = parseFloat(weight) || 0;
  const r = parseInt(reps, 10) || 0;
  const reserve = (rir !== null && rir !== undefined && rir !== '') ? parseInt(rir, 10) : 0;

  if (w <= 0 || r <= 0) return 0;

  // Effective reps = actual reps + reserve reps
  const effectiveReps = r + reserve;

  // Hybrid Epley formula: e1RM = Weight * (1 + effectiveReps / 30)
  const e1rm = w * (1 + effectiveReps / 30);
  return Math.round(e1rm * 10) / 10;
}

module.exports = { calculateEstimated1RM };
