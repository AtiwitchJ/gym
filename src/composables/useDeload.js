import { ref, computed } from 'vue';

export const DELOAD_ERROR_MESSAGE = 'โหลดข้อมูลคำแนะนำ Deload ไม่สำเร็จ';
export const DELOAD_TIMEOUT_MESSAGE = 'การโหลดใช้เวลานานเกินไป — กดลองอีกครั้ง';
export const DEFAULT_DELOAD_TIMEOUT_MS = 10000;

export const DELOAD_STATUS_META = {
  deload: {
    id: 'deload',
    label: 'สัปดาห์ Deload (ลดโหลด)',
    shortLabel: 'Deload',
    badge: 'bg-red-600 text-white border-plate',
    border: 'border-red-600',
    bg: 'bg-red-50',
    text: 'text-red-700',
    barColor: '#dc2626',
    icon: '⚠️',
    desc: 'ความล้าสะสมสูงเกินเกณฑ์ แนะนำลดปริมาณฝึกและเพิ่มความผ่อนคลาย'
  },
  hold: {
    id: 'hold',
    label: 'รักษาจังหวะ (Hold Load)',
    shortLabel: 'รักษาจังหวะ',
    badge: 'bg-yellow-400 text-plate border-plate',
    border: 'border-yellow-400',
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    barColor: '#eab308',
    icon: '⚖️',
    desc: 'โหลดเหมาะสม ร่างกายกำลังปรับตัวได้ดี รักษาระดับการฝึกต่อไป'
  },
  push: {
    id: 'push',
    label: 'พร้อมเพิ่มโหลด (Push)',
    shortLabel: 'เพิ่มโหลด',
    badge: 'bg-green-600 text-white border-plate',
    border: 'border-green-600',
    bg: 'bg-green-50',
    text: 'text-green-700',
    barColor: '#16a34a',
    icon: '⚡',
    desc: 'ความล้าต่ำ ความพร้อมสูง สามารถเพิ่มน้ำหนักหรือจำนวนเซ็ตได้'
  }
};

export const SIGNAL_META = {
  acwr_high: {
    id: 'acwr_high',
    label: 'ACWR สูง (> 1.5)',
    shortLabel: 'ACWR > 1.5',
    desc: 'โหลดสัปดาห์นี้พุ่งเกินค่าเฉลี่ย 4 สัปดาห์ก่อน เสี่ยงบาดเจ็บ',
    tagClass: 'bg-red-100 text-red-800 border-red-500'
  },
  rising_4w: {
    id: 'rising_4w',
    label: 'โหลดเพิ่มติดต่อกัน 4+ สัปดาห์',
    shortLabel: 'โหลดพุ่ง 4w+',
    desc: 'ร่างกายสะสมความล้าต่อเนื่องโดยไม่มีสัปดาห์ผ่อน',
    tagClass: 'bg-red-100 text-red-800 border-red-500'
  },
  joint_pain: {
    id: 'joint_pain',
    label: 'พบอาการเจ็บข้อต่อ (Joint Pain)',
    shortLabel: 'เจ็บข้อต่อ',
    desc: 'มีรายงานอาการปวดข้อต่อในสัปดาห์ปัจจุบันหรือก่อนหน้า',
    tagClass: 'bg-red-100 text-red-800 border-red-500'
  },
  low_acwr: {
    id: 'low_acwr',
    label: 'ACWR ต่ำ (< 0.8)',
    shortLabel: 'ACWR < 0.8',
    desc: 'โหลดสัปดาห์นี้น้อยกว่าค่าเฉลี่ย ร่างกายพร้อมรับความท้าทายเพิ่ม',
    tagClass: 'bg-emerald-bg text-emerald-text border-emerald'
  }
};

/**
 * Returns Thai description for an ACWR ratio
 */
export function acwrLabel(acwr) {
  if (acwr === null || acwr === undefined || !Number.isFinite(Number(acwr))) {
    return 'ไม่มีข้อมูลเปรียบเทียบ';
  }
  const val = Number(acwr);
  if (val > 1.5) return 'สูงเกินเกณฑ์ เสี่ยงบาดเจ็บ (> 1.5)';
  if (val < 0.8) return 'ต่ำกว่าปกติ พร้อมเร่งฟอร์ม (< 0.8)';
  if (val >= 0.8 && val <= 1.3) return 'สมดุลเหมาะสม (Sweet Spot: 0.8–1.3)';
  return 'ค่อนข้างสูง เฝ้าระวัง (1.3–1.5)';
}

