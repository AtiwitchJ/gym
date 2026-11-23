import { ref } from 'vue';

/**
 * 12-Month Training Consistency Heatmap (GET /api/training-heatmap).
 * Response: { range, leadingBlanks, weeks, days, summary,
 *   weekdayDistribution, monthlyDistribution }
 */

export const HEATMAP_ERROR_MESSAGE = 'โหลดข้อมูลความสม่ำเสมอไม่ได้';
export const HEATMAP_TIMEOUT_MESSAGE = 'การโหลดใช้เวลานานเกินไป — กดลองอีกครั้ง';
export const DEFAULT_LOAD_TIMEOUT_MS = 10000;

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function normalizeDay(row) {
  return {
    date: String(row?.date ?? ''),
    sessions: toNumber(row?.sessions),
    sets: toNumber(row?.sets),
    volumeKg: toNumber(row?.volumeKg),
    level: Math.max(0, Math.min(4, Math.round(toNumber(row?.level))))
  };
}

export function normalizeHeatmapPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid heatmap payload');
  const summary = payload.summary || {};
  return {
    range: {
      start: String(payload.range?.start ?? ''),
      end: String(payload.range?.end ?? ''),
      days: toNumber(payload.range?.days)
    },
    leadingBlanks: Math.max(0, Math.round(toNumber(payload.leadingBlanks))),
    weeks: Array.isArray(payload.weeks)
      ? payload.weeks.map((week) => (Array.isArray(week) ? week.map((cell) => (cell ? normalizeDay(cell) : null)) : []))
      : [],
    days: Array.isArray(payload.days) ? payload.days.map(normalizeDay) : [],
    summary: {
      totalSessions: toNumber(summary.totalSessions),
      totalSets: toNumber(summary.totalSets),
      totalVolumeKg: toNumber(summary.totalVolumeKg),
      activeDays: toNumber(summary.activeDays),
      totalDays: toNumber(summary.totalDays),
      coveragePct: toNumber(summary.coveragePct),
      currentStreakDays: toNumber(summary.currentStreakDays),
      bestStreakDays: toNumber(summary.bestStreakDays),
      lastActiveDate: String(summary.lastActiveDate ?? ''),
      mostActiveDate: String(summary.mostActiveDate ?? ''),
      avgSetsPerActiveDay: toNumber(summary.avgSetsPerActiveDay)
    },
    weekdayDistribution: Array.isArray(payload.weekdayDistribution)
      ? payload.weekdayDistribution.map((w) => ({
          day: toNumber(w?.day),
          labelTh: String(w?.labelTh ?? ''),
          sessions: toNumber(w?.sessions),
          sets: toNumber(w?.sets)
        }))
      : [],
    monthlyDistribution: Array.isArray(payload.monthlyDistribution)
      ? payload.monthlyDistribution.map((m) => ({
          month: String(m?.month ?? ''),
          labelTh: String(m?.labelTh ?? ''),
          sessions: toNumber(m?.sessions),
          sets: toNumber(m?.sets)
        }))
      : []
  };
}

export function useTrainingHeatmap(fetchImpl = globalThis.fetch, { timeoutMs = DEFAULT_LOAD_TIMEOUT_MS } = {}) {
  const data = ref(null);
  const loading = ref(false);
  const error = ref('');

  async function load(days = 365) {
    loading.value = true;
    error.value = '';
    let timer = null;
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      });
      const res = await Promise.race([
        fetchImpl(`/api/training-heatmap?days=${encodeURIComponent(days)}`),
        timeout
      ]);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body && body.error ? body.error : `HTTP ${res.status}`);
      data.value = normalizeHeatmapPayload(body);
      return true;
    } catch (err) {
      error.value = err && err.message === 'timeout' ? HEATMAP_TIMEOUT_MESSAGE : HEATMAP_ERROR_MESSAGE;
      data.value = null;
      return false;
    } finally {
      clearTimeout(timer);
      loading.value = false;
    }
  }

  return { data, loading, error, load };
}
