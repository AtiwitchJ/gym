import { ref } from 'vue';

export const EXERCISE_NOTES_STORAGE_KEY = 'gym_exercise_notes_v1';
export const MAX_NOTE_LENGTH = 500;
export const EMPTY_NOTE = Object.freeze({
  exerciseId: '',
  pinSetting: '',
  formCues: '',
  generalNote: '',
  updatedAt: null
});

export const notesMap = ref({});
export const notesRevision = ref(0);
export const notesLoading = ref({});
export const notesError = ref({});

const fetchedIds = new Set();
const fetchingIds = new Set();

function defaultStorage() {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

export function readAllNotesFromStorage(storage = defaultStorage()) {
  try {
    if (!storage) return {};
    const raw = storage.getItem(EXERCISE_NOTES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writeAllNotesToStorage(map, storage = defaultStorage()) {
  try {
    if (!storage) return;
    storage.setItem(EXERCISE_NOTES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage quota or unavailable, ignore safely
  }
}

// Hydrate from storage on module execution
const storedNotes = readAllNotesFromStorage();
Object.assign(notesMap.value, storedNotes);

/**
 * Returns the note object for an exercise ID.
 * Synchronously returns cached/stored note, and automatically triggers background fetch if needed.
 */
export function getNote(exerciseId, storage = defaultStorage()) {
  if (!exerciseId) return { ...EMPTY_NOTE };
  const idStr = String(exerciseId);

  if (!notesMap.value[idStr]) {
    const cached = readAllNotesFromStorage(storage)[idStr];
    if (cached) {
      notesMap.value[idStr] = {
        exerciseId: idStr,
        pinSetting: typeof cached.pinSetting === 'string' ? cached.pinSetting : '',
        formCues: typeof cached.formCues === 'string' ? cached.formCues : '',
        generalNote: typeof cached.generalNote === 'string' ? cached.generalNote : '',
        updatedAt: cached.updatedAt || null
      };
    } else {
      notesMap.value[idStr] = { ...EMPTY_NOTE, exerciseId: idStr };
    }
  }

  // Trigger background server sync if not yet requested this session
  if (!fetchedIds.has(idStr) && !fetchingIds.has(idStr)) {
    fetchNote(idStr);
  }

  return notesMap.value[idStr];
}

/**
 * Returns true if the exercise has any non-empty note content.
 */
export function hasNote(exerciseId) {
  if (!exerciseId) return false;
  void notesRevision.value;
  const note = getNote(exerciseId);
  return Boolean(
    (note.pinSetting && note.pinSetting.trim()) ||
    (note.formCues && note.formCues.trim()) ||
    (note.generalNote && note.generalNote.trim())
  );
}

/**
 * Formats a concise summary string from available note fields joined by ' · '.
 */
export function formatSummaryPill(exerciseId) {
  if (!exerciseId) return '';
  void notesRevision.value;
  const note = getNote(exerciseId);
  const parts = [note.pinSetting, note.formCues, note.generalNote]
    .map(s => String(s || '').trim())
    .filter(Boolean);
  return parts.join(' · ');
}

/**
 * Alias for formatSummaryPill
 */
export const formatNoteSummary = formatSummaryPill;

/**
 * Fetches note from GET /api/exercises/:id/note and updates reactive state and localStorage.
 */
export async function fetchNote(exerciseId, fetchImpl = globalThis.fetch) {
  if (!exerciseId) return null;
  const idStr = String(exerciseId);
  fetchingIds.add(idStr);
  notesLoading.value[idStr] = true;
  notesError.value[idStr] = '';

  try {
    const res = await fetchImpl(`/api/exercises/${encodeURIComponent(idStr)}/note`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const existingLocal = readAllNotesFromStorage()[idStr] || notesMap.value[idStr];
    const serverHasContent = Boolean(
      (data.pinSetting && data.pinSetting.trim()) ||
      (data.formCues && data.formCues.trim()) ||
      (data.generalNote && data.generalNote.trim())
    );
    const localHasContent = Boolean(
      existingLocal && (
        (existingLocal.pinSetting && existingLocal.pinSetting.trim()) ||
        (existingLocal.formCues && existingLocal.formCues.trim()) ||
        (existingLocal.generalNote && existingLocal.generalNote.trim())
      )
    );

    let noteObj;
    // Conflict resolution: protect local offline notes from being overwritten by stale/empty server responses
    if (localHasContent && existingLocal.updatedAt && data.updatedAt) {
      const localTime = new Date(existingLocal.updatedAt).getTime();
      const serverTime = new Date(data.updatedAt).getTime();
      if (localTime > serverTime) {
        // Local offline note is newer than server; preserve local note and do not overwrite!
        noteObj = existingLocal;
      } else {
        noteObj = {
          exerciseId: data.exerciseId || idStr,
          pinSetting: typeof data.pinSetting === 'string' ? data.pinSetting : '',
          formCues: typeof data.formCues === 'string' ? data.formCues : '',
          generalNote: typeof data.generalNote === 'string' ? data.generalNote : '',
          updatedAt: data.updatedAt || null
        };
      }
    } else if (localHasContent && !serverHasContent) {
      // Local has offline note while server is empty; preserve local note!
      noteObj = existingLocal;
    } else {
      noteObj = {
        exerciseId: data.exerciseId || idStr,
        pinSetting: typeof data.pinSetting === 'string' ? data.pinSetting : '',
        formCues: typeof data.formCues === 'string' ? data.formCues : '',
        generalNote: typeof data.generalNote === 'string' ? data.generalNote : '',
        updatedAt: data.updatedAt || null
      };
    }

    notesMap.value[idStr] = noteObj;
    const currentStorage = readAllNotesFromStorage();
    currentStorage[idStr] = noteObj;
    writeAllNotesToStorage(currentStorage);

    fetchedIds.add(idStr);
    notesRevision.value++;
    return noteObj;
  } catch (err) {
    notesError.value[idStr] = err.message || 'ไม่สามารถโหลดโน้ตได้';
    // Offline fallback: keep existing note in memory/storage
    return getNote(idStr);
  } finally {
    fetchingIds.delete(idStr);
    notesLoading.value[idStr] = false;
  }
}

/**
 * Saves or updates note via PUT /api/exercises/:id/note with offline-first optimistic caching.
 */
export async function saveNote(exerciseId, { pinSetting = '', formCues = '', generalNote = '' } = {}, fetchImpl = globalThis.fetch) {
  if (!exerciseId) {
    return { ok: false, error: 'ไม่มีรหัสท่าฝึก' };
  }
  const idStr = String(exerciseId);

  const cleanPin = String(pinSetting ?? '').trim();
  const cleanCues = String(formCues ?? '').trim();
  const cleanGeneral = String(generalNote ?? '').trim();

  if (cleanPin.length > MAX_NOTE_LENGTH || cleanCues.length > MAX_NOTE_LENGTH || cleanGeneral.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      error: `ข้อความต้องไม่เกิน ${MAX_NOTE_LENGTH} ตัวอักษรต่อฟิลด์`
    };
  }

  const hasContent = Boolean(cleanPin || cleanCues || cleanGeneral);
  const nowIso = new Date().toISOString();

  // Optimistic update
  const optimisticNote = {
    exerciseId: idStr,
    pinSetting: cleanPin,
    formCues: cleanCues,
    generalNote: cleanGeneral,
    updatedAt: hasContent ? nowIso : null
  };

  notesMap.value[idStr] = optimisticNote;
  const currentStorage = readAllNotesFromStorage();
  currentStorage[idStr] = optimisticNote;
  writeAllNotesToStorage(currentStorage);
  notesRevision.value++;

  try {
    const res = await fetchImpl(`/api/exercises/${encodeURIComponent(idStr)}/note`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pinSetting: cleanPin,
        formCues: cleanCues,
        generalNote: cleanGeneral
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status}`);
    }

    const json = await res.json();
    const serverNote = json.note || {};
    const confirmedNote = {
      exerciseId: idStr,
      pinSetting: serverNote.pinSetting ?? cleanPin,
      formCues: serverNote.formCues ?? cleanCues,
      generalNote: serverNote.generalNote ?? cleanGeneral,
      updatedAt: serverNote.updatedAt ?? optimisticNote.updatedAt
    };

    notesMap.value[idStr] = confirmedNote;
    currentStorage[idStr] = confirmedNote;
    writeAllNotesToStorage(currentStorage);
    fetchedIds.add(idStr);
    notesRevision.value++;

    return { ok: true, note: confirmedNote, offline: false };
  } catch (err) {
    // Offline resilience: return optimistic note with offline flag
    return {
      ok: true,
      offline: true,
      note: optimisticNote,
      warning: 'บันทึกในเครื่องเรียบร้อย (ออฟไลน์) จะซิงก์เมื่อเชื่อมต่อเซิร์ฟเวอร์'
    };
  }
}

/**
 * Clears note for an exercise.
 */
export async function clearNote(exerciseId, fetchImpl = globalThis.fetch) {
  return saveNote(exerciseId, { pinSetting: '', formCues: '', generalNote: '' }, fetchImpl);
}

/**
 * Vue Composable hook
 */
export function useExerciseNotes(fetchImpl = globalThis.fetch) {
  return {
    notesMap,
    notesRevision,
    notesLoading,
    notesError,
    getNote,
    hasNote,
    formatSummaryPill,
    formatNoteSummary,
    fetchNote: (id) => fetchNote(id, fetchImpl),
    saveNote: (id, payload) => saveNote(id, payload, fetchImpl),
    clearNote: (id) => clearNote(id, fetchImpl)
  };
}
