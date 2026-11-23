import { ref } from 'vue';

/**
 * %1RM Training Zones (GET /api/training/zones?e1rm=...).
 * Response: { e1rm, zones: [{ id, nameTh, icon, pctMin, pctMax, repMin, repMax,
 *   targetPct, weightMin, weightMax, targetWeight, focusTh }],
 *   summary: { zoneCount, minWeight, maxWeight } }
 */

export const ZONES_ERROR_MESSAGE = 'โหลดโซนความเข้มข้นไม่ได้';
export const ZONES_INVALID_MESSAGE = 'กรอก 1RM เป็นตัวเลขมากกว่า 0 และไม่เกิน 1000 กก.';
export const ZONES_TIMEOUT_MESSAGE = 'การคำนวณใช้เวลานานเกินไป — กดลองอีกครั้ง';
export const DEFAULT_LOAD_TIMEOUT_MS = 10000;
export const MAX_E1RM_KG = 1000;

export const ZONE_META = {
  endurance: { icon: '🫁', color: '#0EA5E9', badge: 'bg-sky-100 text-sky-900 border-sky-500' },
  hypertrophy: { icon: '💪', color: '#10B981', badge: 'bg-emerald-bg text-emerald-text border-emerald' },
  strength: { icon: '🏋️', color: '#F59E0B', badge: 'bg-amber-100 text-amber-900 border-amber-500' },
  peaking: { icon: '⚡', color: '#EF4444', badge: 'bg-red-100 text-red-900 border-red-500' }
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function normalizeTrainingZones(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.zones)) {
    throw new Error('Invalid training zones payload');
  }
  const zones = payload.zones.map((z) => {
    const id = ZONE_META[z?.id] ? z.id : 'hypertrophy';
    return {
      id,
      nameTh: String(z?.nameTh ?? id),
      icon: String(z?.icon ?? ZONE_META[id].icon),
      pctMin: toNumber(z?.pctMin),
      pctMax: toNumber(z?.pctMax),
      repMin: toNumber(z?.repMin),
      repMax: toNumber(z?.repMax),
      targetPct: toNumber(z?.targetPct),
      weightMin: toNumber(z?.weightMin),
      weightMax: toNumber(z?.weightMax),
      targetWeight: toNumber(z?.targetWeight),
      focusTh: String(z?.focusTh ?? '')
    };
  });
  const s = payload.summary || {};
  return {
    e1rm: toNumber(payload.e1rm),
    zones,
    summary: {
      zoneCount: toNumber(s.zoneCount),
      minWeight: toNumber(s.minWeight),
      maxWeight: toNumber(s.maxWeight)
    }
  };
}

export function useTrainingZones(fetchImpl = globalThis.fetch, { timeoutMs = DEFAULT_LOAD_TIMEOUT_MS } = {}) {
  const e1rm = ref(null);
  const zones = ref([]);
  const summary = ref(null);
  const loading = ref(false);
  const error = ref('');

  async function load(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || n > MAX_E1RM_KG) {
      error.value = ZONES_INVALID_MESSAGE;
      e1rm.value = null;
      summary.value = null;
      zones.value = [];
      return false;
    }

    loading.value = true;
    error.value = '';
    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
    try {
      const res = await Promise.race([
        fetchImpl(`/api/training/zones?e1rm=${encodeURIComponent(n)}`),
        timeout
      ]);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body && body.error ? body.error : `HTTP ${res.status}`);
      const data = normalizeTrainingZones(body);
      e1rm.value = data.e1rm;
      summary.value = data.summary;
      zones.value = data.zones;
      return true;
    } catch (err) {
      error.value = err && err.message === 'timeout' ? ZONES_TIMEOUT_MESSAGE : ZONES_ERROR_MESSAGE;
      e1rm.value = null;
      summary.value = null;
      zones.value = [];
      return false;
    } finally {
      clearTimeout(timer);
      loading.value = false;
    }
  }

  return { e1rm, zones, summary, loading, error, load };
}
