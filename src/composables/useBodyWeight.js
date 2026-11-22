import { ref, computed } from 'vue';

export const BODY_WEIGHT_ERROR_MESSAGE = 'โหลดข้อมูลน้ำหนักตัวไม่สำเร็จ';
export const BODY_WEIGHT_SAVE_ERROR = 'บันทึกน้ำหนักตัวไม่สำเร็จ';
export const BODY_WEIGHT_DELETE_ERROR = 'ลบข้อมูลน้ำหนักตัวไม่สำเร็จ';

/**
 * Returns YYYY-MM-DD for a date in local time
 */
export function todayDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Thai date display, e.g. "22 พ.ย. 2026"
 */
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

/**
 * Calculate SVG sparkline coordinates for recent entries
 */
export function calculateSparkline(entries, width = 160, height = 44, padding = 6) {
  if (!Array.isArray(entries) || entries.length < 2) {
    return { path: '', points: [], minWeight: null, maxWeight: null };
  }
  // Take up to 14 recent entries, sort oldest to newest (ASC) for left-to-right plot
  const valid = entries
    .filter(e => e && e.date && Number.isFinite(Number(e.weight)))
    .slice(0, 14)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (valid.length < 2) {
    const single = valid[0] ? Number(valid[0].weight) : null;
    return { path: '', points: [], minWeight: single, maxWeight: single };
  }

  const weights = valid.map(e => Number(e.weight));
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const range = maxWeight - minWeight || 1;

  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const stepX = innerW / (valid.length - 1);

  const points = valid.map((e, idx) => {
    const x = Math.round((padding + idx * stepX) * 10) / 10;
    // Higher weight = smaller y coordinate in SVG
    const norm = (Number(e.weight) - minWeight) / range;
    const y = Math.round((padding + (1 - norm) * innerH) * 10) / 10;
    return { x, y, date: e.date, weight: Number(e.weight) };
  });

  const path = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  return { path, points, minWeight, maxWeight };
}

// Reactive singleton state
const entries = ref([]);
const loading = ref(false);
const error = ref('');

export function useBodyWeight(fetchImpl = globalThis.fetch) {
  async function fetchBodyWeights() {
    loading.value = true;
    error.value = '';
    try {
      const res = await fetchImpl('/api/body-weights');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        entries.value = data.sort((a, b) => b.date.localeCompare(a.date));
      }
    } catch (err) {
      error.value = BODY_WEIGHT_ERROR_MESSAGE;
    } finally {
      loading.value = false;
    }
  }

  async function saveBodyWeight({ date, weight, note = '' }) {
    const parsedWeight = parseFloat(weight);
    if (!date || isNaN(parsedWeight) || parsedWeight < 20 || parsedWeight > 300) {
      error.value = 'กรุณาระบุน้ำหนักระหว่าง 20 - 300 กก.';
      return false;
    }

    const trimmedNote = typeof note === 'string' ? note.slice(0, 500) : '';
    const prevEntries = [...entries.value];

    // Optimistic update
    const optimisticEntry = {
      date,
      weight: Math.round(parsedWeight * 10) / 10,
      note: trimmedNote,
      updated_at: new Date().toISOString()
    };

    const existingIdx = entries.value.findIndex(e => e.date === date);
    if (existingIdx >= 0) {
      entries.value[existingIdx] = optimisticEntry;
    } else {
      entries.value = [optimisticEntry, ...entries.value].sort((a, b) => b.date.localeCompare(a.date));
    }

    error.value = '';
    try {
      const res = await fetchImpl('/api/body-weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, weight: optimisticEntry.weight, note: trimmedNote })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json();
      const idx = entries.value.findIndex(e => e.date === date);
      if (idx >= 0 && saved && saved.date) {
        entries.value[idx] = saved;
      }
      return true;
    } catch (err) {
      entries.value = prevEntries; // rollback on failure
      error.value = BODY_WEIGHT_SAVE_ERROR;
      return false;
    }
  }

  async function deleteBodyWeight(date) {
    if (!date) return false;
    const prevEntries = [...entries.value];
    entries.value = entries.value.filter(e => e.date !== date);
    error.value = '';
    try {
      const res = await fetchImpl(`/api/body-weights/${encodeURIComponent(date)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      entries.value = prevEntries; // rollback on failure
      error.value = BODY_WEIGHT_DELETE_ERROR;
      return false;
    }
  }

  const latestEntry = computed(() => entries.value[0] || null);
  const previousEntry = computed(() => entries.value[1] || null);
  const latestWeight = computed(() => latestEntry.value?.weight ?? null);

  const deltaWeight = computed(() => {
    if (!latestEntry.value || !previousEntry.value) return null;
    const diff = Number(latestEntry.value.weight) - Number(previousEntry.value.weight);
    return Math.round(diff * 10) / 10;
  });

  const trendDirection = computed(() => {
    if (deltaWeight.value === null) return 'none';
    if (deltaWeight.value > 0) return 'up';
    if (deltaWeight.value < 0) return 'down';
    return 'same';
  });

  const sparkline = computed(() => {
    return calculateSparkline(entries.value, 160, 44, 6);
  });

  return {
    entries,
    loading,
    error,
    latestEntry,
    previousEntry,
    latestWeight,
    deltaWeight,
    trendDirection,
    sparkline,
    fetchBodyWeights,
    saveBodyWeight,
    deleteBodyWeight
  };
}
