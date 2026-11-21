// Exercise supersets: request validation (pure, no DB access).
// A superset groups 2+ exercises of one workout day. Storage and rules live in server/db.js.

const DAY_KEY_RE = /^[a-z0-9_]{1,40}$/;
const MAX_EXERCISE_ID_LEN = 100;
const MIN_MEMBERS = 2;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

// body: { dayKey: string, exerciseIds: string[] }
// Returns { dayKey, exerciseIds } or throws ValidationError.
function validateCreateInput(body) {
  const dayKey = body && body.dayKey;
  if (typeof dayKey !== 'string' || !DAY_KEY_RE.test(dayKey)) {
    throw new ValidationError('dayKey must be a short lowercase key such as "mon" or "prog_a"');
  }
  const ids = body && body.exerciseIds;
  if (!Array.isArray(ids)) {
    throw new ValidationError('exerciseIds must be an array');
  }
  const cleaned = ids.map((id) => (typeof id === 'string' ? id.trim() : ''));
  if (cleaned.some((id) => id === '' || id.length > MAX_EXERCISE_ID_LEN)) {
    throw new ValidationError('every exerciseId must be a non-empty string');
  }
  if (new Set(cleaned).size !== cleaned.length) {
    throw new ValidationError('exerciseIds must be distinct');
  }
  if (cleaned.length < MIN_MEMBERS) {
    throw new ValidationError(`a superset needs at least ${MIN_MEMBERS} exercises`);
  }
  return { dayKey, exerciseIds: cleaned };
}

function validateDayKey(dayKey) {
  if (typeof dayKey !== 'string' || !DAY_KEY_RE.test(dayKey)) {
    throw new ValidationError('dayKey must be a short lowercase key such as "mon" or "prog_a"');
  }
  return dayKey;
}

module.exports = { validateCreateInput, validateDayKey, ValidationError, MIN_MEMBERS, DAY_KEY_RE };
