import { ref, computed } from 'vue';

/**
 * Muscle Fatigue & Recovery Indicator (SPEC 2.3 & 2D Anatomical Heatmap)
 * Data contracts supported:
 * 1. Legacy array:
 *    [{ muscle, lastTrainedAt (ISO|null), recoveryPct, status: "fatigued"|"recovering"|"ready"|"untrained" }]
 * 2. New heatmap contract:
 *    { summary: { overallStatus, fatiguedCount, recoveringCount, readyCount },
 *      muscles: [{ muscleKey, displayName, recoveryPct, status, lastTrainedAt, hoursRemaining }] }
 */

export const RECOVERY_ERROR_MESSAGE = 'โหลดข้อมูลการฟื้นตัวไม่ได้';

export const STATUS_COLORS = {
  fatigued: '#EF4444',
  recovering: '#F59E0B',
  ready: '#10B981',
  untrained: '#E5E7EB'
};

export const RECOVERY_STATUS_META = {
  fatigued: {
    label: 'เมื่อยล้า',
    badge: 'bg-red-600 text-white border-plate',
    bar: 'bg-red-600',
    color: '#EF4444'
  },
  recovering: {
    label: 'กำลังฟื้นตัว',
    badge: 'bg-yellow-400 text-plate border-plate',
    bar: 'bg-yellow-400',
    color: '#F59E0B'
  },
  ready: {
    label: 'พร้อมซ้อม',
    badge: 'bg-green-600 text-white border-plate',
    bar: 'bg-green-600',
    color: '#10B981'
  },
  untrained: {
    label: 'ยังไม่เคยฝึก',
    badge: 'bg-gray-200 text-ink-muted border-plate',
    bar: 'bg-gray-300',
    color: '#E5E7EB'
  }
};

export const MUSCLE_KEY_WHITELIST = [
  'chest',
  'lats',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'delts',
  'abs',
  'calves',
  'traps'
];

export const MUSCLE_DISPLAY_NAMES = {
  chest: 'หน้าอก (Chest)',
  lats: 'หลัง/ปีก (Lats)',
  biceps: 'หน้าแขน (Biceps)',
  triceps: 'หลังแขน (Triceps)',
  quads: 'ต้นขาด้านหน้า (Quads)',
  hamstrings: 'ต้นขาด้านหลัง (Hamstrings)',
  glutes: 'ก้น/สะโพก (Glutes)',
  delts: 'หัวไหล่ (Delts)',
  abs: 'หน้าท้อง/แกนกลาง (Abs)',
  calves: 'น่อง (Calves)',
  traps: 'บ่า/สะพานคอ (Traps)'
};

/**
 * Infer English standard slug key from Thai or English muscle label
 */
export function inferMuscleKey(name) {
  if (!name || typeof name !== 'string') return 'chest';
  const lower = name.toLowerCase();
  if (lower.includes('chest') || lower.includes('อก')) return 'chest';
  if (lower.includes('lat') || lower.includes('ปีก')) return 'lats';
  if (lower.includes('bicep') || lower.includes('หน้าแขน')) return 'biceps';
  if (lower.includes('tricep') || lower.includes('หลังแขน')) return 'triceps';
  if (lower.includes('quad') || lower.includes('ต้นขาด้านหน้า') || lower.includes('หน้าขา')) return 'quads';
  if (lower.includes('hamstring') || lower.includes('ต้นขาด้านหลัง') || lower.includes('หลังขา')) return 'hamstrings';
  if (lower.includes('glute') || lower.includes('ก้น') || lower.includes('สะโพก')) return 'glutes';
  if (lower.includes('delt') || lower.includes('shoulder') || lower.includes('ไหล่')) return 'delts';
  if (lower.includes('ab') || lower.includes('core') || lower.includes('ท้อง')) return 'abs';
  if (lower.includes('calf') || lower.includes('calves') || lower.includes('น่อง')) return 'calves';
  if (lower.includes('trap') || lower.includes('บ่า') || lower.includes('สะพานคอ')) return 'traps';
  return 'chest';
}

/**
 * Map a recovery percentage to a status (SPEC 2.3 thresholds).
 * 0–49 fatigued, 50–84 recovering, 85–100 ready.
 */
