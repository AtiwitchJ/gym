import { ref, computed } from 'vue';

export const PROGRESSION_ERROR_MESSAGE = 'โหลดข้อมูลวิวัฒนาการไม่สำเร็จ';
export const GOAL_ERROR_MESSAGE = 'บันทึกเป้าหมายไม่สำเร็จ';

export const METRIC_CONFIG = {
  e1rm: {
    key: 'e1rm',
    label: 'e1RM (แรงประเมิน)',
    shortLabel: 'e1RM',
    unit: 'กก.',
    badgeLabel: 'e1RM สูงสุด'
  },
  maxWeight: {
    key: 'maxWeight',
    label: 'น้ำหนักยกสูงสุด',
    shortLabel: 'น้ำหนักสูงสุด',
    unit: 'กก.',
    badgeLabel: 'น้ำหนักสูงสุด'
  },
  volume: {
    key: 'volume',
    label: 'ปริมาณรวม (Volume)',
    shortLabel: 'Volume',
    unit: 'กก.',
    badgeLabel: 'ปริมาณรวม'
  }
};

const THAI_MONTH_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

/**
 * Format 'YYYY-MM-DD' into short Thai date, e.g. "20 พ.ย."
 */
export function formatThaiDateShort(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const mName = THAI_MONTH_SHORT[m] || '';
  return `${d} ${mName}`;
}

/**
 * Format 'YYYY-MM-DD' into readable full Thai text, e.g. "20 พ.ย. 2026"
 */
export function formatThaiDateFull(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const y = parts[0];
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const mName = THAI_MONTH_SHORT[m] || '';
  return `${d} ${mName} ${y}`;
}

/**
 * Format metric value with unit, e.g. "82.5 กก." or "1,920 กก."
 */
export function formatMetricValue(value, metricKey = 'e1rm') {
  if (value === null || value === undefined || isNaN(Number(value))) return '—';
  const num = Number(value);
  if (metricKey === 'volume') {
    return `${Math.round(num).toLocaleString()} กก.`;
  }
  const formatted = num % 1 === 0 ? String(num) : num.toFixed(1);
  return `${formatted} กก.`;
}

/**
 * Calculate SVG chart coordinates, lines, and axes
 */
