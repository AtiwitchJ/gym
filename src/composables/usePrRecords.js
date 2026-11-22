import { ref, computed } from 'vue';

export const PR_RECORDS_ERROR_MESSAGE = 'โหลดสถิติ PR ไม่สำเร็จ';
export const PR_RECORDS_EMPTY_MESSAGE = 'ยังไม่มีสถิติ PR สำหรับท่านี้';

export const RECORD_TYPE_CONFIG = {
  heaviestWeight: {
    label: 'น้ำหนักสูงสุด (Heaviest Weight)',
    shortLabel: 'น้ำหนักสูงสุด',
    unit: 'กก.',
    badgeColor: 'bg-flame-bg text-flame-text border-flame/30'
  },
  bestE1rm: {
    label: '1RM สูงสุด (Best e1RM)',
    shortLabel: 'e1RM สูงสุด',
    unit: 'กก.',
    badgeColor: 'bg-emerald-bg text-emerald-text border-emerald/30'
  },
  bestSetVolume: {
    label: 'โวลุ่มเซ็ตสูงสุด (Best Set Volume)',
    shortLabel: 'Set Volume',
    unit: 'กก.',
    badgeColor: 'bg-sky-bg text-sky-text border-sky/30'
  },
  mostReps: {
    label: 'จำนวนครั้งสูงสุด (Most Reps)',
    shortLabel: 'จำนวนครั้งสูงสุด',
    unit: 'ครั้ง',
    badgeColor: 'bg-gold/20 text-ink border-gold/40'
  }
};

export function formatRecordType(type) {
  return RECORD_TYPE_CONFIG[type]?.label || RECORD_TYPE_CONFIG[type]?.shortLabel || type;
}

export function formatRecordValue(type, value) {
  if (value === null || value === undefined || isNaN(Number(value))) return '—';
  const unit = RECORD_TYPE_CONFIG[type]?.unit || '';
  const num = Number(value);
  if (type === 'bestE1rm') {
    return `${num.toFixed(1)} ${unit}`.trim();
  }
  if (type === 'bestSetVolume') {
    return `${Math.round(num).toLocaleString()} ${unit}`.trim();
  }
  if (type === 'mostReps') {
    return `${Math.round(num)} ${unit}`.trim();
  }
  return `${num} ${unit}`.trim();
}

export function formatThaiDate(isoDate) {
  if (!isoDate) return '—';
  try {
    const parts = String(isoDate).split('-');
    if (parts.length < 3) return isoDate;
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthName = months[m - 1] || parts[1];
    return `${d} ${monthName} ${y}`;
  } catch {
    return isoDate;
  }
}

export function normalizePrRecords(payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  return {
    exerciseId: String(p.exerciseId || ''),
    records: {
      heaviestWeight: p.records?.heaviestWeight ? {
        value: Number(p.records.heaviestWeight.value) || 0,
        date: String(p.records.heaviestWeight.date || ''),
        sessionId: String(p.records.heaviestWeight.sessionId || '')
      } : null,
      bestE1rm: p.records?.bestE1rm ? {
        value: Number(p.records.bestE1rm.value) || 0,
        date: String(p.records.bestE1rm.date || ''),
        sessionId: String(p.records.bestE1rm.sessionId || '')
      } : null,
      bestSetVolume: p.records?.bestSetVolume ? {
        value: Number(p.records.bestSetVolume.value) || 0,
        date: String(p.records.bestSetVolume.date || ''),
        sessionId: String(p.records.bestSetVolume.sessionId || '')
      } : null,
      mostReps: p.records?.mostReps ? {
        value: Number(p.records.mostReps.value) || 0,
        date: String(p.records.mostReps.date || ''),
        sessionId: String(p.records.mostReps.sessionId || '')
      } : null
    },
    setRecords: Array.isArray(p.setRecords) ? p.setRecords.map(r => ({
      reps: Number(r.reps) || 0,
      weight: Number(r.weight) || 0,
      date: String(r.date || '')
    })) : [],
    timeline: Array.isArray(p.timeline) ? p.timeline.map(t => ({
      date: String(t.date || ''),
      type: String(t.type || ''),
      value: Number(t.value) || 0,
      previousValue: t.previousValue !== null && t.previousValue !== undefined ? Number(t.previousValue) : null,
      sessionId: String(t.sessionId || '')
    })) : []
  };
}

export function usePrRecords(fetchImpl = globalThis.fetch) {
  const data = ref({
    exerciseId: '',
    records: {},
    setRecords: [],
    timeline: []
  });
  const loading = ref(false);
  const error = ref('');
  let lastId = null;

  async function load(exerciseId) {
    if (!exerciseId) return;
    lastId = exerciseId;
    loading.value = true;
    error.value = '';
    try {
      const res = await fetchImpl(`/api/exercises/${encodeURIComponent(exerciseId)}/records`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      data.value = normalizePrRecords(json);
    } catch (err) {
      error.value = PR_RECORDS_ERROR_MESSAGE;
    } finally {
      loading.value = false;
    }
  }

  function retry() {
    if (lastId) load(lastId);
  }

  const hasAnyRecords = computed(() => {
    const r = data.value.records;
    return Boolean(r?.heaviestWeight || r?.bestE1rm || r?.bestSetVolume || r?.mostReps);
  });

  return {
    data,
    loading,
    error,
    hasAnyRecords,
    load,
    retry,
    formatRecordType,
    formatRecordValue,
    formatThaiDate
  };
}
