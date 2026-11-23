// server/training-zones.js
// %1RM Training Zones — pure logic, zero DB migration.
// Converts an estimated 1RM into four intensity zones (weight + rep bands),
// mirroring the intensity-zone tables in Strong / Hevy / RP Hypertrophy.

// Percentage bands follow standard NSCA-style intensity zones. Small gaps
// between bands (e.g. 60–65%) are intentional: those loads sit between zones.
const ZONES = [
  {
    id: 'endurance',
    nameTh: 'ความทนทาน (Endurance)',
    icon: '🫁',
    pctMin: 50,
    pctMax: 60,
    repMin: 15,
    repMax: 20,
    focusTh: 'โวลุ่มสูง น้ำหนักต่ำ เพิ่มความทนทานและการไหลเวียน'
  },
  {
    id: 'hypertrophy',
    nameTh: 'สร้างกล้ามเนื้อ (Hypertrophy)',
    icon: '💪',
    pctMin: 65,
    pctMax: 75,
    repMin: 8,
    repMax: 12,
    focusTh: 'ช่วงกระตุ้นกล้ามเนื้อสูงสุด เน้นเวลาใต้ความตึง (TUT)'
  },
  {
    id: 'strength',
    nameTh: 'ความแข็งแรง (Strength)',
    icon: '🏋️',
    pctMin: 80,
    pctMax: 90,
    repMin: 4,
    repMax: 6,
    focusTh: 'น้ำหนักสูง ครั้งน้อย เน้นระบบประสาทและการดันแรง'
  },
  {
    id: 'peaking',
    nameTh: 'พีค/พลัง (Peaking)',
    icon: '⚡',
    pctMin: 92,
    pctMax: 100,
    repMin: 1,
    repMax: 3,
    focusTh: 'ความเข้มข้นสูงสุด ใช้ใกล้วันแข่งหรือทดสอบ 1RM'
  }
];

const MAX_E1RM_KG = 1000;

/** Round to the nearest 0.5 kg so dumbbells and barbell plates both work. */
function roundToHalf(kg) {
  return Math.round(kg * 2) / 2;
}

/** @returns {number|null} clean e1RM, or null when the input is unusable. */
function normalizeE1rm(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_E1RM_KG) return null;
  return n;
}

/**
 * Build the four intensity zones for a given e1RM.
 * @throws {Error} when e1rm is not a finite number in (0, 1000].
 */
function buildTrainingZones(e1rm) {
  const clean = normalizeE1rm(e1rm);
  if (clean === null) {
    throw new Error(`e1rm must be a finite number greater than 0 and at most ${MAX_E1RM_KG}`);
  }

  const zones = ZONES.map((z) => {
    const targetPct = (z.pctMin + z.pctMax) / 2;
    return {
      id: z.id,
      nameTh: z.nameTh,
      icon: z.icon,
      pctMin: z.pctMin,
      pctMax: z.pctMax,
      repMin: z.repMin,
      repMax: z.repMax,
      targetPct,
      weightMin: roundToHalf((clean * z.pctMin) / 100),
      weightMax: roundToHalf((clean * z.pctMax) / 100),
      targetWeight: roundToHalf((clean * targetPct) / 100),
      focusTh: z.focusTh
    };
  });

  return {
    e1rm: clean,
    zones,
    summary: {
      zoneCount: zones.length,
      minWeight: zones[0].weightMin,
      maxWeight: zones[zones.length - 1].weightMax
    }
  };
}

/** Zone id for a load, or null when the load falls in a gap / input is invalid. */
function zoneFor(e1rm, weight) {
  const clean = normalizeE1rm(e1rm);
  const w = Number(weight);
  if (clean === null || !Number.isFinite(w) || w <= 0) return null;
  const pct = (w / clean) * 100;
  const hit = ZONES.find((z) => pct >= z.pctMin && pct <= z.pctMax);
  return hit ? hit.id : null;
}

module.exports = {
  ZONES,
  MAX_E1RM_KG,
  normalizeE1rm,
  roundToHalf,
  buildTrainingZones,
  zoneFor
};
