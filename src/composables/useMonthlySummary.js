import { ref } from 'vue';

// Monthly summary (GET /api/summary/monthly?month=YYYY-MM). Rules are on the server (server/monthly.js).
// This file: month helpers (local time), response check, Thai text, and the load state.

export const MONTHLY_ERROR_MESSAGE = 'โหลดสรุปรายเดือนไม่ได้';
export const MONTHLY_TIMEOUT_MESSAGE = 'การโหลดใช้เวลานานเกินไป — กดลองอีกครั้ง';
export const MONTHLY_SLOW_MESSAGE = 'กำลังโหลดสรุปรายเดือน... (อาจใช้เวลาสักครู่)';
export const MONTHLY_EMPTY_MESSAGE = 'ยังไม่มีการฝึกในเดือนนี้';
export const DEFAULT_MONTHLY_TIMEOUT_MS = 10000;
export const DEFAULT_MONTHLY_SLOW_MS = 4000;

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** 'YYYY-MM' for a Date, in local time. */
export function monthKeyOf(date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${m}`;
}

export function isMonthKey(key) {
  return typeof key === 'string' && MONTH_RE.test(key);
}

/** Move a 'YYYY-MM' key by `delta` months (handles year changes). Invalid keys are returned unchanged. */
export function shiftMonth(key, delta) {
  if (!isMonthKey(key)) return key;
  const [y, m] = key.split('-').map(Number);
  const idx = y * 12 + (m - 1) + delta;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12 + 12) % 12 + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

/** Thai name of a month, e.g. "พฤศจิกายน 2026". */
export function monthLabel(key) {
  if (!isMonthKey(key)) return key;
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
}

/** Check and normalize the API response. Throws when the shape is wrong. */
export function normalizeMonthlySummary(payload) {
  if (!payload || !isMonthKey(payload.month) || !Array.isArray(payload.prs)) {
    throw new Error('Invalid monthly summary payload');
  }
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const opt = (v) => {
    const n = Number(v);
    return v === null || v === undefined || !Number.isFinite(n) ? null : n;
  };
  return {
    month: payload.month,
    sessions: num(payload.sessions),
    completedWorkingSets: num(payload.completedWorkingSets),
    volumeKg: num(payload.volumeKg),
    prs: payload.prs.map((p) => ({
      exerciseId: String(p?.exerciseId ?? ''),
      exerciseName: String(p?.exerciseName || p?.exerciseId || ''),
      bestWeight: opt(p?.bestWeight),
      bestReps: opt(p?.bestReps),
      estimated1RM: opt(p?.estimated1RM)
    }))
  };
}

/** True when the month has any session or completed working set. */
export function hasMonthlyData(summary) {
  return !!summary && (summary.sessions > 0 || summary.completedWorkingSets > 0);
}

/** "1,234.5 กก." — kilograms with separators, one decimal at most. */
export function formatVolumeKg(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })} กก.`;
}

/** Best set for one exercise: "60 กก. × 8", or "—" when there is none. */
export function formatBestSet(pr) {
  if (!pr || pr.bestWeight === null || pr.bestReps === null) return '—';
  return `${pr.bestWeight} กก. × ${pr.bestReps}`;
}

/** Estimated 1RM: "93.3 กก.", or "—". */
export function formatE1RM(pr) {
  if (!pr || pr.estimated1RM === null) return '—';
  return `${pr.estimated1RM.toFixed(1)} กก.`;
}

/**
 * Load state for the monthly summary. Keeps only the latest request: a slow answer for a month the
 * user has already left is ignored.
 */
export function useMonthlySummary(fetchImpl = globalThis.fetch, { timeoutMs = DEFAULT_MONTHLY_TIMEOUT_MS, slowMs = DEFAULT_MONTHLY_SLOW_MS } = {}) {
  const month = ref(monthKeyOf());
  const summary = ref(null);
  const loading = ref(false);
  const slow = ref(false);
  const error = ref('');
  let seq = 0;

  async function load(key = month.value) {
    if (!isMonthKey(key)) {
      error.value = MONTHLY_ERROR_MESSAGE;
      return;
    }
    const mine = ++seq;
    month.value = key;
    loading.value = true;
    slow.value = false;
    error.value = '';
    const slowTimer = setTimeout(() => { if (mine === seq) slow.value = true; }, slowMs);
    let timeoutTimer = null;
    const timeout = new Promise((_, reject) => {
      timeoutTimer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
    try {
      const res = await Promise.race([
        fetchImpl(`/api/summary/monthly?month=${encodeURIComponent(key)}`),
        timeout
      ]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = normalizeMonthlySummary(await res.json());
      if (mine === seq) summary.value = next;
    } catch (err) {
      if (mine !== seq) return; // a newer request owns the state now
      summary.value = null;
      error.value = err && err.message === 'timeout' ? MONTHLY_TIMEOUT_MESSAGE : MONTHLY_ERROR_MESSAGE;
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(timeoutTimer);
      if (mine === seq) {
        loading.value = false;
        slow.value = false;
      }
    }
  }

  function setMonth(key) {
    return load(key);
  }

  function retry() {
    return load(month.value);
  }

  return { month, summary, loading, slow, error, load, setMonth, retry };
}
