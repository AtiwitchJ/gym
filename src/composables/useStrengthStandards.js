import { ref } from 'vue';

/**
 * Strength Standards & Relative Strength Classifier (GET /api/strength-standards).
 * Response: { bodyWeight, bodyWeightDate, hasBodyWeight, hasWorkouts,
 *   overall: { level, levelLabelTh, strengthScore, summaryTh, balance },
 *   benchmarks: [{ exerciseId, displayNameTh, category, icon, bestE1rm, bestWeight,
 *     bestReps, ratio, level, levelLabelTh, nextLevel, nextLevelLabelTh,
 *     kgToNextLevel, progressPct, thresholds }] }
 */

export const STANDARDS_ERROR_MESSAGE = 'โหลดมาตรฐานความแข็งแรงไม่ได้';
export const STANDARDS_TIMEOUT_MESSAGE = 'การโหลดใช้เวลานานเกินไป — กดลองอีกครั้ง';
export const DEFAULT_LOAD_TIMEOUT_MS = 10000;

export const TIER_META = {
  untrained: { icon: '⚪', badge: 'bg-paper-dim text-ink-muted border-plate', bar: '#94a3b8' },
  novice: { icon: '🔵', badge: 'bg-sky-bg text-sky-text border-sky', bar: '#0284c7' },
  intermediate: { icon: '🟢', badge: 'bg-emerald-bg text-emerald-text border-emerald', bar: '#059669' },
  advanced: { icon: '🟣', badge: 'bg-purple-100 text-purple-900 border-purple-600', bar: '#7c3aed' },
  elite: { icon: '🔴', badge: 'bg-flame-bg text-flame-text border-flame', bar: '#e11d48' },
  unrated: { icon: '⚖️', badge: 'bg-paper-dim text-ink-muted border-plate', bar: '#cbd5e1' }
};

export const CATEGORY_META = {
  push: { label: 'ผลัก (Push)', icon: '🤜' },
  pull: { label: 'ดึง (Pull)', icon: '🤛' },
  legs: { label: 'ท่อนล่าง (Legs)', icon: '🦵' }
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function normalizeStrengthStandards(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.benchmarks) || !payload.overall) {
    throw new Error('Invalid strength standards payload');
  }
  const o = payload.overall;
  const balance = o.balance && typeof o.balance === 'object' ? o.balance : null;
  return {
    bodyWeight: payload.hasBodyWeight ? toNumber(payload.bodyWeight) : null,
    bodyWeightDate: payload.bodyWeightDate ? String(payload.bodyWeightDate) : null,
    hasBodyWeight: Boolean(payload.hasBodyWeight),
    hasWorkouts: Boolean(payload.hasWorkouts),
    overall: {
      level: TIER_META[o.level] ? o.level : 'unrated',
      levelLabelTh: String(o.levelLabelTh ?? 'ยังไม่ระบุ'),
      strengthScore: toNumber(o.strengthScore),
      summaryTh: String(o.summaryTh ?? ''),
      balance: balance
        ? {
            pushScore: toNumber(balance.pushScore),
            pullScore: toNumber(balance.pullScore),
            legsScore: toNumber(balance.legsScore),
            dominantGroup: balance.dominantGroup && CATEGORY_META[balance.dominantGroup] ? balance.dominantGroup : null,
            laggingGroup: balance.laggingGroup && CATEGORY_META[balance.laggingGroup] ? balance.laggingGroup : null,
            recommendationTh: String(balance.recommendationTh ?? '')
          }
        : null
    },
    benchmarks: payload.benchmarks.map((b) => ({
      exerciseId: String(b?.exerciseId ?? ''),
      displayNameTh: String(b?.displayNameTh ?? ''),
      category: CATEGORY_META[b?.category] ? b.category : 'push',
      icon: String(b?.icon ?? TIER_META[b?.level]?.icon ?? '🏋️'),
      bestE1rm: toNumber(b?.bestE1rm),
      bestWeight: toNumber(b?.bestWeight),
      bestReps: toNumber(b?.bestReps),
      ratio: toNumber(b?.ratio),
      level: TIER_META[b?.level] ? b.level : 'untrained',
      levelLabelTh: String(b?.levelLabelTh ?? ''),
      nextLevel: b?.nextLevel && TIER_META[b.nextLevel] ? b.nextLevel : null,
      nextLevelLabelTh: b?.nextLevelLabelTh ? String(b.nextLevelLabelTh) : null,
      kgToNextLevel: toNumber(b?.kgToNextLevel),
      progressPct: toNumber(b?.progressPct),
      thresholds: {
        untrained: toNumber(b?.thresholds?.untrained),
        novice: toNumber(b?.thresholds?.novice),
        intermediate: toNumber(b?.thresholds?.intermediate),
        advanced: toNumber(b?.thresholds?.advanced),
        elite: toNumber(b?.thresholds?.elite)
      }
    }))
  };
}

export function useStrengthStandards(fetchImpl = globalThis.fetch, { timeoutMs = DEFAULT_LOAD_TIMEOUT_MS } = {}) {
  const data = ref(null);
  const loading = ref(false);
  const error = ref('');

  async function load() {
    loading.value = true;
    error.value = '';
    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
    try {
      const res = await Promise.race([fetchImpl('/api/strength-standards'), timeout]);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body && body.error ? body.error : `HTTP ${res.status}`);
      data.value = normalizeStrengthStandards(body);
      return true;
    } catch (err) {
      error.value = err && err.message === 'timeout' ? STANDARDS_TIMEOUT_MESSAGE : STANDARDS_ERROR_MESSAGE;
      data.value = null;
      return false;
    } finally {
      clearTimeout(timer);
      loading.value = false;
    }
  }

  return { data, loading, error, load };
}
