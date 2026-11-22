// Custom rest seconds per exercise: request validation (pure, no DB access).
// Storage and rules live in server/db.js; the browser keeps a localStorage cache and syncs here.

const MIN_SECONDS = 10;
const MAX_SECONDS = 600;
const MAX_EXERCISE_ID_LEN = 100;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

// exerciseId: non-empty string, trimmed, at most 100 characters.
function validateExerciseId(raw) {
  const id = typeof raw === 'string' ? raw.trim() : '';
  if (id === '' || id.length > MAX_EXERCISE_ID_LEN) {
    throw new ValidationError('exerciseId must be a non-empty string (max 100 characters)');
  }
  return id;
}

// seconds: whole number 10–600, matching REST_MIN_SECONDS / REST_MAX_SECONDS in src/composables/useTimer.js.
function validateSeconds(raw) {
  const n = typeof raw === 'string' ? Number(raw.trim()) : raw;
  if (!Number.isInteger(n) || n < MIN_SECONDS || n > MAX_SECONDS) {
    throw new ValidationError(`seconds must be a whole number between ${MIN_SECONDS} and ${MAX_SECONDS}`);
  }
  return n;
}

module.exports = {
  validateExerciseId,
  validateSeconds,
  ValidationError,
  MIN_SECONDS,
  MAX_SECONDS,
  MAX_EXERCISE_ID_LEN
};
