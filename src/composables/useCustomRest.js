import { REST_MIN_SECONDS, REST_MAX_SECONDS } from './useTimer.js';

/**
 * Custom rest duration per exercise (gap item 5).
 * The value is kept in localStorage only (no data-schema change), keyed by exercise id.
 */

import { ref } from 'vue';

export const CUSTOM_REST_STORAGE_KEY = 'atiwitch_rest_by_exercise';

// Bumped on every save so a card that shows the rest time updates at once.
export const restRevision = ref(0);

/** Text for a rest time: "1:30 (ที่ตั้งไว้)" when saved, otherwise the default wording. */
export function formatRestLabel(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return 'ค่าเริ่มต้น';
  const m = Math.floor(n / 60);
  const s = Math.round(n % 60);
  return `${m}:${String(s).padStart(2, '0')} (ที่ตั้งไว้)`;
}
export const CUSTOM_REST_ERROR = `ระบุ ${REST_MIN_SECONDS}–${REST_MAX_SECONDS} วินาที (จำนวนเต็ม)`;

/**
 * Validate what the user typed. Whole seconds only, 10–600 inclusive; anything else is rejected.
 * @returns {{ok:true, seconds:number} | {ok:false, error:string}}
 */
export function parseRestInput(raw) {
  const text = String(raw ?? '').trim();
  if (!/^\d+$/.test(text)) return { ok: false, error: CUSTOM_REST_ERROR };
  const seconds = Number(text);
  if (seconds < REST_MIN_SECONDS || seconds > REST_MAX_SECONDS) return { ok: false, error: CUSTOM_REST_ERROR };
  return { ok: true, seconds };
}

function defaultStorage() {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

/** Read the whole map; a missing or broken value gives an empty map. */
export function readRestMap(storage = defaultStorage()) {
  try {
    const raw = storage ? storage.getItem(CUSTOM_REST_STORAGE_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    return {};
  }
}

/** Stored custom rest (seconds) for an exercise, or null when none is saved. */
export function getCustomRest(exerciseId, storage = defaultStorage()) {
  if (exerciseId === null || exerciseId === undefined || exerciseId === '') return null;
  const value = readRestMap(storage)[String(exerciseId)];
  const parsed = parseRestInput(value);
  return parsed.ok ? parsed.seconds : null;
}

/** Save a custom rest for an exercise. Invalid input is not saved. */
export function saveCustomRest(exerciseId, raw, storage = defaultStorage()) {
  if (exerciseId === null || exerciseId === undefined || exerciseId === '') {
    return { ok: false, error: 'ไม่มีท่าให้บันทึกเวลาพัก' };
  }
  const parsed = parseRestInput(raw);
  if (!parsed.ok) return parsed;
  const map = readRestMap(storage);
  map[String(exerciseId)] = parsed.seconds;
  if (storage) storage.setItem(CUSTOM_REST_STORAGE_KEY, JSON.stringify(map));
  restRevision.value += 1;
  // The browser also writes the value to SQLite, so it survives a cleared cache and reaches other devices.
  if (typeof window !== 'undefined') {
    void pushRestToServer(String(exerciseId), parsed.seconds, { storage });
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Server sync (SQLite is the source of truth; localStorage stays the offline cache)
// ---------------------------------------------------------------------------

export const PENDING_REST_STORAGE_KEY = 'atiwitch_rest_pending';
export const EXERCISE_REST_API = '/api/exercise-rest';

function defaultFetch() {
  return typeof fetch === 'function' ? fetch : null;
}

/** Saves that could not reach the server, kept until a later sync. */
export function readPendingRest(storage = defaultStorage()) {
  try {
    const raw = storage ? storage.getItem(PENDING_REST_STORAGE_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    return {};
  }
}

function writePendingRest(map, storage) {
  if (!storage) return;
  const keys = Object.keys(map);
  if (keys.length === 0) storage.removeItem(PENDING_REST_STORAGE_KEY);
  else storage.setItem(PENDING_REST_STORAGE_KEY, JSON.stringify(map));
}

/** Remember a value that still has to reach the server. */
export function queueRestPush(exerciseId, seconds, storage = defaultStorage()) {
  const pending = readPendingRest(storage);
  pending[String(exerciseId)] = Number(seconds);
  writePendingRest(pending, storage);
  return pending;
}

/**
 * Send one value to the server. When the request fails (offline, 500) the value is queued instead,
 * so the local value is never lost. Returns { ok, queued?, error? } and never throws.
 */
export async function pushRestToServer(exerciseId, seconds, { fetchImpl = defaultFetch(), storage = defaultStorage() } = {}) {
  const id = String(exerciseId);
  if (!fetchImpl) {
    queueRestPush(id, seconds, storage);
    return { ok: false, queued: true, error: 'offline' };
  }
  try {
    const res = await fetchImpl(`${EXERCISE_REST_API}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seconds: Number(seconds) })
    });
    if (!res || !res.ok) throw new Error(`HTTP ${res ? res.status : 'no response'}`);
    const pending = readPendingRest(storage);
    if (Object.prototype.hasOwnProperty.call(pending, id)) {
      delete pending[id];
      writePendingRest(pending, storage);
    }
    return { ok: true };
  } catch (err) {
    queueRestPush(id, seconds, storage);
    return { ok: false, queued: true, error: err.message };
  }
}

/** Send every queued value, stopping at the first failure. */
export async function flushPendingRest({ fetchImpl = defaultFetch(), storage = defaultStorage() } = {}) {
  const pending = readPendingRest(storage);
  const ids = Object.keys(pending);
  if (ids.length === 0) return { ok: true, sent: 0 };
  if (!fetchImpl) return { ok: false, sent: 0, error: 'offline' };
  let sent = 0;
  for (const id of ids) {
    const result = await pushRestToServer(id, pending[id], { fetchImpl, storage });
    if (!result.ok) return { ok: false, sent, error: result.error };
    sent += 1;
  }
  return { ok: true, sent };
}

/**
 * Merge the server map into the local cache (the server wins). Values outside 10–600 are ignored.
 * Returns how many local values changed.
 */
export function mergeRestFromServer(serverMap, storage = defaultStorage()) {
  if (!serverMap || typeof serverMap !== 'object') return 0;
  const map = readRestMap(storage);
  let changed = 0;
  for (const [id, raw] of Object.entries(serverMap)) {
    const parsed = parseRestInput(raw);
    if (!parsed.ok) continue;
    if (map[id] !== parsed.seconds) {
      map[id] = parsed.seconds;
      changed += 1;
    }
  }
  if (changed > 0 && storage) storage.setItem(CUSTOM_REST_STORAGE_KEY, JSON.stringify(map));
  if (changed > 0) restRevision.value += 1;
  return changed;
}

/**
 * Pull the server map, merge it, then retry queued values. Offline or an error leaves the cache as it is.
 * Never throws: a page that cannot reach the server keeps working from localStorage.
 */
export async function syncRestFromServer({ fetchImpl = defaultFetch(), storage = defaultStorage() } = {}) {
  if (!fetchImpl) return { ok: false, changed: 0, error: 'offline' };
  try {
    const res = await fetchImpl(EXERCISE_REST_API);
    if (!res || !res.ok) throw new Error(`HTTP ${res ? res.status : 'no response'}`);
    const data = await res.json();
    const changed = mergeRestFromServer(data, storage);
    const flushed = await flushPendingRest({ fetchImpl, storage });
    return { ok: true, changed, sent: flushed.sent };
  } catch (err) {
    return { ok: false, changed: 0, error: err.message };
  }
}
