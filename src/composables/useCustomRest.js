import { REST_MIN_SECONDS, REST_MAX_SECONDS } from './useTimer.js';

/**
 * Custom rest duration per exercise (gap item 5).
 * The value is kept in localStorage only (no data-schema change), keyed by exercise id.
 */

export const CUSTOM_REST_STORAGE_KEY = 'atiwitch_rest_by_exercise';
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
  return parsed;
}
