import { ref } from 'vue';

/**
 * Weekly Muscle Volume Landmarks (GET /api/volume/landmarks).
 * Response: { weekStart, summary, landmarks: [{ muscleKey, displayNameTh,
 *   category, setsDone, mev, mav, mrv, status, statusLabelTh, progressPct,
 *   recommendationTh }] }
 */

export const LANDMARKS_ERROR_MESSAGE = 'โหลดข้อมูลเป้าหมายปริมาณกล้ามเนื้อไม่ได้';
export const LANDMARKS_EMPTY_MESSAGE = 'ยังไม่มีข้อมูลการฝึกในสัปดาห์นี้';
export const LANDMARKS_TIMEOUT_MESSAGE = 'การโหลดใช้เวลานานเกินไป — กดลองอีกครั้ง';
export const DEFAULT_LOAD_TIMEOUT_MS = 10000;

export const STATUS_META = {
  under: { label: 'ต่ำกว่าเกณฑ์', icon: '⚠️', color: '#F59E0B', badge: 'bg-amber-100 text-amber-900 border-amber-500' },
  optimal: { label: 'เหมาะสม', icon: '✓', color: '#10B981', badge: 'bg-emerald-bg text-emerald-text border-emerald' },
  near_mrv: { label: 'ใกล้เพดาน', icon: '⚡', color: '#F97316', badge: 'bg-orange-100 text-orange-900 border-orange-500' },
  overreached: { label: 'เกิน MRV', icon: '🚨', color: '#EF4444', badge: 'bg-red-100 text-red-900 border-red-500' }
};

export const CATEGORY_FILTERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'upper', label: 'ส่วนบน' },
  { id: 'lower', label: 'ส่วนล่าง' },
  { id: 'arms_core', label: 'แขน/แกนกลาง' }
];

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function normalizeLandmarks(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.landmarks)) {
    throw new Error('Invalid volume landmarks payload');
  }
  const landmarks = payload.landmarks.map((l) => {
    const status = STATUS_META[l?.status] ? l.status : 'under';
    return {
      muscleKey: String(l?.muscleKey ?? ''),
      displayNameTh: String(l?.displayNameTh ?? l?.muscleKey ?? ''),
      category: String(l?.category ?? 'upper'),
      setsDone: toNumber(l?.setsDone),
      mev: toNumber(l?.mev),
      mav: toNumber(l?.mav),
      mrv: toNumber(l?.mrv),
      status,
      statusLabelTh: String(l?.statusLabelTh ?? STATUS_META[status].label),
      progressPct: toNumber(l?.progressPct),
      recommendationTh: String(l?.recommendationTh ?? '')
    };
  });
  const s = payload.summary || {};
  return {
    weekStart: String(payload.weekStart ?? ''),
    summary: {
      totalWorkingSets: toNumber(s.totalWorkingSets),
      optimalCount: toNumber(s.optimalCount),
      underCount: toNumber(s.underCount),
      overreachedCount: toNumber(s.overreachedCount),
      status: String(s.status ?? 'undertrained')
    },
    landmarks
  };
}

export function filterLandmarks(landmarks, category) {
  const list = Array.isArray(landmarks) ? landmarks : [];
  return category === 'all' ? list : list.filter((l) => l.category === category);
}

export function useVolumeLandmarks(fetchImpl = globalThis.fetch, { timeoutMs = DEFAULT_LOAD_TIMEOUT_MS } = {}) {
  const weekStart = ref('');
  const summary = ref(null);
  const landmarks = ref([]);
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
      const res = await Promise.race([fetchImpl('/api/volume/landmarks'), timeout]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = normalizeLandmarks(await res.json());
      weekStart.value = data.weekStart;
      summary.value = data.summary;
      landmarks.value = data.landmarks;
    } catch (err) {
      error.value = err && err.message === 'timeout' ? LANDMARKS_TIMEOUT_MESSAGE : LANDMARKS_ERROR_MESSAGE;
      weekStart.value = '';
      summary.value = null;
      landmarks.value = [];
    } finally {
      clearTimeout(timer);
      loading.value = false;
    }
  }

  return { weekStart, summary, landmarks, loading, error, load };
}
