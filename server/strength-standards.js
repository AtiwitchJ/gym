// server/strength-standards.js
// Strength Standards & Relative Strength Classifier — pure logic, zero DB migration.
// Benchmarks follow the Kilgore / ExRx relative-strength tables (e1RM / bodyweight).
// Reads existing session set rows + latest body weight; it never writes to the DB.

const { calculateEstimated1RM } = require('./estimate');
const { isWarmupSet } = require('./set-classification');

const LEVELS = ['untrained', 'novice', 'intermediate', 'advanced', 'elite'];

const LEVEL_LABEL_TH = {
  untrained: { full: 'ยังไม่ฝึก (Untrained)', short: 'ยังไม่ฝึก' },
  novice: { full: 'ผู้เริ่มต้น (Novice)', short: 'ผู้เริ่มต้น' },
  intermediate: { full: 'ระดับกลาง (Intermediate)', short: 'ระดับกลาง' },
  advanced: { full: 'ระดับสูง (Advanced)', short: 'ระดับสูง' },
  elite: { full: 'ระดับหัวกะทิ (Elite)', short: 'ระดับหัวกะทิ' }
};

const CATEGORY_TH = { push: 'ผลัก (Push)', pull: 'ดึง (Pull)', legs: 'ท่อนล่าง (Legs)' };
const CATEGORIES = ['push', 'pull', 'legs'];

// Ordered archetypes. The first pattern that matches (exercise id + name) wins.
// thresholds are the lower-bound BW multipliers for [novice, intermediate, advanced, elite].
const BENCHMARKS = [
  {
    id: 'deadlift',
    nameTh: 'เดดลิฟต์ / RDL / ฮิปทรัสต์ (Deadlift & Hinge)',
    category: 'legs',
    icon: '🔒',
    pattern: /deadlift|rdl|romanian|hip.?thrust|good.?morning/i,
    thresholds: [1.00, 1.50, 2.00, 2.60]
  },
  {
    id: 'squat',
    nameTh: 'สควอท / เลกเพรส (Squat & Leg Press)',
    category: 'legs',
    icon: '🦵',
    pattern: /squat|leg.?press|hack|bulgarian|goblet|lunge/i,
    thresholds: [1.20, 1.70, 2.20, 2.80]
  },
  {
    id: 'ohp',
    nameTh: 'กดไหล่เหนือหัว (Overhead Press)',
    category: 'push',
    icon: '🙌',
    pattern: /overhead.*press|shoulder.?press|military|ohp|arnold/i,
    thresholds: [0.40, 0.55, 0.70, 0.95]
  },
  {
    id: 'lat',
    nameTh: 'ลากพูลดาวน์ / ดึงข้อ (Lat Pulldown & Pull-Up)',
    category: 'pull',
    icon: '🧗',
    pattern: /pulldown|pull.?up|lat.?pull|assisted.?pull/i,
    thresholds: [0.60, 0.75, 1.00, 1.25]
  },
  {
    id: 'row',
    nameTh: 'โรว์ / พายเรือ (Seated & Barbell Row)',
    category: 'pull',
    icon: '🚣',
    pattern: /row|rowing/i,
    thresholds: [0.55, 0.70, 0.95, 1.20]
  },
  {
    id: 'bench',
    nameTh: 'เบนช์เพรส / กดอก (Chest Press)',
    category: 'push',
    icon: '🏋️',
    pattern: /bench|chest|dip|pec|fly|crossover/i,
    thresholds: [0.60, 0.80, 1.05, 1.40]
  }
];

const MUSCLE_FALLBACK = {
  chest: 'bench',
  delts: 'ohp',
  back: 'lat',
  quads: 'squat',
  hamstrings: 'deadlift'
};

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Map one workout row to a benchmark archetype, or null when not a comparable lift. */
function benchmarkFor(row) {
  const haystack = `${row && row.exerciseId ? row.exerciseId : ''} ${row && row.exerciseName ? row.exerciseName : ''}`.toLowerCase();
  for (const benchmark of BENCHMARKS) {
    if (benchmark.pattern.test(haystack)) return benchmark;
  }
  const muscleGroup = String((row && row.muscleGroup) || '').toLowerCase();
  const fallbackId = MUSCLE_FALLBACK[muscleGroup];
  return fallbackId ? BENCHMARKS.find((b) => b.id === fallbackId) || null : null;
}

