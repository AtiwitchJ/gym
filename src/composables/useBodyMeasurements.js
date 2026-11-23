import { ref, computed } from 'vue';

export const MEASUREMENT_ERROR_MESSAGE = 'โหลดข้อมูลสัดส่วนร่างกายไม่สำเร็จ';
export const MEASUREMENT_TIMEOUT_MESSAGE = 'การโหลดใช้เวลานานเกินไป — กดลองอีกครั้ง';
export const MEASUREMENT_SAVE_ERROR = 'บันทึกข้อมูลสัดส่วนไม่สำเร็จ';
export const MEASUREMENT_EMPTY_MESSAGE = 'ยังไม่มีข้อมูลการวัดสัดส่วน';
export const DEFAULT_LOAD_TIMEOUT_MS = 10000;

export const MEASUREMENT_FIELDS = [
  { key: 'waist', label: 'เอว', enLabel: 'Waist', placeholder: 'เช่น 78.5' },
  { key: 'chest', label: 'อก', enLabel: 'Chest', placeholder: 'เช่น 96.0' },
  { key: 'arm', label: 'ต้นแขน', enLabel: 'Arm', placeholder: 'เช่น 35.0' },
  { key: 'thigh', label: 'ต้นขา', enLabel: 'Thigh', placeholder: 'เช่น 55.0' },
  { key: 'hip', label: 'สะโพก', enLabel: 'Hip', placeholder: 'เช่น 94.0' }
];

export function todayDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateThai(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const date = new Date(y, m, d);
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function calculateTrend(current, previous) {
  if (!current || !previous) return {};
  const res = {};
  const keys = ['waist', 'chest', 'arm', 'thigh', 'hip'];
  for (const k of keys) {
    const curVal = current[k] !== undefined && current[k] !== null ? Number(current[k]) : null;
    const prevVal = previous[k] !== undefined && previous[k] !== null ? Number(previous[k]) : null;
    if (curVal !== null && prevVal !== null && !isNaN(curVal) && !isNaN(prevVal)) {
      const delta = Math.round((curVal - prevVal) * 10) / 10;
      const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same';
      res[k] = { delta, direction };
    } else {
      res[k] = null;
    }
  }
  return res;
}

// Reactive singleton state
const entries = ref([]);
const latest = ref(null);
const trend = ref({});
const loading = ref(false);
const error = ref('');

export function useBodyMeasurements(fetchImpl = globalThis.fetch, { timeoutMs = DEFAULT_LOAD_TIMEOUT_MS } = {}) {
  function computeLocalLatestAndTrend() {
    if (entries.value.length === 0) {
      latest.value = null;
      trend.value = {};
      return;
    }
    const len = entries.value.length;
    latest.value = entries.value[len - 1];
    if (len >= 2) {
      trend.value = calculateTrend(entries.value[len - 1], entries.value[len - 2]);
    } else {
      trend.value = {};
    }
  }

  async function fetchMeasurements() {
    loading.value = true;
    error.value = '';
    let timeoutTimer = null;
    const timeout = new Promise((_, reject) => {
      timeoutTimer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });

    try {
      const res = await Promise.race([
        fetchImpl('/api/body-measurements'),
        timeout
      ]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data?.entries)
        ? data.entries
        : (Array.isArray(data) ? data : []);

      // Order by date ASC
      entries.value = list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      // Fetch /api/body-measurements/latest
      try {
        const latestRes = await fetchImpl('/api/body-measurements/latest');
        if (latestRes.ok) {
          const latestData = await latestRes.json();
          if (latestData?.entry) {
            latest.value = latestData.entry;
          } else {
            computeLocalLatestAndTrend();
          }
          trend.value = latestData?.trend || {};
        } else {
          computeLocalLatestAndTrend();
        }
      } catch (_) {
        computeLocalLatestAndTrend();
      }
    } catch (err) {
      error.value = err && err.message === 'timeout'
        ? MEASUREMENT_TIMEOUT_MESSAGE
        : MEASUREMENT_ERROR_MESSAGE;
    } finally {
      clearTimeout(timeoutTimer);
      loading.value = false;
    }
  }

  async function saveMeasurement(payload) {
    if (!payload || !payload.date) {
      error.value = 'กรุณาระบุวันที่';
      return false;
    }

    const toNum = (v) => {
      if (v === undefined || v === null || v === '' || isNaN(Number(v))) return null;
      const n = Math.round(Number(v) * 10) / 10;
      return n > 0 ? n : null;
    };

    const entryPayload = {
      date: payload.date,
      waist: toNum(payload.waist),
      chest: toNum(payload.chest),
      arm: toNum(payload.arm),
      thigh: toNum(payload.thigh),
      hip: toNum(payload.hip)
    };

    const hasAny = ['waist', 'chest', 'arm', 'thigh', 'hip'].some(k => entryPayload[k] !== null);
    if (!hasAny) {
      error.value = 'กรุณาระบุสัดส่วนอย่างน้อย 1 จุด (เช่น เอว, อก)';
      return false;
    }

    loading.value = true;
    error.value = '';
    let timeoutTimer = null;
    const timeout = new Promise((_, reject) => {
      timeoutTimer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });

    try {
      const res = await Promise.race([
        fetchImpl('/api/body-measurements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryPayload)
        }),
        timeout
      ]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const resData = await res.json();
      const savedEntry = resData?.entry || entryPayload;

      const idx = entries.value.findIndex(e => e.date === payload.date);
      if (idx >= 0) {
        entries.value[idx] = savedEntry;
      } else {
        entries.value.push(savedEntry);
      }
      entries.value.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      computeLocalLatestAndTrend();

      try {
        const latestRes = await fetchImpl('/api/body-measurements/latest');
        if (latestRes.ok) {
          const latestData = await latestRes.json();
          if (latestData?.entry) latest.value = latestData.entry;
          if (latestData?.trend) trend.value = latestData.trend;
        }
      } catch (_) {}

      return true;
    } catch (err) {
      error.value = err && err.message === 'timeout'
        ? MEASUREMENT_TIMEOUT_MESSAGE
        : MEASUREMENT_SAVE_ERROR;
      return false;
    } finally {
      clearTimeout(timeoutTimer);
      loading.value = false;
    }
  }

  return {
    entries,
    latest,
    trend,
    loading,
    error,
    fetchMeasurements,
    saveMeasurement,
    MEASUREMENT_FIELDS,
    MEASUREMENT_EMPTY_MESSAGE
  };
}
