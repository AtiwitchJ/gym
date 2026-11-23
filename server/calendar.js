// Training Calendar & Consistency Streak (read-only calendar logic).
// Pure functions: no DB access. Inputs come from repo methods in server/db.js.
//
// Conventions (shared with Frontend and QA):
//  - firstDayOfWeek: 0 = Monday ... 6 = Sunday
//  - Weeks start on Monday (ISO). Multiple sessions on one date count as ONE trained day.
//  - currentStreakWeeks = consecutive weeks meeting the weekly target ending at the
//    current week (or the previous week when this week is not met yet).

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function integerInRange(value, min, max, label, fallback) {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw new ValidationError(`${label} is required`);
  }
  const text = String(value).trim();
  if (!/^-?\d+$/.test(text)) {
    throw new ValidationError(`${label} must be an integer between ${min} and ${max}`);
  }
  const num = Number(text);
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new ValidationError(`${label} must be an integer between ${min} and ${max}`);
  }
  return num;
}

function validateYearMonth(year, month, now = new Date()) {
  return {
    year: integerInRange(year, 2000, 2100, 'year', now.getFullYear()),
    month: integerInRange(month, 1, 12, 'month', now.getMonth() + 1)
  };
}

function validateWeeklyTarget(value) {
  return integerInRange(value && value.weeklyTarget !== undefined ? value.weeklyTarget : undefined, 1, 7, 'weeklyTarget');
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// JS getUTCDay(): 0=Sunday..6=Saturday -> ours: 0=Monday..6=Sunday
function mondayBasedDay(weekday) {
  return (weekday + 6) % 7;
}

function isoWeekInfo(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - mondayBasedDay(d.getUTCDay()) + 3); // Thursday of this ISO week
  const year = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - mondayBasedDay(firstThursday.getUTCDay()) + 3);
  const weekNumber = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return { weekNumber, year };
}

function parseDate(dateStr) {
  const parts = String(dateStr).split('-').map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

function weekKey(entry) {
  return `${entry.year}-${String(entry.weekNumber).padStart(2, '0')}`;
}

function weekStart(year, weekNumber) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4.getTime() - mondayBasedDay(jan4.getUTCDay()) * 86400000);
  return new Date(monday.getTime() + (weekNumber - 1) * 7 * 86400000);
}

function buildMonthData(sessions, year, month) {
  const list = Array.isArray(sessions) ? sessions : [];
  const workouts = list
    .filter(s => s && typeof s.date === 'string')
    .map(s => ({
      date: s.date,
      sessionId: s.id || s.sessionId || s.session_id,
      dayKey: s.dayKey || s.day_key || '',
      dayTitle: s.dayTitle || s.day_title || '',
      totalSetsDone: Number(s.totalSetsDone ?? s.total_sets_done ?? 0)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    year,
    month,
    daysInMonth: daysInMonth(year, month),
    firstDayOfWeek: mondayBasedDay(new Date(Date.UTC(year, month - 1, 1)).getUTCDay()),
    workouts,
    totalWorkoutsThisMonth: workouts.length,
    totalSetsThisMonth: workouts.reduce((sum, w) => sum + (Number(w.totalSetsDone) || 0), 0)
  };
}

function buildStreak(dates, weeklyTarget, now = new Date()) {
  const target = Number(weeklyTarget) > 0 ? Number(weeklyTarget) : 4;
  const uniqueDates = [...new Set((Array.isArray(dates) ? dates : []).filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
  const lastWorkoutDate = uniqueDates.length ? uniqueDates[uniqueDates.length - 1] : null;

  const byWeek = new Map();
  for (const date of uniqueDates) {
    const info = isoWeekInfo(parseDate(date));
    const key = weekKey(info);
    if (!byWeek.has(key)) byWeek.set(key, { weekNumber: info.weekNumber, year: info.year, days: new Set() });
    byWeek.get(key).days.add(date);
  }

  const current = isoWeekInfo(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
  const currentKey = weekKey(current);
  const counts = new Map();
  for (const [key, week] of byWeek.entries()) counts.set(key, week.days.size);

  const thisWeekWorkouts = counts.get(currentKey) || 0;
  const isTargetMetThisWeek = thisWeekWorkouts >= target;

  // Current streak: count back from this week, or from last week when this week
  // has not reached the target yet (e.g. on a Monday the week has just started).
  let cursor = weekStart(current.year, current.weekNumber);
  if (!isTargetMetThisWeek) cursor = new Date(cursor.getTime() - 7 * 86400000);
  let currentStreakWeeks = 0;
  while ((counts.get(weekKey(isoWeekInfo(cursor))) || 0) >= target) {
    currentStreakWeeks++;
    cursor = new Date(cursor.getTime() - 7 * 86400000);
  }

  // Best streak: scan every week from the earliest workout to the current week.
  let bestStreakWeeks = 0;
  if (uniqueDates.length) {
    let run = 0;
    let week = weekStart(isoWeekInfo(parseDate(uniqueDates[0])).year, isoWeekInfo(parseDate(uniqueDates[0])).weekNumber);
    const end = weekStart(current.year, current.weekNumber);
    while (week.getTime() <= end.getTime()) {
      if ((counts.get(weekKey(isoWeekInfo(week))) || 0) >= target) {
        run++;
        if (run > bestStreakWeeks) bestStreakWeeks = run;
      } else {
        run = 0;
      }
      week = new Date(week.getTime() + 7 * 86400000);
    }
  }

  const weeklyHistory = [];
  for (let i = 0; i < 8; i++) {
    const week = new Date(weekStart(current.year, current.weekNumber).getTime() - i * 7 * 86400000);
    const info = isoWeekInfo(week);
    const daysTrained = counts.get(weekKey(info)) || 0;
    weeklyHistory.push({
      weekNumber: info.weekNumber,
      year: info.year,
      daysTrained,
      targetMet: daysTrained >= target
    });
  }

  return {
    currentStreakWeeks,
    bestStreakWeeks,
    thisWeekWorkouts,
    weeklyTarget: target,
    isTargetMetThisWeek,
    lastWorkoutDate,
    weeklyHistory
  };
}

module.exports = {
  ValidationError,
  validateYearMonth,
  validateWeeklyTarget,
  buildMonthData,
  buildStreak,
  isoWeekInfo
};