/**
 * Formats ACWR to 2 decimal places or dash
 */
export function formatAcwr(acwr) {
  if (acwr === null || acwr === undefined || !Number.isFinite(Number(acwr))) {
    return '—';
  }
  return Number(acwr).toFixed(2);
}

/**
 * Get status metadata with fallback to 'hold'
 */
export function getStatusMeta(status) {
  return DELOAD_STATUS_META[status] || DELOAD_STATUS_META.hold;
}

export function statusMeta(status) {
  return getStatusMeta(status);
}

/**
 * Safely normalizes the API payload from GET /api/deload
 */
export function normalizeDeload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid deload payload');
  }

  // Weeks (array of 6 items)
  const rawWeeks = Array.isArray(payload.weeks) ? payload.weeks : [];
  const weeks = rawWeeks.map((w) => ({
    weekStart: String(w?.weekStart || ''),
    sessions: Number(w?.sessions) || 0,
    loadAu: Number(w?.loadAu) || 0,
    workingSets: Number(w?.workingSets) || 0
  }));

  // Current summary
  const curr = payload.current || {};
  const rawAcwr = curr.acwr;
  const acwr = (rawAcwr !== null && rawAcwr !== undefined && Number.isFinite(Number(rawAcwr)))
    ? Math.round(Number(rawAcwr) * 100) / 100
    : null;

  const current = {
    weekStart: String(curr.weekStart || ''),
    acuteLoadAu: Number(curr.acuteLoadAu) || 0,
    chronicLoadAu: Number(curr.chronicLoadAu) || 0,
    acwr,
    risingWeeks: Number(curr.risingWeeks) || 0
  };

  // Recommendation
  const rec = payload.recommendation || {};
  const status = (rec.status === 'deload' || rec.status === 'push' || rec.status === 'hold')
    ? rec.status
    : 'hold';

  const labelTh = String(rec.labelTh || DELOAD_STATUS_META[status].label);
  const reasonTh = String(rec.reasonTh || '');
  const signals = Array.isArray(rec.signals) ? rec.signals.map(String) : [];

  const rawTaper = rec.taper || {};
  const taper = {
    setReductionPct: Number(rawTaper.setReductionPct) || 50,
    targetRir: String(rawTaper.targetRir || '3–4'),
    suggestedSetsPerExercise: Number(rawTaper.suggestedSetsPerExercise) || 3
  };

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

export const normalizeDeloadPayload = normalizeDeload;

/**
 * Composable for fetching and managing deload advisor state
 */
export function useDeload(fetchImpl = globalThis.fetch, { timeoutMs = DEFAULT_DELOAD_TIMEOUT_MS } = {}) {
  const data = ref(null);
  const loading = ref(false);
  const error = ref('');

  const weeks = computed(() => data.value?.weeks || []);
  const current = computed(() => data.value?.current || {
    weekStart: '',
    acuteLoadAu: 0,
    chronicLoadAu: 0,
    acwr: null,
    risingWeeks: 0
  });
  const recommendation = computed(() => data.value?.recommendation || {
    status: 'hold',
    labelTh: 'รักษาจังหวะ',
    reasonTh: 'ข้อมูลยังไม่พอสำหรับวิเคราะห์ความล้า',
    signals: [],
    taper: { setReductionPct: 50, targetRir: '3–4', suggestedSetsPerExercise: 3 }
  });

  const status = computed(() => recommendation.value.status);
  const currentStatusMeta = computed(() => getStatusMeta(status.value));
  const signals = computed(() => recommendation.value.signals || []);
  const taper = computed(() => recommendation.value.taper);

  async function fetchDeload() {
    loading.value = true;
    error.value = '';

    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });

    try {
      const res = await Promise.race([
        fetchImpl('/api/deload'),
        timeoutPromise
      ]);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      data.value = normalizeDeload(json);
    } catch (err) {
      data.value = null;
      error.value = err.message === 'timeout'
        ? DELOAD_TIMEOUT_MESSAGE
        : DELOAD_ERROR_MESSAGE;
    } finally {
      if (timer) clearTimeout(timer);
      loading.value = false;
    }
  }

  return {
    data,
    weeks,
    current,
    recommendation,
    status,
    statusMeta: currentStatusMeta,
    signals,
    taper,
    loading,
    error,
    fetchDeload,
    load: fetchDeload,
    refresh: fetchDeload
  };
}