export function statusFromPct(pct) {
  const p = Number(pct);
  if (pct === null || pct === undefined || isNaN(p)) return 'ready';
  if (p >= 85) return 'ready';
  if (p >= 50) return 'recovering';
  return 'fatigued';
}

export function getRecoveryMeta(status) {
  return RECOVERY_STATUS_META[status] || RECOVERY_STATUS_META.ready;
}

export function getMuscleColor(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.ready;
}

/**
 * Derive summary metrics from muscle items
 */
export function deriveRecoverySummary(items = []) {
  let fatiguedCount = 0;
  let recoveringCount = 0;
  let readyCount = 0;

  for (const m of items) {
    if (m.status === 'fatigued') fatiguedCount++;
    else if (m.status === 'recovering') recoveringCount++;
    else readyCount++;
  }

  let overallStatus = 'ready';
  if (fatiguedCount > 2) overallStatus = 'fatigued';
  else if (recoveringCount > 3 || fatiguedCount > 0) overallStatus = 'recovering';

  return {
    overallStatus,
    fatiguedCount,
    recoveringCount,
    readyCount
  };
}

/**
 * Validate and normalize the API payload.
 * Supports both legacy Array and new { summary, muscles } responses.
 * Throws when the payload is invalid.
 */
export function normalizeRecovery(payload) {
  let rawList = null;
  let rawSummary = null;

  if (Array.isArray(payload)) {
    rawList = payload;
  } else if (payload && typeof payload === 'object' && Array.isArray(payload.muscles)) {
    rawList = payload.muscles;
    rawSummary = payload.summary;
  } else {
    throw new Error('Invalid recovery payload');
  }

  const items = rawList.map((item) => {
    const muscleName = String(item?.muscle ?? item?.displayName ?? item?.muscleKey ?? '').trim();
    if (!muscleName) {
      throw new Error('Recovery item is missing muscle');
    }

    const rawPct = Number(item.recoveryPct);
    const recoveryPct = Number.isFinite(rawPct)
      ? Math.min(100, Math.max(0, Math.round(rawPct)))
      : 0;

    const lastTrainedAt = typeof item.lastTrainedAt === 'string' && !Number.isNaN(Date.parse(item.lastTrainedAt))
      ? item.lastTrainedAt
      : null;

    let status = item.status;
    if (status !== 'untrained' && !RECOVERY_STATUS_META[status]) {
      status = statusFromPct(recoveryPct);
    }

    const muscleKey = item.muscleKey && typeof item.muscleKey === 'string'
      ? item.muscleKey.trim().toLowerCase()
      : inferMuscleKey(muscleName);

    const displayName = item.displayName
      ? String(item.displayName).trim()
      : (MUSCLE_DISPLAY_NAMES[muscleKey] || muscleName);

    // Estimate hours remaining until 85% full ready (assuming 48h full recovery window)
    const hoursRemaining = Number.isFinite(Number(item.hoursRemaining))
      ? Number(item.hoursRemaining)
      : (recoveryPct >= 85 ? 0 : Math.max(0, Math.round((85 - recoveryPct) * 48 / 100)));

    return {
      muscle: item.muscle ? String(item.muscle).trim() : displayName,
      displayName,
      muscleKey,
      lastTrainedAt,
      recoveryPct,
      status,
      hoursRemaining
    };
  });

  // Attach summary property directly to the array for callers needing summary
  const summary = rawSummary && typeof rawSummary === 'object'
    ? {
        overallStatus: String(rawSummary.overallStatus || 'ready'),
        fatiguedCount: Number(rawSummary.fatiguedCount) || 0,
        recoveringCount: Number(rawSummary.recoveringCount) || 0,
        readyCount: Number(rawSummary.readyCount) || 0
      }
    : deriveRecoverySummary(items);

  items.summary = summary;
  return items;
}

/**
 * Fetch and hold recovery state.
 * @param {typeof fetch} fetchImpl - injectable for tests
 */
export function useRecovery(fetchImpl = globalThis.fetch) {
  const items = ref([]);
  const summary = ref(null);
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
      const data = normalizeRecovery(await res.json());
      items.value = data;
      summary.value = data.summary || deriveRecoverySummary(data);
    } catch (err) {
      items.value = [];
      summary.value = null;
      error.value = RECOVERY_ERROR_MESSAGE;
    } finally {
      loading.value = false;
    }
  }

  return { items, summary, loading, error, load };
}