/**
 * Tier index (0..4) plus within-tier progress (0..100) for a bodyweight ratio.
 * The elite tier has no upper bound in the reference table, so it reads as 100%.
 */
function levelInfo(ratio, thresholds) {
  let idx = 0;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (ratio + 1e-9 >= thresholds[i]) idx = i + 1;
  }
  if (idx === LEVELS.length - 1 && ratio >= thresholds[thresholds.length - 1]) {
    return { idx, pct: 100 };
  }
  const lower = idx === 0 ? 0 : thresholds[idx - 1];
  const upper = thresholds[idx];
  const pct = Math.round(clamp(((ratio - lower) / (upper - lower)) * 100, 0, 100));
  return { idx, pct };
}

function unratedOverall(messageTh) {
  return {
    level: 'unrated',
    levelLabelTh: 'ยังไม่ระบุ',
    strengthScore: 0,
    summaryTh: messageTh,
    balance: null
  };
}

/**
 * Build the full standards payload.
 * @param {object} input
 * @param {number|null} input.bodyWeight latest logged bodyweight (kg)
 * @param {string|null} input.bodyWeightDate ISO date of that weight
 * @param {Array} input.rows rows from repo.getCompletedSetVolumeRows()
 * @returns {object} { bodyWeight, bodyWeightDate, hasBodyWeight, hasWorkouts, overall, benchmarks }
 */
