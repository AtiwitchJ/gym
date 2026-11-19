// Weekly training volume per muscle and per exercise (last 8 weeks, completed sets only).
// Pure functions: no DB or clock access inside. volume = weight × actual reps per set.

const { MUSCLE_BY_EXERCISE_ID } = require('./recovery');

const WEEKS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// 'YYYY-MM-DD' -> 'YYYY-MM-DD' of the Monday starting that week (UTC date arithmetic). null if invalid.
function weekStartOf(dateStr) {
  const t = Date.parse(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(t)) return null;
  const dow = new Date(t).getUTCDay(); // 0 = Sunday
  const shift = (dow + 6) % 7;         // days since Monday
  return new Date(t - shift * DAY_MS).toISOString().slice(0, 10);
}

// The last `weeks` week-start dates, oldest first, ending with the current week.
function recentWeekStarts(nowMs, weeks = WEEKS) {
  const currentStart = weekStartOf(new Date(nowMs).toISOString().slice(0, 10));
  const base = Date.parse(`${currentStart}T00:00:00.000Z`);
  const starts = [];
  for (let i = weeks - 1; i >= 0; i--) {
    starts.push(new Date(base - i * 7 * DAY_MS).toISOString().slice(0, 10));
  }
  return starts;
}

const round1 = (n) => Math.round(n * 10) / 10;

function addEntry(map, key, base, volume) {
  if (!map.has(key)) map.set(key, { ...base, volume: 0, sets: 0 });
  const entry = map.get(key);
  entry.volume += volume;
  entry.sets += 1;
}

// rows: [{ exerciseId, exerciseName, date, done, weight, actualReps }], one per set.
// Returns { weeks: [{ weekStart, muscles: [{muscle, volume, sets}], exercises: [{exerciseId, exerciseName, volume, sets}] }] }
// Every week in the window is present, even when empty. Lists are sorted by volume, highest first.
function buildWeeklyVolume(rows, nowMs = Date.now(), { weeks = WEEKS, muscleById = MUSCLE_BY_EXERCISE_ID } = {}) {
  const starts = recentWeekStarts(nowMs, weeks);
  const buckets = new Map(starts.map((s) => [s, { muscles: new Map(), exercises: new Map() }]));

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || !row.done) continue;
    const weekStart = weekStartOf(row.date);
    if (!weekStart || !buckets.has(weekStart)) continue;

    const weight = Number(row.weight);
    const reps = Number(row.actualReps);
    const volume = weight > 0 && reps > 0 ? weight * reps : 0;
    const bucket = buckets.get(weekStart);

    addEntry(bucket.exercises, row.exerciseId, { exerciseId: row.exerciseId, exerciseName: row.exerciseName || row.exerciseId }, volume);
    if (hasOwn(muscleById, row.exerciseId)) {
      addEntry(bucket.muscles, muscleById[row.exerciseId], { muscle: muscleById[row.exerciseId] }, volume);
    }
  }

  const finish = (map) => [...map.values()]
    .map((e) => ({ ...e, volume: round1(e.volume) }))
    .sort((a, b) => b.volume - a.volume);

  return {
    weeks: starts.map((weekStart) => {
      const b = buckets.get(weekStart);
      return { weekStart, muscles: finish(b.muscles), exercises: finish(b.exercises) };
    }),
  };
}

module.exports = { WEEKS, weekStartOf, recentWeekStarts, buildWeeklyVolume };
