import { ref, computed } from 'vue';

export const COMP_ERROR_MESSAGE = 'โหลดข้อมูลเปรียบเทียบเซสชันไม่สำเร็จ';
export const COMP_TIMEOUT_MESSAGE = 'การโหลดใช้เวลานานเกินไป — กดลองอีกครั้ง';
export const DEFAULT_COMP_TIMEOUT_MS = 10000;

export const VERDICT_META = {
  overload: {
    id: 'overload',
    label: 'ก้าวหน้าขึ้น',
    shortLabel: 'Overload',
    badge: 'bg-emerald-bg text-emerald-text border-emerald',
    icon: '🚀',
    desc: 'ผลงานดีขึ้นจากรอบก่อน ทั้งในแง่น้ำหนัก จำนวนครั้ง หรือความหนาแน่น'
  },
  maintained: {
    id: 'maintained',
    label: 'รักษามาตรฐานได้ดี',
    shortLabel: 'Maintained',
    badge: 'bg-paper-subtle text-ink border-plate/30',
    icon: '⚖️',
    desc: 'ผลงานอยู่ในเกณฑ์คงที่เท่ารอบก่อน รักษาฟอร์มและปริมาณยกได้สม่ำเสมอ'
  },
  regressed: {
    id: 'regressed',
    label: 'ลดลงจากรอบก่อน',
    shortLabel: 'Regressed',
    badge: 'bg-flame-bg text-flame-text border-flame',
    icon: '🔻',
    desc: 'ปริมาณหรือน้ำหนักลดลง อาจเกิดจากความเหนื่อยล้าสะสมหรือการพักผ่อนไม่เพียงพอ'
  }
};

export const SET_STATUS_META = {
  progressed: {
    id: 'progressed',
    badge: 'bg-emerald-bg text-emerald-text border-emerald',
    icon: '🟢',
    label: 'ก้าวหน้า'
  },
  maintained: {
    id: 'maintained',
    badge: 'bg-paper-subtle text-ink border-plate/30',
    icon: '⚪',
    label: 'คงที่'
  },
  regressed: {
    id: 'regressed',
    badge: 'bg-flame-bg text-flame-text border-flame',
    icon: '🔴',
    label: 'ลดลง'
  }
};

export function getVerdictMeta(verdict) {
  return VERDICT_META[verdict] || VERDICT_META.maintained;
}

export function getSetStatusMeta(status) {
  return SET_STATUS_META[status] || SET_STATUS_META.maintained;
}

export function formatDelta(diff, unit = '', isPct = false) {
  if (diff === null || diff === undefined || !Number.isFinite(diff)) {
    return '—';
  }
  const sign = diff > 0 ? '+' : '';
  const numStr = diff.toLocaleString('en-US', {
    minimumFractionDigits: isPct || Number.isInteger(diff) ? 0 : 1,
    maximumFractionDigits: 1
  });
  const unitStr = unit ? (unit === '%' ? '%' : ' ' + unit) : '';
  return `${sign}${numStr}${unitStr}`;
}

export function normalizeComparison(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      success: false,
      hasComparison: false,
      baseSession: null,
      targetSession: null,
      summary: null,
      messageTh: COMP_ERROR_MESSAGE,
      exercises: [],
      newExercises: [],
      droppedExercises: []
    };
  }

  return {
    success: !!raw.success,
    hasComparison: !!raw.hasComparison,
    baseSession: raw.baseSession || null,
    targetSession: raw.targetSession || null,
    summary: raw.summary || null,
    messageTh: raw.messageTh || '',
    exercises: Array.isArray(raw.exercises) ? raw.exercises : [],
    newExercises: Array.isArray(raw.newExercises) ? raw.newExercises : [],
    droppedExercises: Array.isArray(raw.droppedExercises) ? raw.droppedExercises : []
  };
}

