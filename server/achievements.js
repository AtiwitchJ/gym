// Workout Achievements & Milestones engine (Hevy / Strong parity).
// Pure logic: badges are derived from existing workout data only.
// No new tables, no schema migration, no writes to the database.

const { isWarmupSet } = require('./set-classification');
const { buildStreak } = require('./calendar');

// metric: key in the computed metrics object
// target: threshold required to unlock
const ACHIEVEMENT_DEFS = [
  { id: 'first_workout', icon: '🏋️', name: 'รอบแรกของการเดินทาง', nameEn: 'First Workout', description: 'บันทึกเซสชันการฝึกครั้งแรก', category: 'consistency', metric: 'sessions', target: 1 },
  { id: 'workouts_10', icon: '📅', name: 'ฝึกครบ 10 รอบ', nameEn: '10 Workouts', description: 'สะสมเซสชันการฝึกให้ครบ 10 รอบ', category: 'consistency', metric: 'sessions', target: 10 },
  { id: 'workouts_50', icon: '🔥', name: 'ฝึกครบ 50 รอบ', nameEn: '50 Workouts', description: 'สะสมเซสชันการฝึกให้ครบ 50 รอบ', category: 'consistency', metric: 'sessions', target: 50 },
  { id: 'sets_100', icon: '🔢', name: '100 เซ็ตแรก', nameEn: '100 Sets', description: 'ติ๊กสำเร็จ 100 เซ็ต', category: 'volume', metric: 'sets', target: 100 },
  { id: 'sets_500', icon: '💪', name: '500 เซ็ต', nameEn: '500 Sets', description: 'ติ๊กสำเร็จ 500 เซ็ต', category: 'volume', metric: 'sets', target: 500 },
  { id: 'volume_1000', icon: '⚖️', name: 'ยกครบ 1,000 กก.', nameEn: '1 Ton Lifted', description: 'ปริมาณ working set สะสม 1,000 กก. (ไม่รวมวอร์ม)', category: 'volume', metric: 'volume', target: 1000 },
  { id: 'volume_10000', icon: '🏆', name: 'ยกครบ 10,000 กก.', nameEn: '10 Ton Club', description: 'ปริมาณ working set สะสม 10,000 กก. (ไม่รวมวอร์ม)', category: 'volume', metric: 'volume', target: 10000 },
  { id: 'streak_4', icon: '🗓️', name: 'ต่อเนื่อง 4 สัปดาห์', nameEn: '4-Week Streak', description: 'ฝึกให้ได้เป้าหมายรายสัปดาห์ 4 สัปดาห์ติดต่อกัน', category: 'consistency', metric: 'streak', target: 4 },
  { id: 'exercises_10', icon: '🧰', name: 'ฝึกครบ 10 ท่า', nameEn: '10 Exercises', description: 'เล่นท่าที่แตกต่างกัน 10 ท่า', category: 'variety', metric: 'exercises', target: 10 },
  { id: 'weighins_10', icon: '📈', name: 'ชั่งน้ำหนัก 10 ครั้ง', nameEn: '10 Check-ins', description: 'บันทึกน้ำหนักตัว 10 ครั้ง', category: 'body', metric: 'weighins', target: 10 }
];

const CUMULATIVE_METRICS = new Set(['sessions', 'sets', 'volume', 'exercises']);

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Build the achievements payload from already-loaded data.
 * @param {object} input
 * @param {Array}  input.history       repo.getHistory()
 * @param {Array}  input.workoutDates  repo.getWorkoutDates()
 * @param {Array}  input.bodyWeights   repo.getBodyWeights()
 * @param {number} input.weeklyTarget  repo.getWeeklyTarget()
 * @param {Date}   input.now
 */
function buildAchievements(input = {}) {
  const sessions = (Array.isArray(input.history) ? input.history : [])
    .filter(s => s && typeof s === 'object')
    .slice()
    .sort((a, b) => {
      const d = String(a.date || '').localeCompare(String(b.date || ''));
      if (d !== 0) return d;
      return String(a.time || '').localeCompare(String(b.time || ''));
    });

  const cumulative = { sessions: 0, sets: 0, volume: 0, exercises: 0 };
  const exercised = new Set();
  const crossing = {};

  for (const session of sessions) {
    cumulative.sessions += 1;

    const exercises = Array.isArray(session.exercises) ? session.exercises : [];
    for (const exercise of exercises) {
      if (!exercise || !Array.isArray(exercise.sets)) continue;
      const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
      for (const set of sets) {
        if (!set || !set.done) continue;
        cumulative.sets += 1;

        const weight = toNumber(set.weight);
        const repsRaw = set.actualReps !== undefined && set.actualReps !== null
          ? set.actualReps
          : set.reps;
        const reps = toNumber(repsRaw);

        if (!isWarmupSet(set) && weight > 0 && reps > 0) {
          cumulative.volume += weight * reps;
        }
      }
      if (sets.some(set => set && set.done)) {
        const key = String(exercise.canonicalId || exercise.id || '').trim();
        if (key) exercised.add(key);
      }
    }
    cumulative.exercises = exercised.size;

    for (const def of ACHIEVEMENT_DEFS) {
      if (!CUMULATIVE_METRICS.has(def.metric) || crossing[def.id]) continue;
      if ((cumulative[def.metric] || 0) >= def.target) {
        crossing[def.id] = String(session.date || '');
      }
    }
  }

  const streak = buildStreak(input.workoutDates, input.weeklyTarget, input.now || new Date());
  const bodyWeights = Array.isArray(input.bodyWeights) ? input.bodyWeights : [];

  const metrics = {
    sessions: cumulative.sessions,
    sets: cumulative.sets,
    volume: round1(cumulative.volume),
    exercises: cumulative.exercises,
    streak: Number(streak.bestStreakWeeks) || 0,
    weighins: bodyWeights.length
  };

  const badges = ACHIEVEMENT_DEFS.map(def => {
    const current = Math.max(0, toNumber(metrics[def.metric]));
    const unlocked = current >= def.target;
    const percent = Math.min(100, Math.round((current / def.target) * 100));
    return {
      id: def.id,
      icon: def.icon,
      name: def.name,
      nameEn: def.nameEn,
      description: def.description,
      category: def.category,
      metric: def.metric,
      target: def.target,
      unlocked,
      unlockedAt: unlocked ? (crossing[def.id] || null) : null,
      progress: {
        current: Math.min(current, def.target),
        raw: round1(current),
        target: def.target,
        percent
      }
    };
  });

  return {
    summary: {
      total: badges.length,
      unlockedCount: badges.filter(b => b.unlocked).length,
      totalSessions: metrics.sessions,
      totalSets: metrics.sets,
      totalVolume: metrics.volume,
      totalExercises: metrics.exercises,
      bestStreakWeeks: metrics.streak,
      weighIns: metrics.weighins
    },
    badges
  };
}

module.exports = { buildAchievements, ACHIEVEMENT_DEFS };
