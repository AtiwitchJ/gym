// Persistent Exercise Machine Setup & Form Cues logic and validation (SPEC §4).
// Pure validation and conversion helpers; storage operations delegate to server/db.js.

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const MAX_FIELD_LEN = 500;
const MAX_EXERCISE_ID_LEN = 100;

function validateExerciseId(raw) {
  const id = typeof raw === 'string' ? raw.trim() : '';
  if (!id || id.length > MAX_EXERCISE_ID_LEN) {
    throw new ValidationError(`exerciseId must be a non-empty string (max ${MAX_EXERCISE_ID_LEN} characters)`);
  }
  return id;
}

function validateField(val, fieldName) {
  if (val === undefined || val === null) {
    return '';
  }
  if (typeof val !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  if (val.length > MAX_FIELD_LEN) {
    throw new ValidationError(`${fieldName} must not exceed ${MAX_FIELD_LEN} characters`);
  }
  return val;
}

function validateExerciseNoteInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object');
  }

  const rawPin = body.pinSetting !== undefined ? body.pinSetting : body.pin_setting;
  const rawForm = body.formCues !== undefined ? body.formCues : body.form_cues;
  const rawGen = body.generalNote !== undefined ? body.generalNote : body.general_note;

  const pinSetting = validateField(rawPin, 'pinSetting');
  const formCues = validateField(rawForm, 'formCues');
  const generalNote = validateField(rawGen, 'generalNote');

  return {
    pinSetting,
    formCues,
    generalNote
  };
}

function formatExerciseNote(exerciseId, record) {
  if (!record) {
    return {
      exerciseId,
      pinSetting: '',
      formCues: '',
      generalNote: '',
      updatedAt: null
    };
  }

  return {
    exerciseId: record.exercise_id || record.exerciseId || exerciseId,
    pinSetting: record.pin_setting !== undefined ? record.pin_setting : (record.pinSetting || ''),
    formCues: record.form_cues !== undefined ? record.form_cues : (record.formCues || ''),
    generalNote: record.general_note !== undefined ? record.general_note : (record.generalNote || ''),
    updatedAt: record.updated_at !== undefined ? record.updated_at : (record.updatedAt || null)
  };
}

function getNote(repo, rawId) {
  const exerciseId = validateExerciseId(rawId);
  const record = repo.getExerciseSetupNote(exerciseId);
  return formatExerciseNote(exerciseId, record);
}

function saveNote(repo, rawId, body) {
  const exerciseId = validateExerciseId(rawId);
  const validated = validateExerciseNoteInput(body);

  const saved = repo.saveExerciseSetupNote({
    exerciseId,
    pinSetting: validated.pinSetting,
    formCues: validated.formCues,
    generalNote: validated.generalNote,
    updatedAt: new Date().toISOString()
  });

  return {
    success: true,
    exerciseId: saved.exerciseId,
    note: {
      pinSetting: saved.pinSetting,
      formCues: saved.formCues,
      generalNote: saved.generalNote,
      updatedAt: saved.updatedAt
    }
  };
}

module.exports = {
  ValidationError,
  MAX_FIELD_LEN,
  MAX_EXERCISE_ID_LEN,
  validateExerciseId,
  validateField,
  validateExerciseNoteInput,
  formatExerciseNote,
  getNote,
  saveNote
};