function buildStrengthStandards({ bodyWeight, bodyWeightDate, rows } = {}) {
  const bw = Number(bodyWeight);
  const validBw = Number.isFinite(bw) && bw >= 20 && bw <= 300 ? bw : null;
  const setRows = Array.isArray(rows) ? rows : [];
  const hasWorkouts = setRows.length > 0;

  if (validBw === null) {
    return {
      bodyWeight: null,
      bodyWeightDate: null,
      hasBodyWeight: false,
      hasWorkouts,
      overall: unratedOverall('กรุณาบันทึกน้ำหนักตัวเพื่อประเมินมาตรฐานความแข็งแรง'),
      benchmarks: []
    };
  }

  // Best qualifying set per archetype: completed, non-warmup, positive weight/reps.
  const best = new Map();
  for (const row of setRows) {
    if (!row || !row.done || isWarmupSet({ type: row.type })) continue;
    const weight = Number(row.weight);
    const reps = Number(row.actualReps);
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps <= 0) continue;
    const benchmark = benchmarkFor(row);
    if (!benchmark) continue;
    // repo.getCompletedSetVolumeRows() does not carry RIR, so this is the
    // conservative Epley estimate from weight x reps only.
    const e1rm = calculateEstimated1RM(weight, reps, row.rir);
    if (!Number.isFinite(e1rm) || e1rm <= 0) continue;

    const current = best.get(benchmark.id);
    if (!current || e1rm > current.e1rm + 1e-9) {
      best.set(benchmark.id, {
        benchmark,
        exerciseId: row.exerciseId || benchmark.id,
        e1rm,
        weight,
        reps
      });
    }
  }

  const internal = [];
  const benchmarks = BENCHMARKS.filter((b) => best.has(b.id)).map((benchmark) => {
    const hit = best.get(benchmark.id);
    const ratio = round(hit.e1rm / validBw, 2);
    const thresholdsKg = roundArray(benchmark.thresholds.map((t) => t * validBw), 1);
    const { idx, pct } = levelInfo(ratio, benchmark.thresholds);
    const level = LEVELS[idx];
    const nextLevel = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
    internal.push({ idx, pct, category: benchmark.category });

    return {
      exerciseId: hit.exerciseId,
      displayNameTh: benchmark.nameTh,
      category: benchmark.category,
      icon: benchmark.icon,
      bestE1rm: hit.e1rm,
      bestWeight: hit.weight,
      bestReps: hit.reps,
      ratio,
      level,
      levelLabelTh: LEVEL_LABEL_TH[level].short,
      nextLevel,
      nextLevelLabelTh: nextLevel ? LEVEL_LABEL_TH[nextLevel].short : null,
      kgToNextLevel: nextLevel ? round(thresholdsKg[idx] - hit.e1rm, 1) : 0,
      progressPct: pct,
      thresholds: {
        untrained: 0,
        novice: thresholdsKg[0],
        intermediate: thresholdsKg[1],
        advanced: thresholdsKg[2],
        elite: thresholdsKg[3]
      }
    };
  });

  // Overall level/score: mean of (tier + within-tier progress) across comparable lifts.
  let tierSum = 0;
  const perCategory = { push: [], pull: [], legs: [] };
  for (const item of internal) {
    tierSum += item.idx + item.pct / 100;
    perCategory[item.category].push(((item.idx + item.pct / 100) / (LEVELS.length - 1)) * 100);
  }
  const count = internal.length;
  const avgTier = count ? tierSum / count : 0;
  const strengthScore = count ? Math.round(clamp((avgTier / (LEVELS.length - 1)) * 100, 0, 100)) : 0;
  const level = count ? LEVELS[clamp(Math.round(avgTier), 0, LEVELS.length - 1)] : 'untrained';

  // Balance across Push / Pull / Legs using the same 0-100 category scores.
  const balanceScores = {};
  for (const category of CATEGORIES) {
    const values = perCategory[category];
    balanceScores[category] = values.length
      ? Math.round(clamp(values.reduce((a, b) => a + b, 0) / values.length, 0, 100))
      : 0;
  }
  const ranked = CATEGORIES.filter((c) => balanceScores[c] > 0).sort((a, b) => balanceScores[b] - balanceScores[a]);
  const dominantGroup = ranked.length ? ranked[0] : null;
  const laggingGroup = ranked.length > 1 ? ranked[ranked.length - 1] : null;
  const gap = dominantGroup && laggingGroup ? balanceScores[dominantGroup] - balanceScores[laggingGroup] : 0;

  let recommendationTh = 'ยังไม่มีข้อมูลเพียงพอวิเคราะห์ความสมดุลกล้ามเนื้อ';
  if (count > 0 && !dominantGroup) {
    recommendationTh = 'ยังไม่มีท่าหลักที่เทียบเกณฑ์ได้ บันทึกเบนช์ / โรว์ / สควอทเพื่อดูความสมดุล';
  } else if (dominantGroup) {
    recommendationTh = gap > 15
      ? `กลุ่ม${CATEGORY_TH[laggingGroup]}ตามหลังกลุ่ม${CATEGORY_TH[dominantGroup]}มาก (ห่าง ${gap} คะแนน) ควรเพิ่มโวลุ่มและความถี่ในกลุ่มนี้`
      : 'การกระจายความแข็งแรงในกลุ่ม Push / Pull / Legs อยู่ในเกณฑ์สมดุล';
  }

  return {
    bodyWeight: validBw,
    bodyWeightDate: bodyWeightDate ? String(bodyWeightDate) : null,
    hasBodyWeight: true,
    hasWorkouts,
    overall: {
      level,
      levelLabelTh: LEVEL_LABEL_TH[level].full,
      strengthScore,
      summaryTh: `ความแข็งแรงระดับ${LEVEL_LABEL_TH[level].short} แข็งแรงกว่า ${strengthScore}% ของผู้ฝึกทั่วไปในรุ่นน้ำหนักเดียวกัน`,
      balance: count > 0
        ? {
            pushScore: balanceScores.push,
            pullScore: balanceScores.pull,
            legsScore: balanceScores.legs,
            dominantGroup,
            laggingGroup,
            recommendationTh
          }
        : null
    },
    benchmarks
  };
}

function roundArray(values, digits) {
  return values.map((v) => round(v, digits));
}

module.exports = {
  LEVELS,
  LEVEL_LABEL_TH,
  BENCHMARKS,
  benchmarkFor,
  levelInfo,
  round,
  buildStrengthStandards
};
