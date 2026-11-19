import { ref } from 'vue';

/**
 * Weekly volume (GET /api/volume/weekly), last 8 weeks, oldest first.
 * Response: { weeks: [{ weekStart, muscles: [{muscle, volume, sets}], exercises: [{exerciseId, exerciseName, volume, sets}] }] }
 */

export const VOLUME_ERROR_MESSAGE = 'โหลดข้อมูลปริมาณการฝึกไม่ได้';
export const VOLUME_EMPTY_MESSAGE = 'ยังไม่มีข้อมูลปริมาณการฝึกในช่วง 8 สัปดาห์นี้';

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function normalizeWeeklyVolume(payload) {
  if (!payload || !Array.isArray(payload.weeks)) {
    throw new Error('Invalid volume payload');
  }
  return payload.weeks.map((w) => ({
    weekStart: String(w?.weekStart ?? ''),
    muscles: (Array.isArray(w?.muscles) ? w.muscles : []).map((m) => ({
      key: String(m?.muscle ?? ''),
      label: String(m?.muscle ?? ''),
      volume: toNumber(m?.volume),
      sets: toNumber(m?.sets)
    })),
    exercises: (Array.isArray(w?.exercises) ? w.exercises : []).map((e) => ({
      key: String(e?.exerciseId ?? ''),
      label: String(e?.exerciseName || e?.exerciseId || ''),
      volume: toNumber(e?.volume),
      sets: toNumber(e?.sets)
    }))
  }));
}

/** Keys of one kind ('muscles' | 'exercises') ranked by total volume over all weeks, highest first. */
export function rankKeys(weeks, kind) {
  const totals = new Map();
  for (const week of weeks) {
    for (const item of week[kind] || []) {
      if (!item.key) continue;
      const prev = totals.get(item.key) || { key: item.key, label: item.label, total: 0 };
      prev.total += item.volume;
      prev.label = item.label || prev.label;
      totals.set(item.key, prev);
    }
  }
  return [...totals.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

/** One bar per week for a single key. Always one entry per week; missing weeks are 0. */
export function buildSeries(weeks, kind, key) {
  return weeks.map((week) => {
    const hit = (week[kind] || []).find((item) => item.key === key);
    return {
      weekStart: week.weekStart,
      volume: hit ? hit.volume : 0,
      sets: hit ? hit.sets : 0
    };
  });
}

export function hasAnyVolume(weeks) {
  return weeks.some((week) => week.muscles.some((m) => m.volume > 0) || week.exercises.some((e) => e.volume > 0));
}

export function useWeeklyVolume(fetchImpl = globalThis.fetch) {
  const weeks = ref([]);
  const loading = ref(false);
  const error = ref('');

  async function load() {
    loading.value = true;
    error.value = '';
    try {
      const res = await fetchImpl('/api/volume/weekly');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      weeks.value = normalizeWeeklyVolume(await res.json());
    } catch (err) {
      weeks.value = [];
      error.value = VOLUME_ERROR_MESSAGE;
    } finally {
      loading.value = false;
    }
  }

  return { weeks, loading, error, load };
}
