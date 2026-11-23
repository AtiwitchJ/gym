import { ref, computed } from 'vue';

export const ACHIEVEMENTS_ERROR_MESSAGE = 'โหลดข้อมูลความสำเร็จไม่สำเร็จ';
export const ACHIEVEMENTS_TIMEOUT_MESSAGE = 'การโหลดใช้เวลานานเกินไป — กดลองอีกครั้ง';
export const ACHIEVEMENTS_TIMEOUT_MS = 10000;

const EMPTY_SUMMARY = {
  total: 10,
  unlockedCount: 0,
  totalSessions: 0,
  totalSets: 0,
  totalVolume: 0,
  totalExercises: 0,
  bestStreakWeeks: 0,
  weighIns: 0
};

export function normalizeAchievements(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid achievements payload');
  }
  const rawSummary = payload.summary || {};
  const summary = { ...EMPTY_SUMMARY };
  for (const key of Object.keys(EMPTY_SUMMARY)) {
    const value = rawSummary[key];
    if (value !== undefined && value !== null && Number.isFinite(Number(value))) {
      summary[key] = Number(value);
    }
  }

  const badges = (Array.isArray(payload.badges) ? payload.badges : []).map(badge => {
    const progress = badge?.progress || {};
    const current = Number(progress.current) || 0;
    const target = Number(progress.target) || 0;
    return {
      id: String(badge?.id || ''),
      icon: String(badge?.icon || '🏅'),
      name: String(badge?.name || ''),
      nameEn: String(badge?.nameEn || ''),
      description: String(badge?.description || ''),
      category: String(badge?.category || ''),
      unlocked: Boolean(badge?.unlocked),
      unlockedAt: badge?.unlockedAt ? String(badge.unlockedAt) : null,
      progress: {
        current,
        raw: Number(progress.raw) || current,
        target,
        percent: Number(progress.percent) || 0
      }
    };
  });

  return { summary, badges };
}

export function useAchievements(fetchImpl = globalThis.fetch, { timeoutMs = ACHIEVEMENTS_TIMEOUT_MS } = {}) {
  const data = ref(null);
  const loading = ref(false);
  const error = ref('');

  const summary = computed(() => data.value?.summary || EMPTY_SUMMARY);
  const badges = computed(() => data.value?.badges || []);
  const unlocked = computed(() => badges.value.filter(b => b.unlocked));
  const locked = computed(() => badges.value.filter(b => !b.unlocked));

  async function load() {
    loading.value = true;
    error.value = '';
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
    try {
      const res = await Promise.race([fetchImpl('/api/achievements'), timeoutPromise]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data.value = normalizeAchievements(await res.json());
    } catch (err) {
      data.value = null;
      error.value = err.message === 'timeout'
        ? ACHIEVEMENTS_TIMEOUT_MESSAGE
        : ACHIEVEMENTS_ERROR_MESSAGE;
    } finally {
      if (timer) clearTimeout(timer);
      loading.value = false;
    }
  }

  return {
    data, loading, error, summary, badges, unlocked, locked,
    load, refresh: load
  };
}