export function calculateProgressionCoords(
  timeline = [],
  metricKey = 'e1rm',
  goal = null,
  width = 340,
  height = 180,
  padding = { top: 25, right: 25, bottom: 35, left: 45 }
) {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return {
      points: [],
      path: '',
      areaPath: '',
      goalLine: null,
      yAxisTicks: [],
      xAxisTicks: [],
      minVal: 0,
      maxVal: 0
    };
  }

  const plotW = Math.max(10, width - padding.left - padding.right);
  const plotH = Math.max(10, height - padding.top - padding.bottom);

  function getRawVal(item) {
    if (!item) return 0;
    if (metricKey === 'maxWeight') return Number(item.maxWeight) || 0;
    if (metricKey === 'volume') return Number(item.totalVolume) || 0;
    return Number(item.bestE1rm) || 0;
  }

  const rawValues = timeline.map(getRawVal);
  let minVal = Math.min(...rawValues);
  let maxVal = Math.max(...rawValues);

  // Consider goal value in axis scale if relevant metric
  let goalValue = null;
  if (goal && (metricKey === 'e1rm' || metricKey === 'maxWeight')) {
    const gVal = metricKey === 'e1rm'
      ? (Number(goal.targetE1rm) || Number(goal.targetWeight) || null)
      : (Number(goal.targetWeight) || null);
    if (gVal && gVal > 0) {
      goalValue = gVal;
      maxVal = Math.max(maxVal, goalValue);
      minVal = Math.min(minVal, goalValue);
    }
  }

  // Handle flat values or single item
  if (minVal === maxVal) {
    minVal = Math.max(0, minVal - 5);
    maxVal = maxVal + 5;
  }

  // Add 8% vertical padding
  const span = maxVal - minVal;
  const paddedMin = Math.max(0, Math.floor(minVal - span * 0.08));
  let paddedMax = Math.ceil(maxVal + span * 0.08);
  if (paddedMax <= paddedMin) paddedMax = paddedMin + 10;
  const effectiveSpan = paddedMax - paddedMin;

  const points = timeline.map((item, index) => {
    const val = getRawVal(item);
    let x = padding.left + plotW / 2;
    if (timeline.length > 1) {
      x = padding.left + (index / (timeline.length - 1)) * plotW;
    }
    const ratio = Math.max(0, Math.min(1, (val - paddedMin) / effectiveSpan));
    const y = padding.top + plotH - ratio * plotH;

    return {
      index,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      value: val,
      formattedValue: formatMetricValue(val, metricKey),
      date: item.date,
      displayDate: formatThaiDateShort(item.date),
      fullDate: formatThaiDateFull(item.date),
      sessionId: item.sessionId,
      bestSet: item.bestSet || null,
      workingSetsCount: item.workingSetsCount || 0,
      totalVolume: item.totalVolume || 0,
      maxWeight: item.maxWeight || 0,
      bestE1rm: item.bestE1rm || 0,
      rawItem: item
    };
  });

  // Construct SVG path
  let path = '';
  let areaPath = '';
  if (points.length === 1) {
    const pt = points[0];
    path = `M ${padding.left} ${pt.y} L ${width - padding.right} ${pt.y}`;
  } else if (points.length > 1) {
    path = points.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    const bottomY = padding.top + plotH;
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    areaPath = `${path} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  // Construct goal line
  let goalLine = null;
  if (goalValue !== null && goalValue > 0) {
    const gRatio = Math.max(0, Math.min(1, (goalValue - paddedMin) / effectiveSpan));
    const gy = Math.round((padding.top + plotH - gRatio * plotH) * 10) / 10;
    goalLine = {
      y: gy,
      value: goalValue,
      label: `🎯 ${goalValue} กก.`
    };
  }

  // Y-Axis Ticks (3 evenly spaced ticks)
  const yTicksCount = 3;
  const yAxisTicks = [];
  for (let i = 0; i < yTicksCount; i++) {
    const ratio = i / (yTicksCount - 1);
    const tickVal = Math.round(paddedMin + ratio * effectiveSpan);
    const ty = Math.round((padding.top + plotH - ratio * plotH) * 10) / 10;
    yAxisTicks.push({
      y: ty,
      value: tickVal,
      label: metricKey === 'volume' && tickVal >= 1000
        ? `${(tickVal / 1000).toFixed(1)}k`
        : String(tickVal)
    });
  }

  // X-Axis Ticks (smart sparse selection)
  const xAxisTicks = [];
  if (points.length <= 4) {
    points.forEach((p) => {
      xAxisTicks.push({ x: p.x, label: p.displayDate });
    });
  } else {
    // First, middle, and last
    const midIdx = Math.floor(points.length / 2);
    xAxisTicks.push({ x: points[0].x, label: points[0].displayDate });
    xAxisTicks.push({ x: points[midIdx].x, label: points[midIdx].displayDate });
    xAxisTicks.push({ x: points[points.length - 1].x, label: points[points.length - 1].displayDate });
  }

  return {
    points,
    path,
    areaPath,
    goalLine,
    yAxisTicks,
    xAxisTicks,
    minVal: paddedMin,
    maxVal: paddedMax
  };
}

export function useExerciseProgression(fetchImpl = globalThis.fetch) {
  const timeline = ref([]);
  const stats = ref(null);
  const goal = ref(null);
  const loading = ref(false);
  const error = ref('');
  const activeMetric = ref('e1rm');
  const selectedPointIndex = ref(-1);
  const isGoalModalOpen = ref(false);
  const goalSaving = ref(false);
  const goalError = ref('');

  async function loadProgression(exerciseId) {
    if (!exerciseId) {
      timeline.value = [];
      stats.value = null;
      goal.value = null;
      selectedPointIndex.value = -1;
      return;
    }

    loading.value = true;
    error.value = '';

    try {
      const res = await fetchImpl(`/api/exercises/${encodeURIComponent(exerciseId)}/progression?limit=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      timeline.value = Array.isArray(data.timeline) ? data.timeline : [];
      stats.value = data.stats || null;
      goal.value = data.goal || null;
      selectedPointIndex.value = timeline.value.length > 0 ? timeline.value.length - 1 : -1;
    } catch (err) {
      error.value = PROGRESSION_ERROR_MESSAGE;
      timeline.value = [];
      stats.value = null;
      goal.value = null;
      selectedPointIndex.value = -1;
    } finally {
      loading.value = false;
    }
  }

  async function setGoal(exerciseId, { targetWeight, targetReps, notes }) {
    if (!exerciseId) return false;

    const w = Number(targetWeight);
    const r = parseInt(targetReps || 1, 10);

    if (isNaN(w) || w <= 0 || w > 1000) {
      goalError.value = 'น้ำหนักเป้าหมายต้องเป็นตัวเลขมากกว่า 0 และไม่เกิน 1,000 กก.';
      return false;
    }
    if (isNaN(r) || r < 1 || r > 100) {
      goalError.value = 'จำนวนครั้งเป้าหมายต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 100 ครั้ง';
      return false;
    }

    goalSaving.value = true;
    goalError.value = '';

    try {
      const res = await fetchImpl(`/api/exercises/${encodeURIComponent(exerciseId)}/goal`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetWeight: w,
          targetReps: r,
          notes: notes ? String(notes).trim() : ''
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.goal) {
        goal.value = data.goal;
      }
      isGoalModalOpen.value = false;
      return true;
    } catch (err) {
      goalError.value = GOAL_ERROR_MESSAGE;
      return false;
    } finally {
      goalSaving.value = false;
    }
  }

  function setMetric(metricKey) {
    if (METRIC_CONFIG[metricKey]) {
      activeMetric.value = metricKey;
    }
  }

  function selectPoint(index) {
    selectedPointIndex.value = index;
  }

  const hasData = computed(() => timeline.value.length > 0);
  const selectedPoint = computed(() => {
    if (!hasData.value) return null;
    const idx = selectedPointIndex.value;
    if (idx >= 0 && idx < timeline.value.length) {
      return timeline.value[idx];
    }
    return timeline.value[timeline.value.length - 1];
  });

  const chartData = computed(() => {
    return calculateProgressionCoords(
      timeline.value,
      activeMetric.value,
      goal.value
    );
  });

  const deltaBadge = computed(() => {
    if (!stats.value || timeline.value.length < 2) return null;
    const delta = Number(stats.value.deltaE1rm) || 0;
    const pct = Number(stats.value.percentageGain) || 0;
    const sign = delta > 0 ? '+' : '';
    const pctSign = pct > 0 ? '+' : '';

    return {
      delta,
      percentage: pct,
      label: `📈 ${sign}${delta.toFixed(1)} กก. (${pctSign}${pct.toFixed(1)}%)`,
      isPositive: delta > 0,
      isNegative: delta < 0,
      isNeutral: delta === 0
    };
  });

  return {
    timeline,
    stats,
    goal,
    loading,
    error,
    activeMetric,
    selectedPointIndex,
    selectedPoint,
    isGoalModalOpen,
    goalSaving,
    goalError,
    hasData,
    chartData,
    deltaBadge,
    loadProgression,
    setGoal,
    setMetric,
    selectPoint
  };
}
