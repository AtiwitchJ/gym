// server/training-heatmap.js
// 12-Month Training Consistency Heatmap & Frequency Analytics.
// Pure logic: no DB access, no side effects. Derived from existing history data,
// so it needs no schema change and cannot corrupt stored workouts.

const DEFAULT_DAYS = 365;
const MIN_DAYS = 30;
const MAX_DAYS = 365;

// Monday-first, matching the existing weekly UI in TrainingCalendarCard.
const WEEKDAY_LABELS_TH = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
const MONTH_LABELS_TH = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

// Completed-set thresholds for the five heat shades (0 = no workout, 1–4 = active).
const LEVEL_THRESHOLDS = [3, 8, 15];

function toLocalDateStr(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isValidDateStr(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map((p) => parseInt(p, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

function parseDateStr(value) {
  if (!isValidDateStr(value)) return null;
  const [y, m, d] = value.split('-').map((p) => parseInt(p, 10));
  return new Date(y, m - 1, d);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function normalizeDays(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DAYS;
  return Math.max(MIN_DAYS, Math.min(Math.floor(n), MAX_DAYS));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function isWarmupType(type) {
  const t = String(type ?? '').trim().toLowerCase();
  return t === 'warm' || t === 'warmup' || t === 'w';
}

/** Count completed working sets and their volume; warmups are excluded. */
function workingDoneStats(session) {
  const exercises = Array.isArray(session?.exercises) ? session.exercises : [];
  let sets = 0;
  let volumeKg = 0;
  for (const ex of exercises) {
    const rows = Array.isArray(ex?.sets) ? ex.sets : [];
    for (const set of rows) {
      if (!set || set.done !== true) continue;
      if (isWarmupType(set.type)) continue;
      sets += 1;
      const weight = Number(set.weight);
      const reps = Number(set.actualReps);
      if (Number.isFinite(weight) && Number.isFinite(reps) && weight > 0 && reps > 0) {
        volumeKg += weight * reps;
      }
    }
  }
  return { sets, volumeKg: Math.round(volumeKg) };
}

function intensityLevel(sets) {
  const n = Number(sets) || 0;
  if (n <= 0) return 0;
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (n >= threshold) level += 1;
    else break;
  }
  return level;
}

function mondayIndex(dateOrStr) {
  const d = dateOrStr instanceof Date ? dateOrStr : parseDateStr(dateOrStr);
  if (!d) return 0;
  const jsDay = d.getDay(); // 0 = Sunday
  return jsDay === 0 ? 6 : jsDay - 1;
}

function monthLabel(dateStr) {
  const d = parseDateStr(dateStr);
  if (!d) return '';
  // Thai calendar year (BE) matches the rest of the Thai-language UI.
  return `${MONTH_LABELS_TH[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/**
 * Build the heatmap from history rows. Empty or malformed input never throws.
 * @param {Array} sessions  repo.getHistory() rows: { id, date, exercises:[{sets:[]}], totalSetsDone }
 * @param {Date} now        reference "today" (injectable for deterministic tests)
 * @param {number} days     window length, clamped to 30..365
 */
function buildTrainingHeatmap(sessions, now = new Date(), days = DEFAULT_DAYS) {
  const cleanDays = normalizeDays(days);
  const end = startOfDay(now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date());
  const start = addDays(end, -(cleanDays - 1));
  const startStr = toLocalDateStr(start);
  const endStr = toLocalDateStr(end);

  // Aggregate all sessions that fall inside the window onto their local date.
  const byDate = new Map();
  for (const session of Array.isArray(sessions) ? sessions : []) {
    const dateStr = typeof session?.date === 'string' ? session.date : '';
    if (!isValidDateStr(dateStr) || dateStr < startStr || dateStr > endStr) continue;
    const stats = workingDoneStats(session);
    const current = byDate.get(dateStr) || { sessions: 0, sets: 0, volumeKg: 0 };
    current.sessions += 1;
    current.sets += stats.sets;
    current.volumeKg += stats.volumeKg;
    byDate.set(dateStr, current);
  }

  const dayRows = [];
  for (let i = 0; i < cleanDays; i += 1) {
    const dateStr = toLocalDateStr(addDays(start, i));
    const v = byDate.get(dateStr) || { sessions: 0, sets: 0, volumeKg: 0 };
    dayRows.push({
      date: dateStr,
      sessions: v.sessions,
      sets: v.sets,
      volumeKg: v.volumeKg,
      level: intensityLevel(v.sets)
    });
  }

  // Streaks run across consecutive active dates (oldest → newest).
  let bestStreakDays = 0;
  let run = 0;
  let lastActiveDate = null;
  let mostActiveDate = null;
  let mostActiveSets = -1;
  let totalSessions = 0;
  let totalSets = 0;
  let totalVolumeKg = 0;
  let activeDays = 0;

  for (const d of dayRows) {
    if (d.sessions > 0) {
      run += 1;
      if (run > bestStreakDays) bestStreakDays = run;
      lastActiveDate = d.date;
      activeDays += 1;
      if (d.sets > mostActiveSets) {
        mostActiveSets = d.sets;
        mostActiveDate = d.date;
      }
    } else {
      run = 0;
    }
    totalSessions += d.sessions;
    totalSets += d.sets;
    totalVolumeKg += d.volumeKg;
  }

  // An unfinished today keeps a streak alive if yesterday was active.
  let currentStreakDays = 0;
  const lastIdx = dayRows.length - 1;
  let cursor = lastIdx;
  if (dayRows[lastIdx]?.sessions === 0 && dayRows[lastIdx - 1]?.sessions > 0) {
    cursor = lastIdx - 1;
  }
  for (let i = cursor; i >= 0 && dayRows[i].sessions > 0; i -= 1) currentStreakDays += 1;

  // Monday-first weekday frequency.
  const weekdayDistribution = WEEKDAY_LABELS_TH.map((labelTh, day) => ({
    day,
    labelTh,
    sessions: 0,
    sets: 0
  }));
  for (const d of dayRows) {
    if (d.sessions === 0) continue;
    const bucket = weekdayDistribution[mondayIndex(d.date)];
    bucket.sessions += d.sessions;
    bucket.sets += d.sets;
  }

  // Monthly roll-up, chronological.
  const monthlyMap = new Map();
  for (const d of dayRows) {
    if (d.sessions === 0) continue;
    const key = d.date.slice(0, 7);
    const bucket = monthlyMap.get(key) || {
      month: key,
      labelTh: monthLabel(d.date),
      sessions: 0,
      sets: 0
    };
    bucket.sessions += d.sessions;
    bucket.sets += d.sets;
    monthlyMap.set(key, bucket);
  }
  const monthlyDistribution = Array.from(monthlyMap.values());

  // Render-ready grid: 7 columns (rows are weekdays), nulls are padding cells.
  const leadingBlanks = mondayIndex(start);
  const cells = new Array(leadingBlanks).fill(null).concat(dayRows);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return {
    range: { start: startStr, end: endStr, days: cleanDays },
    leadingBlanks,
    weeks,
    days: dayRows,
    summary: {
      totalSessions,
      totalSets,
      totalVolumeKg,
      activeDays,
      totalDays: cleanDays,
      coveragePct: round1((activeDays / cleanDays) * 100),
      currentStreakDays,
      bestStreakDays,
      lastActiveDate,
      mostActiveDate,
      avgSetsPerActiveDay: activeDays ? round1(totalSets / activeDays) : 0
    },
    weekdayDistribution,
    monthlyDistribution
  };
}

module.exports = {
  DEFAULT_DAYS,
  MIN_DAYS,
  MAX_DAYS,
  WEEKDAY_LABELS_TH,
  MONTH_LABELS_TH,
  LEVEL_THRESHOLDS,
  toLocalDateStr,
  isValidDateStr,
  parseDateStr,
  addDays,
  normalizeDays,
  isWarmupType,
  workingDoneStats,
  intensityLevel,
  buildTrainingHeatmap
};
