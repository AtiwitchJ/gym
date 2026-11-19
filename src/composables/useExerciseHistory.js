import { ref } from 'vue';
import { rirLabel } from './useRir.js';

/**
 * Per-exercise history with PR (GET /api/exercises/:id/history).
 * Response: array of sessions; each session has `sets` and the same `pr` object:
 *   pr = { bestWeight, bestReps, estimated1RM } (null when no completed set exists)
 */

export const HISTORY_ERROR_MESSAGE = 'โหลดประวัติท่านี้ไม่ได้';
export const HISTORY_EMPTY_MESSAGE = 'ยังไม่มีประวัติการฝึกท่านี้';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function normalizePr(pr) {
  return {
    bestWeight: num(pr?.bestWeight),
    bestReps: num(pr?.bestReps),
    estimated1RM: num(pr?.estimated1RM)
  };
}

export function hasPr(pr) {
  return !!pr && (pr.bestWeight !== null || pr.bestReps !== null || pr.estimated1RM !== null);
}

export function normalizeExerciseHistory(payload) {
  if (!Array.isArray(payload)) {
    throw new Error('Invalid history payload');
  }
  const sessions = payload.map((s) => ({
    sessionId: String(s?.sessionId ?? ''),
    date: String(s?.date ?? ''),
    time: String(s?.time ?? ''),
    dayTitle: String(s?.dayTitle ?? ''),
    sets: (Array.isArray(s?.sets) ? s.sets : []).map((set) => ({
      setIndex: Number(set?.setIndex) || 0,
      type: String(set?.type ?? ''),
      weight: num(set?.weight),
      actualReps: num(set?.actualReps),
      done: !!set?.done,
      rir: Number.isFinite(Number(set?.rir)) && set?.rir !== null ? Number(set.rir) : null,
      rirPlus: !!set?.rirPlus
    }))
  }));
  // The server puts the same PR on every session; read it from the first one.
  return { sessions, pr: normalizePr(payload[0]?.pr) };
}

/** Rows for the PR card, always three, with '—' when there is no value yet. */
export function formatPr(pr) {
  const n = normalizePr(pr);
  return [
    { label: 'น้ำหนักสูงสุด', value: n.bestWeight !== null ? `${n.bestWeight} kg` : '—' },
    { label: 'ครั้งสูงสุดในเซ็ต', value: n.bestReps !== null ? `${n.bestReps} ครั้ง` : '—' },
    { label: '1RM ประมาณ (e1RM)', value: n.estimated1RM !== null ? `${n.estimated1RM.toFixed(1)} kg` : '—' }
  ];
}

/** Short text for one set in a history row. */
export function setText(set) {
  // Review fix: never 'ข้าม'. A set that was not ticked says so; a set with no values shows nothing.
  const hasValues = (set.weight !== null && set.weight !== undefined && set.weight > 0) || (set.actualReps !== null && set.actualReps !== undefined && set.actualReps > 0);
  if (!set.done) return hasValues ? `${set.weight ?? '—'} kg × ${set.actualReps ?? '—'} · ยังไม่ได้ติ๊ก` : '';
  const weight = set.weight !== null ? `${set.weight} kg` : '—';
  const reps = set.actualReps !== null ? `× ${set.actualReps}` : '';
  const rir = set.rir !== null ? ` · RIR ${rirLabel(set.rir, set.rirPlus)}` : '';
  return `${weight} ${reps}${rir}`.trim();
}

export const HISTORY_TIMEOUT_MESSAGE = 'การโหลดใช้เวลานานเกินไป — กดลองอีกครั้ง';
export const HISTORY_LOAD_TIMEOUT_MS = 10000;

export function useExerciseHistory(fetchImpl = globalThis.fetch, { timeoutMs = HISTORY_LOAD_TIMEOUT_MS } = {}) {
  const sessions = ref([]);
  const pr = ref(normalizePr(null));
  const loading = ref(false);
  const error = ref('');
  let lastId = null;

  async function load(exerciseId) {
    lastId = exerciseId;
    loading.value = true;
    error.value = '';
    let timeoutTimer = null;
    const timeout = new Promise((_, reject) => {
      timeoutTimer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
    try {
      const res = await Promise.race([fetchImpl(`/api/exercises/${encodeURIComponent(exerciseId)}/history`), timeout]);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const normalized = normalizeExerciseHistory(await res.json());
      sessions.value = normalized.sessions;
      pr.value = normalized.pr;
    } catch (err) {
      sessions.value = [];
      pr.value = normalizePr(null);
      error.value = err && err.message === 'timeout' ? HISTORY_TIMEOUT_MESSAGE : HISTORY_ERROR_MESSAGE;
    } finally {
      clearTimeout(timeoutTimer);
      loading.value = false;
    }
  }

  // Retry the same exercise after an error or a timeout.
  function retry() {
    return load(lastId);
  }

  return { sessions, pr, loading, error, load, retry };
}
