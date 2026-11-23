import { ref } from 'vue';

/**
 * Cardio session logging (GET/POST/DELETE /api/cardio).
 * Response: { sessions: [...], summary: { weekStart, weekEnd, thisWeek, lastWeek,
 *   delta, byType, allTime } }
 */

export const CARDIO_ERROR_MESSAGE = 'โหลดข้อมูลคาร์ดิโอไม่ได้';
export const CARDIO_SAVE_ERROR = 'บันทึกเซสชันคาร์ดิโอไม่สำเร็จ';
export const CARDIO_DELETE_ERROR = 'ลบเซสชันคาร์ดิโอไม่สำเร็จ';
export const CARDIO_TIMEOUT_MESSAGE = 'การโหลดใช้เวลานานเกินไป — กดลองอีกครั้ง';
export const DEFAULT_LOAD_TIMEOUT_MS = 10000;

export const CARDIO_TYPE_META = {
  run: { labelTh: 'วิ่ง', icon: '🏃' },
  walk: { labelTh: 'เดิน', icon: '🚶' },
  cycle: { labelTh: 'ปั่นจักรยาน', icon: '🚴' },
  row: { labelTh: 'พาย', icon: '🚣' },
  swim: { labelTh: 'ว่ายน้ำ', icon: '🏊' },
  elliptical: { labelTh: 'เอลลิปติคัล', icon: '🦿' },
  hiit: { labelTh: 'HIIT', icon: '⚡' },
  other: { labelTh: 'อื่น ๆ', icon: '🎯' }
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function normalizeAggregate(a) {
  return {
    sessions: toNumber(a?.sessions),
    totalMinutes: toNumber(a?.totalMinutes),
    totalDistanceKm: toNumber(a?.totalDistanceKm),
    totalCalories: toNumber(a?.totalCalories)
  };
}

export function normalizeCardioPayload(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.sessions) || !payload.summary) {
    throw new Error('Invalid cardio payload');
  }
  const s = payload.summary;
  return {
    sessions: payload.sessions.map((row) => ({
      id: toNumber(row?.id),
      date: String(row?.date ?? ''),
      type: CARDIO_TYPE_META[row?.type] ? row.type : 'other',
      durationMin: toNumber(row?.durationMin),
      distanceKm: row?.distanceKm === null || row?.distanceKm === undefined ? null : toNumber(row.distanceKm),
      calories: row?.calories === null || row?.calories === undefined ? null : toNumber(row.calories),
      note: String(row?.note ?? '')
    })),
    summary: {
      weekStart: String(s.weekStart ?? ''),
      weekEnd: String(s.weekEnd ?? ''),
      thisWeek: normalizeAggregate(s.thisWeek),
      lastWeek: normalizeAggregate(s.lastWeek),
      delta: normalizeAggregate(s.delta),
      byType: Array.isArray(s.byType)
        ? s.byType.map((t) => ({
            id: CARDIO_TYPE_META[t?.id] ? t.id : 'other',
            labelTh: String(t?.labelTh ?? ''),
            icon: String(t?.icon ?? '🎯'),
            ...normalizeAggregate(t)
          }))
        : [],
      allTime: normalizeAggregate(s.allTime)
    }
  };
}

export function useCardio(fetchImpl = globalThis.fetch, { timeoutMs = DEFAULT_LOAD_TIMEOUT_MS } = {}) {
  const sessions = ref([]);
  const summary = ref(null);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref('');
  const actionError = ref('');

  function withTimeout(promise, timerRef) {
    const timeout = new Promise((_, reject) => {
      timerRef.value = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
    return Promise.race([promise, timeout]);
  }

  async function load() {
    loading.value = true;
    error.value = '';
    const timerRef = { value: null };
    try {
      const res = await withTimeout(fetchImpl('/api/cardio'), timerRef);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body && body.error ? body.error : `HTTP ${res.status}`);
      const data = normalizeCardioPayload(body);
      sessions.value = data.sessions;
      summary.value = data.summary;
      return true;
    } catch (err) {
      error.value = err && err.message === 'timeout' ? CARDIO_TIMEOUT_MESSAGE : CARDIO_ERROR_MESSAGE;
      sessions.value = [];
      summary.value = null;
      return false;
    } finally {
      clearTimeout(timerRef.value);
      loading.value = false;
    }
  }

  async function add(payload) {
    saving.value = true;
    actionError.value = '';
    const timerRef = { value: null };
    try {
      const res = await withTimeout(
        fetchImpl('/api/cardio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }),
        timerRef
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body && body.error ? body.error : `HTTP ${res.status}`);
      const data = normalizeCardioPayload(body);
      sessions.value = data.sessions;
      summary.value = data.summary;
      return true;
    } catch (err) {
      actionError.value = err && err.message ? err.message : CARDIO_SAVE_ERROR;
      return false;
    } finally {
      clearTimeout(timerRef.value);
      saving.value = false;
    }
  }

  async function remove(id) {
    saving.value = true;
    actionError.value = '';
    const timerRef = { value: null };
    try {
      const res = await withTimeout(
        fetchImpl(`/api/cardio/${encodeURIComponent(id)}`, { method: 'DELETE' }),
        timerRef
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body && body.error ? body.error : `HTTP ${res.status}`);
      const data = normalizeCardioPayload(body);
      sessions.value = data.sessions;
      summary.value = data.summary;
      return true;
    } catch (err) {
      actionError.value = err && err.message ? err.message : CARDIO_DELETE_ERROR;
      return false;
    } finally {
      clearTimeout(timerRef.value);
      saving.value = false;
    }
  }

  return { sessions, summary, loading, saving, error, actionError, load, add, remove };
}