// Shared singleton reactive state
const sharedIsOpen = ref(false);
const sharedData = ref(null);
const sharedLoading = ref(false);
const sharedError = ref('');
const sharedActiveBaseId = ref('');
const sharedActiveTargetId = ref('');

export function useWorkoutComparison(options = {}) {
  const fetchImpl = options.fetch || (typeof window !== 'undefined' ? window.fetch.bind(window) : fetch);
  const timeoutMs = options.timeoutMs || DEFAULT_COMP_TIMEOUT_MS;

  const isOpen = options.useLocalState ? ref(false) : sharedIsOpen;
  const data = options.useLocalState ? ref(null) : sharedData;
  const loading = options.useLocalState ? ref(false) : sharedLoading;
  const error = options.useLocalState ? ref('') : sharedError;
  const activeBaseId = options.useLocalState ? ref('') : sharedActiveBaseId;
  const activeTargetId = options.useLocalState ? ref('') : sharedActiveTargetId;

  const hasComparison = computed(() => data.value?.hasComparison ?? false);
  const baseSession = computed(() => data.value?.baseSession ?? null);
  const targetSession = computed(() => data.value?.targetSession ?? null);
  const summary = computed(() => data.value?.summary ?? null);
  const verdict = computed(() => summary.value?.verdict || 'maintained');
  const verdictMeta = computed(() => getVerdictMeta(verdict.value));
  const macroDelta = computed(() => summary.value?.macroDelta || {});
  const exerciseCounts = computed(() => summary.value?.exerciseCounts || {
    total: 0,
    progressed: 0,
    maintained: 0,
    regressed: 0,
    newAdded: 0,
    dropped: 0
  });
  const exercises = computed(() => data.value?.exercises || []);
  const newExercises = computed(() => data.value?.newExercises || []);
  const droppedExercises = computed(() => data.value?.droppedExercises || []);
  const messageTh = computed(() => data.value?.messageTh || '');

  async function fetchWithTimeout(url) {
    loading.value = true;
    error.value = '';

    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });

    try {
      const res = await Promise.race([
        fetchImpl(url),
        timeoutPromise
      ]);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      data.value = normalizeComparison(json);
      return data.value;
    } catch (err) {
      data.value = null;
      error.value = err.message === 'timeout'
        ? COMP_TIMEOUT_MESSAGE
        : COMP_ERROR_MESSAGE;
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
      loading.value = false;
    }
  }

  async function fetchLatestPair(sessionId) {
    if (!sessionId) {
      error.value = 'ไม่ระบุรหัสเซสชัน';
      return null;
    }
    activeBaseId.value = sessionId;
    activeTargetId.value = '';
    return fetchWithTimeout(`/api/workout-comparison/latest-pair?sessionId=${encodeURIComponent(sessionId)}`);
  }

  async function fetchComparison(baseId, targetId) {
    if (!baseId || !targetId) {
      error.value = 'ต้องระบุรหัสเซสชันทั้งสองเพื่อเปรียบเทียบ';
      return null;
    }
    activeBaseId.value = baseId;
    activeTargetId.value = targetId;
    return fetchWithTimeout(`/api/workout-comparison?baseId=${encodeURIComponent(baseId)}&targetId=${encodeURIComponent(targetId)}`);
  }

  function openLatestPair(sessionId) {
    isOpen.value = true;
    return fetchLatestPair(sessionId).catch(() => {});
  }

  function openComparison(baseId, targetId) {
    isOpen.value = true;
    return fetchComparison(baseId, targetId).catch(() => {});
  }

  function close() {
    isOpen.value = false;
  }

  return {
    isOpen,
    data,
    loading,
    error,
    activeBaseId,
    activeTargetId,
    hasComparison,
    baseSession,
    targetSession,
    summary,
    verdict,
    verdictMeta,
    macroDelta,
    exerciseCounts,
    exercises,
    newExercises,
    droppedExercises,
    messageTh,
    fetchLatestPair,
    fetchComparison,
    openLatestPair,
    openComparison,
    close
  };
}
