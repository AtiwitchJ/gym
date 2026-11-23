// server/volume-landmarks.js
// Weekly Muscle Volume Landmarks (MEV / MAV / MRV) — pure logic, zero DB migration.
// Uses the 11 canonical slugs from muscle-slug-map.js and the existing warmup
// filter from set-classification.js so working-set counts match the rest of the app.

const { weekStartOf } = require('./volume');
const { isWarmupSet } = require('./exercise-stats');
const { MUSCLE_BY_EXERCISE_ID } = require('./recovery');
const { MUSCLE_KEYS, MUSCLE_KEY_SET, muscleKeyFor, normalizeToWhitelist } = require('./muscle-slug-map');

// Per-muscle landmark targets (sets per week). Based on RP Hypertrophy
// volume landmarks: MEV = minimum effective, MAV = adaptive/optimal,
// MRV = maximum recoverable. Values follow the RE report wireframe.
const LANDMARKS = {
  chest:      { mev: 8,  mav: 16, mrv: 22, category: 'upper',    nameTh: 'อก (Chest)' },
  lats:       { mev: 10, mav: 18, mrv: 22, category: 'upper',    nameTh: 'หลังและปีก (Lats & Back)' },
  biceps:     { mev: 6,  mav: 14, mrv: 20, category: 'arms_core', nameTh: 'หน้าแขน (Biceps)' },
  triceps:    { mev: 6,  mav: 14, mrv: 20, category: 'arms_core', nameTh: 'หลังแขน (Triceps)' },
  quads:      { mev: 8,  mav: 14, mrv: 20, category: 'lower',    nameTh: 'หน้าขา (Quads)' },
  hamstrings: { mev: 6,  mav: 12, mrv: 18, category: 'lower',    nameTh: 'หลังขา (Hamstrings)' },
  glutes:     { mev: 6,  mav: 12, mrv: 18, category: 'lower',    nameTh: 'ก้น/สะโพก (Glutes)' },
  delts:      { mev: 8,  mav: 16, mrv: 22, category: 'upper',    nameTh: 'หัวไหล่ (Delts)' },
  abs:        { mev: 6,  mav: 14, mrv: 20, category: 'arms_core', nameTh: 'หน้าท้อง/แกนกลาง (Abs & Core)' },
  calves:     { mev: 6,  mav: 12, mrv: 18, category: 'lower',    nameTh: 'น่อง (Calves)' },
  traps:      { mev: 6,  mav: 12, mrv: 18, category: 'upper',    nameTh: 'บ่า/สะพานคอ (Traps)' }
};

const STATUS_LABELS = {
  under: 'ต่ำกว่าเกณฑ์',
  optimal: 'เติบโตเหมาะสม',
  near_mrv: 'ใกล้เพดานฟื้นตัว',
  overreached: 'เกินขีดจำกัด (MRV)'
};

const RECOMMENDATIONS = {
  under: (d) => `ต้องการอีก ${Math.max(1, d.mev - d.setsDone)} เซ็ตเพื่อแตะระดับการกระตุ้นขั้นต่ำ (MEV)`,
  optimal: () => 'อยู่ในช่วงกระตุ้นกล้ามเนื้อสูงสุด รักษาปริมาณนี้ไว้',
  near_mrv: () => 'ใกล้เพดานการฟื้นตัว ระวังการสะสมความล้า ติดตามอาการข้อต่อ',
  overreached: () => 'เกินขีดจำกัดการฟื้นตัว เสี่ยงสะสมความล้า แนะนำงดเพิ่มเซ็ตในสัปดาห์นี้'
};

function statusFor(setsDone, { mev, mav, mrv }) {
  if (setsDone < mev) return 'under';
  if (setsDone <= mav) return 'optimal';
  if (setsDone <= mrv) return 'near_mrv';
  return 'overreached';
}

/**
 * rows: [{ exerciseId, date, done, type, ... }] from repo.getCompletedSetVolumeRows().
 * nowMs: epoch ms used to determine the current week (Monday-Sunday, UTC).
 */
function buildVolumeLandmarks(rows, nowMs = Date.now()) {
  const currentWeek = weekStartOf(new Date(nowMs).toISOString().slice(0, 10));
  const counts = new Map(MUSCLE_KEYS.map((k) => [k, 0]));

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || !row.done || isWarmupSet({ type: row.type })) continue;
    if (weekStartOf(row.date) !== currentWeek) continue;
    const label = MUSCLE_BY_EXERCISE_ID[row.exerciseId];
    if (!label) continue;
    const key = normalizeToWhitelist(muscleKeyFor(label));
    if (!key || !MUSCLE_KEY_SET.has(key)) continue;
    counts.set(key, counts.get(key) + 1);
  }

  const landmarks = MUSCLE_KEYS.map((key) => {
    const target = LANDMARKS[key];
    const setsDone = counts.get(key);
    const status = statusFor(setsDone, target);
    return {
      muscleKey: key,
      displayNameTh: target.nameTh,
      category: target.category,
      setsDone,
      mev: target.mev,
      mav: target.mav,
      mrv: target.mrv,
      status,
      statusLabelTh: STATUS_LABELS[status],
      progressPct: Math.round((setsDone / target.mav) * 100),
      recommendationTh: RECOMMENDATIONS[status]({ setsDone, mev: target.mev })
    };
  });

  const optimalCount = landmarks.filter((l) => l.status === 'optimal').length;
  const underCount = landmarks.filter((l) => l.status === 'under').length;
  const overreachedCount = landmarks.filter((l) => l.status === 'overreached').length;
  const totalWorkingSets = landmarks.reduce((sum, l) => sum + l.setsDone, 0);

  let status = 'productive';
  if (overreachedCount > 0) status = 'overreached';
  else if (optimalCount === 0) status = 'undertrained';

  return {
    weekStart: currentWeek,
    summary: { totalWorkingSets, optimalCount, underCount, overreachedCount, status },
    landmarks
  };
}

module.exports = {
  LANDMARKS,
  STATUS_LABELS,
  statusFor,
  buildVolumeLandmarks
};
