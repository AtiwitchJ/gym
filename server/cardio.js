// server/cardio.js
// Cardio Session Logging & Weekly Summary — pure logic, no DB access or side effects.
// Mirrors the cardio logging in Hevy / Strong (duration, distance, calories, weekly roll-up).

const CARDIO_TYPES = [
  { id: 'run', labelTh: 'วิ่ง', icon: '🏃', met: 9.8 },
  { id: 'walk', labelTh: 'เดิน', icon: '🚶', met: 3.8 },
  { id: 'cycle', labelTh: 'ปั่นจักรยาน', icon: '🚴', met: 7.5 },
  { id: 'row', labelTh: 'พาย', icon: '🚣', met: 7.0 },
  { id: 'swim', labelTh: 'ว่ายน้ำ', icon: '🏊', met: 8.0 },
  { id: 'elliptical', labelTh: 'เอลลิปติคัล', icon: '🦿', met: 5.0 },
  { id: 'hiit', labelTh: 'HIIT', icon: '⚡', met: 10.0 },
  { id: 'other', labelTh: 'อื่น ๆ', icon: '🎯', met: 5.0 }
];

const MAX_DURATION_MIN = 600;
const MAX_DISTANCE_KM = 500;
const MAX_CALORIES = 10000;
const REFERENCE_BODY_WEIGHT_KG = 70;

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function isValidDateString(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map((p) => parseInt(p, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function toLocalDateStr(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayLocalDate() {
  return toLocalDateStr(new Date());
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Monday 00:00 local time of the week containing `now`. */
function startOfWeek(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const jsDay = d.getDay(); // 0 = Sunday
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function normalizeType(value) {
  const id = String(value ?? '').trim().toLowerCase();
  return CARDIO_TYPES.find((t) => t.id === id) || null;
}

/**
 * Validate and normalize a cardio session payload.
 * @throws {Error} with .status = 400 on invalid input.
 */
function validateCardioPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw badRequest('Request body must be a JSON object');
  }

  const type = normalizeType(payload.type);
  if (!type) {
    throw badRequest(`type ต้องเป็นหนึ่งใน: ${CARDIO_TYPES.map((t) => t.id).join(', ')}`);
  }

  let date = payload.date;
  if (date === undefined || date === null || date === '') {
    date = todayLocalDate();
  } else if (!isValidDateString(date)) {
    throw badRequest('date ต้องเป็นวันที่ที่ถูกต้องในรูปแบบ YYYY-MM-DD');
  }

  const durationMin = Number(payload.durationMin);
  if (!Number.isFinite(durationMin) || durationMin < 1 || durationMin > MAX_DURATION_MIN) {
    throw badRequest(`durationMin ต้องเป็นตัวเลข 1–${MAX_DURATION_MIN} นาที`);
  }

  function optionalNumber(value, max, label) {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > max) {
      throw badRequest(`${label} ต้องเป็นตัวเลข 0–${max}`);
    }
    return n;
  }

  const distanceKm = optionalNumber(payload.distanceKm, MAX_DISTANCE_KM, 'distanceKm');
  const calories = optionalNumber(payload.calories, MAX_CALORIES, 'calories');
  const note = payload.note === undefined || payload.note === null ? '' : String(payload.note).slice(0, 200);

  return {
    date,
    type: type.id,
    durationMin: Math.round(durationMin),
    distanceKm: distanceKm === null ? null : round2(distanceKm),
    calories: calories === null ? null : Math.round(calories),
    note
  };
}

/** Effective calories: user value when present, else MET-based estimate for a 70 kg reference. */
function effectiveCalories(session) {
  const raw = session?.calories;
  if (raw !== null && raw !== undefined && raw !== '') {
    const explicit = Number(raw);
    if (Number.isFinite(explicit) && explicit >= 0) return explicit;
  }
  const meta = normalizeType(session?.type);
  const minutes = Number(session?.durationMin) || 0;
  if (!meta || minutes <= 0) return 0;
  // MET × 3.5 × bodyweight(kg) / 200 × minutes
  return Math.round((meta.met * 3.5 * REFERENCE_BODY_WEIGHT_KG * minutes) / 200);
}

function aggregate(rows) {
  let totalMinutes = 0;
  let distance = 0;
  let calories = 0;
  for (const r of rows) {
    totalMinutes += Number(r?.durationMin) || 0;
    distance += Number(r?.distanceKm) || 0;
    calories += effectiveCalories(r);
  }
  return {
    sessions: rows.length,
    totalMinutes,
    totalDistanceKm: round2(distance),
    totalCalories: Math.round(calories)
  };
}

/**
 * Build the weekly cardio roll-up. Empty input returns empty aggregates (never throws).
 */
function buildCardioSummary(sessions, now = new Date()) {
  const list = Array.isArray(sessions) ? sessions : [];
  const ws = startOfWeek(now);
  const we = addDays(ws, 7); // exclusive
  const lastStart = addDays(ws, -7);
  const wsStr = toLocalDateStr(ws);
  const weStr = toLocalDateStr(we);
  const lastStartStr = toLocalDateStr(lastStart);

  const inRange = (s, from, to) =>
    typeof s?.date === 'string' && s.date >= from && s.date < to;

  const thisRows = list.filter((s) => inRange(s, wsStr, weStr));
  const lastRows = list.filter((s) => inRange(s, lastStartStr, wsStr));

  const thisWeek = aggregate(thisRows);
  const lastWeek = aggregate(lastRows);

  const byType = CARDIO_TYPES.map((t) => {
    const rows = thisRows.filter((r) => r?.type === t.id);
    return {
      id: t.id,
      labelTh: t.labelTh,
      icon: t.icon,
      ...aggregate(rows)
    };
  }).filter((t) => t.sessions > 0);

  return {
    weekStart: wsStr,
    weekEnd: toLocalDateStr(addDays(ws, 6)),
    thisWeek,
    lastWeek,
    delta: {
      sessions: thisWeek.sessions - lastWeek.sessions,
      totalMinutes: thisWeek.totalMinutes - lastWeek.totalMinutes,
      totalDistanceKm: round2(thisWeek.totalDistanceKm - lastWeek.totalDistanceKm),
      totalCalories: thisWeek.totalCalories - lastWeek.totalCalories
    },
    byType,
    allTime: aggregate(list)
  };
}

module.exports = {
  CARDIO_TYPES,
  MAX_DURATION_MIN,
  MAX_DISTANCE_KM,
  MAX_CALORIES,
  REFERENCE_BODY_WEIGHT_KG,
  isValidDateString,
  toLocalDateStr,
  startOfWeek,
  addDays,
  normalizeType,
  validateCardioPayload,
  effectiveCalories,
  aggregate,
  buildCardioSummary
};
