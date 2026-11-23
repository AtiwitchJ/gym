// server/body-measurements.js
// Pure validation & trend computation for body measurements (waist, chest, arm, thigh, hip).
// No database access or side effects.

const MEASUREMENT_KEYS = ['waist', 'chest', 'arm', 'thigh', 'hip'];

function validateDateString(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const d = parseInt(dayStr, 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  return (
    dateObj.getUTCFullYear() === y &&
    dateObj.getUTCMonth() === m - 1 &&
    dateObj.getUTCDate() === d
  );
}

function getTodayLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates body measurement payload.
 * Returns { date: 'YYYY-MM-DD', waist, chest, arm, thigh, hip }
 * Throws an Error with .status = 400 on invalid input.
 */
function validateBodyMeasurement(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    const err = new Error('Request body must be a JSON object');
    err.status = 400;
    throw err;
  }

  let date = payload.date;
  if (date === undefined || date === null || date === '') {
    date = getTodayLocalDate();
  } else {
    if (typeof date !== 'string' || !validateDateString(date)) {
      const err = new Error('date must be a valid calendar date in YYYY-MM-DD format');
      err.status = 400;
      throw err;
    }
  }

  let hasAtLeastOne = false;
  const entry = { date };

  for (const key of MEASUREMENT_KEYS) {
    const val = payload[key];
    if (val === undefined || val === null || val === '') {
      entry[key] = null;
    } else {
      if (typeof val === 'boolean' || typeof val === 'object') {
        const err = new Error(`${key} must be a number between 20 and 300 cm`);
        err.status = 400;
        throw err;
      }
      const num = Number(val);
      if (!Number.isFinite(num) || num < 20 || num > 300) {
        const err = new Error(`${key} must be a number between 20 and 300 cm`);
        err.status = 400;
        throw err;
      }
      entry[key] = Math.round(num * 10) / 10;
      hasAtLeastOne = true;
    }
  }

  if (!hasAtLeastOne) {
    const err = new Error('At least one measurement site is required');
    err.status = 400;
    throw err;
  }

  return entry;
}

/**
 * Computes trend comparing latest entry against the previous entry per site.
 * Pure function: takes array of entries.
 * Returns { entry: latestEntry, trend: { site: { delta, direction } | null } }
 * (or { entry: null, trend: null } when entries is empty).
 */
function computeMeasurementTrend(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { entry: null, trend: null };
  }

  // Sort entries ascending by date
  const sorted = [...entries].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  const latest = sorted[sorted.length - 1];

  const trend = {};
  for (const site of MEASUREMENT_KEYS) {
    const latestVal = latest[site];
    if (latestVal === null || latestVal === undefined || !Number.isFinite(Number(latestVal))) {
      trend[site] = null;
      continue;
    }

    // Find previous entry that recorded this site
    let prevVal = null;
    for (let i = sorted.length - 2; i >= 0; i--) {
      const v = sorted[i][site];
      if (v !== null && v !== undefined && Number.isFinite(Number(v))) {
        prevVal = Number(v);
        break;
      }
    }

    if (prevVal === null) {
      trend[site] = null;
    } else {
      const delta = Math.round((Number(latestVal) - prevVal) * 10) / 10;
      const direction = delta > 0 ? 'up' : (delta < 0 ? 'down' : 'same');
      trend[site] = { delta, direction };
    }
  }

  return { entry: latest, trend };
}

module.exports = {
  MEASUREMENT_KEYS,
  validateDateString,
  validateBodyMeasurement,
  computeMeasurementTrend
};
