// History-based weight advice for the next working set (sprint item 1).
// Pure functions: no DB access. Input is repo.getExerciseHistory(id) (newest first).
//
// RULE (the only place it is defined):
//  1. Only completed working sets count. Warm-ups, skipped sets, and sets without weight or reps are ignored.
//  2. Per session, the "top set" is the heaviest completed working set (ties: more reps).
//  3. The latest session with working sets is the basis. The target is the upper bound of the set's
//     stored target range (e.g. "6–8 ครั้ง" -> low 6, high 8). No parseable target -> no advice.
//  4. HOLD the weight (nextWeight = same, nextReps = same as last) when any of these is true:
//     - RIR is 0 (failure or near-failure), or RIR is unknown
//     - reps fell: the previous session had more reps at the same weight
//     - the target reps were not reached, or RIR is 1
//  5. INCREASE by INCREASE_KG (small step) when the target upper bound was reached AND RIR is 2 or more.
//     nextReps = target low end.
//  6. The trend uses only the previous session, so the lastN window is context for the reviewer
//     and does not change the decision.

const { isWarmupSet } = require('./exercise-stats');

const DEFAULT_LAST_N = 3;
const MAX_LAST_N = 20;
const INCREASE_KG = 2;

// "6–8 ครั้ง" -> { low: 6, high: 8 }; "15 ครั้ง" -> { low: 15, high: 15 }; no digits -> null
function parseTargetReps(target) {
  const nums = String(target ?? '').match(/\d+/g);
  if (!nums) return null;
  const values = nums.map(Number);
  return { low: Math.min(...values), high: Math.max(...values) };
}

// Completed working sets of one session, heaviest first (ties: more reps first).
function completedWorkingSets(session) {
  return (Array.isArray(session && session.sets) ? session.sets : [])
    .filter((s) => s && s.done && !isWarmupSet(s) && Number(s.weight) > 0 && Number(s.actualReps) > 0)
    .map((s) => ({
      weight: Number(s.weight),
      reps: Number(s.actualReps),
      rir: s.rir === null || s.rir === undefined || s.rir === '' ? null : Number(s.rir),
      target: parseTargetReps(s.target)
    }))
    .sort((a, b) => b.weight - a.weight || b.reps - a.reps);
}

function decide(latest, previous, step) {
  const top = latest.sets[0];
  const { target } = top;
  const basedOn = { date: latest.date, weight: top.weight, reps: top.reps, rir: top.rir };

  if (!target) {
    return { advice: null, reason: 'no-target' };
  }

  const hold = (reason) => ({
    advice: { action: 'hold', nextWeight: top.weight, nextReps: top.reps, basedOn, reason },
    reason: null
  });

  if (top.rir === null) return hold('ไม่มีค่า RIR จึงคงน้ำหนักเดิม');
  if (top.rir === 0) return hold('RIR 0 (ถึงล้มเหลว) คงน้ำหนักเดิม');

  if (previous) {
    const sameWeight = previous.sets.find((s) => s.weight === top.weight);
    if (sameWeight && top.reps < sameWeight.reps) {
      return hold('ครั้งลดลงจากครั้งก่อนที่น้ำหนักเท่ากัน คงน้ำหนักเดิม');
    }
  }

  if (top.reps >= target.high && top.rir >= 2) {
    return {
      advice: {
        action: 'increase',
        nextWeight: top.weight + step,
        nextReps: target.low,
        basedOn,
        reason: `ถึงเป้า ${target.high} ครั้งที่ RIR ${top.rir} เพิ่ม ${step} kg`
      },
      reason: null
    };
  }

  return hold('ยังไม่ถึงเป้าหมายหรือ RIR 1 คงน้ำหนักเดิม');
}

/**
 * @param {object[]} history - repo.getExerciseHistory() output, newest first
 * @param {{lastN?: number, step?: number}} options
 * @returns {{sessions: object[], advice: object|null, reason: string|null}}
 *   reason: 'no-history' | 'no-target' | null (null when advice exists)
 */
function buildAdvice(history, { lastN = DEFAULT_LAST_N, step = INCREASE_KG } = {}) {
  const sessions = (Array.isArray(history) ? history : [])
    .map((s) => ({
      sessionId: s.sessionId,
      date: s.date,
      time: s.time,
      sets: completedWorkingSets(s)
    }))
    .filter((s) => s.sets.length > 0);

  if (sessions.length === 0) {
    return { sessions: [], advice: null, reason: 'no-history' };
  }

  const window = sessions.slice(0, Math.min(Math.max(1, lastN), MAX_LAST_N));
  const shaped = window.map((s) => ({
    sessionId: s.sessionId,
    date: s.date,
    time: s.time,
    sets: s.sets.map(({ weight, reps, rir }) => ({ weight, reps, rir }))
  }));

  const { advice, reason } = decide(sessions[0], sessions[1], step);
  return { sessions: shaped, advice, reason };
}

module.exports = { buildAdvice, parseTargetReps, DEFAULT_LAST_N, MAX_LAST_N, INCREASE_KG };
