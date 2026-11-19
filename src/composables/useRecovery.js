import { ref } from 'vue';

/**
 * Muscle Fatigue & Recovery Indicator (SPEC 2.3)
 * Data contract from GET /api/recovery:
 *   [{ muscle, lastTrainedAt (ISO|null), recoveryPct, status: "fatigued"|"recovering"|"ready" }]
 */

export const RECOVERY_ERROR_MESSAGE = 'โหลดข้อมูลการฟื้นตัวไม่ได้';

export const RECOVERY_STATUS_META = {
  fatigued: {
    label: 'เมื่อยล้า',
    badge: 'bg-red-600 text-white border-plate',
    bar: 'bg-red-600',
  },
  recovering: {
    label: 'กำลังฟื้นตัว',
    badge: 'bg-yellow-400 text-plate border-plate',
    bar: 'bg-yellow-400',
  },
  ready: {
    label: 'พร้อมซ้อม',
    badge: 'bg-green-600 text-white border-plate',
    bar: 'bg-green-600',
  },
};

/**
 * Map a recovery percentage to a status (SPEC 2.3 thresholds).
 * 0–49 fatigued, 50–84 recovering, 85–100 ready.
 */
export function statusFromPct(pct) {
  const p = Number(pct) || 0;
  if (p >= 85) return 'ready';
  if (p >= 50) return 'recovering';
  return 'fatigued';
}

export function getRecoveryMeta(status) {
  return RECOVERY_STATUS_META[status] || RECOVERY_STATUS_META[statusFromPct(0)];
}

/**
 * Validate and normalize the API payload.
 * Throws when the payload is not an array so the caller can show the error message.
 */
export function normalizeRecovery(payload) {
  if (!Array.isArray(payload)) {
    throw new Error('Invalid recovery payload');
  }
  return payload.map((item) => {
    const muscle = String(item?.muscle ?? '').trim();
    if (!muscle) {
      throw new Error('Recovery item is missing muscle');
    }
    const rawPct = Number(item.recoveryPct);
    const recoveryPct = Number.isFinite(rawPct) ? Math.min(100, Math.max(0, Math.round(rawPct))) : 0;
    const lastTrainedAt = typeof item.lastTrainedAt === 'string' && !Number.isNaN(Date.parse(item.lastTrainedAt))
      ? item.lastTrainedAt
      : null;
    const status = RECOVERY_STATUS_META[item.status] ? item.status : statusFromPct(recoveryPct);
    return { muscle, lastTrainedAt, recoveryPct, status };
  });
}

/**
 * Fetch and hold recovery state.
 * @param {typeof fetch} fetchImpl - injectable for tests
 */
export function useRecovery(fetchImpl = globalThis.fetch) {
  const items = ref([]);
  const loading = ref(false);
  const error = ref('');

  async function load() {
    loading.value = true;
    error.value = '';
    try {
      const res = await fetchImpl('/api/recovery');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      items.value = normalizeRecovery(await res.json());
    } catch (err) {
      items.value = [];
      error.value = RECOVERY_ERROR_MESSAGE;
    } finally {
      loading.value = false;
    }
  }

  return { items, loading, error, load };
}
