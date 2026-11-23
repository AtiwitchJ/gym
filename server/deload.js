// server/deload.js
// Deload Week Detection & Volume/Intensity Tapering Advisor (pure logic).
// Calculates ACWR (Acute:Chronic Workload Ratio), rising fatigue streaks,
// and tapering guidance across the last 6 weeks.

const { weekStartOf, recentWeekStarts } = require('./volume');
const { isWarmupSet } = require('./exercise-stats');

const WEEKS_COUNT = 6;

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Builds deload analysis and tapering recommendations.
 * Pure function: inputs are history array and optional nowMs epoch timestamp.
 *
 * @param {Array} history - Array of session objects from repo.getHistory()
 * @param {number} [nowMs=Date.now()] - Current epoch timestamp
 * @returns {Object} Deload analysis payload matching API specification
 */
function buildDeload(history, nowMs = Date.now()) {
  const starts = recentWeekStarts(nowMs, WEEKS_COUNT);
  const buckets = new Map();

  for (const start of starts) {
    buckets.set(start, {
      weekStart: start,
      sessions: 0,
      loadAu: 0,
      workingSets: 0,
      hasPain: false
    });
  }

  const sessionList = Array.isArray(history) ? history : [];
  let totalSessionsFound = 0;

  for (const s of sessionList) {
    if (!s || typeof s.date !== 'string') continue;
    const wStart = weekStartOf(s.date);
    if (!wStart || !buckets.has(wStart)) continue;

    const b = buckets.get(wStart);
    b.sessions += 1;
    totalSessionsFound += 1;

    const load = Number(s.sessionLoadAu);
    if (Number.isFinite(load) && load > 0) {
      b.loadAu += load;
    }

    const jc = s.jointComfort || s.joint_discomfort || s.joint_comfort;
    if (jc === 'pain') {
      b.hasPain = true;
    }

    if (Array.isArray(s.exercises)) {
      for (const ex of s.exercises) {
        if (Array.isArray(ex && ex.sets)) {
          for (const set of ex.sets) {
            if (set && set.done && !isWarmupSet({ type: set.type })) {
              b.workingSets += 1;
            }
          }
        }
      }
    }
  }

  const weeks = starts.map((start) => {
    const b = buckets.get(start);
    return {
      weekStart: b.weekStart,
      sessions: b.sessions,
      loadAu: Math.round(b.loadAu),
      workingSets: b.workingSets
    };
  });

  const currentWeek = weeks[WEEKS_COUNT - 1];
  const acuteLoadAu = currentWeek.loadAu;

  // Chronic load: rounded mean of the 4 preceding weeks (index 1..4)
  const prev4 = [weeks[1], weeks[2], weeks[3], weeks[4]];
  const sumPrev4 = prev4.reduce((acc, w) => acc + w.loadAu, 0);
  const chronicLoadAu = Math.round(sumPrev4 / 4);

  const acwr = chronicLoadAu > 0 ? round2(acuteLoadAu / chronicLoadAu) : null;

  // risingWeeks: strictly increasing consecutive weeks ending at current week
  let risingWeeks = 0;
  for (let i = WEEKS_COUNT - 1; i > 0; i--) {
    if (weeks[i].loadAu > weeks[i - 1].loadAu) {
      risingWeeks += 1;
    } else {
      break;
    }
  }

  const current = {
    weekStart: currentWeek.weekStart,
    acuteLoadAu,
    chronicLoadAu,
    acwr,
    risingWeeks
  };

  const taper = {
    setReductionPct: 50,
    targetRir: '3–4',
    suggestedSetsPerExercise: 3
  };

  // Signals
  const signals = [];
  if (acwr !== null && acwr > 1.5) signals.push('acwr_high');
  if (risingWeeks >= 4) signals.push('rising_4w');

  const currentHasPain = buckets.get(starts[WEEKS_COUNT - 1]).hasPain;
  const prevHasPain = buckets.get(starts[WEEKS_COUNT - 2]).hasPain;
  if (currentHasPain || prevHasPain) signals.push('joint_pain');

  if (acwr !== null && acwr < 0.8) signals.push('low_acwr');

  // If empty history or insufficient data
  if (totalSessionsFound === 0) {
    return {
      weeks,
      current,
      recommendation: {
        status: 'hold',
        labelTh: 'รักษาจังหวะ',
        reasonTh: 'ข้อมูลยังไม่พอสำหรับวิเคราะห์ความล้า',
        signals: [],
        taper
      }
    };
  }

  // Status decision
  const isDeload = signals.includes('acwr_high') || signals.includes('rising_4w') || signals.includes('joint_pain');
  const isPush = !isDeload && signals.length === 1 && signals[0] === 'low_acwr';

  let status = 'hold';
  let labelTh = 'รักษาจังหวะ';
  let reasonTh = 'ภาระการฝึกอยู่ในระดับสมดุล (ACWR 0.8–1.5) ซ้อมตามโปรแกรมปกติได้';

  if (isDeload) {
    status = 'deload';
    labelTh = 'สัปดาห์ลดโหลด (Deload)';
    const reasons = [];
    if (signals.includes('acwr_high')) reasons.push(`อัตราส่วนความล้า (ACWR ${acwr}) สูงเกิน 1.5`);
    if (signals.includes('rising_4w')) reasons.push(`ภาระการฝึกเพิ่มขึ้นต่อเนื่อง ${risingWeeks} สัปดาห์`);
    if (signals.includes('joint_pain')) reasons.push('มีรายงานอาการปวดข้อต่อ (joint pain)');
    reasonTh = `แนะนำ Deload: ${reasons.join(', ')} ควรลดจำนวนเซ็ตลง 50% และเว้นแรงสำรอง RIR 3–4 เพื่อฟื้นฟูร่างกาย`;
  } else if (isPush) {
    status = 'push';
    labelTh = 'พร้อมเพิ่มโหลด';
    reasonTh = `อัตราส่วนความล้า (ACWR ${acwr}) ต่ำกว่า 0.8 ร่างกายฟื้นตัวเต็มที่ พร้อมเพิ่มน้ำหนักหรือจำนวนครั้ง`;
  }

  return {
    weeks,
    current,
    recommendation: {
      status,
      labelTh,
      reasonTh,
      signals,
      taper
    }
  };
}

module.exports = {
  WEEKS_COUNT,
  round2,
  buildDeload
};
