<template>
  <div class="archive-card p-4 sm:p-5 flex flex-col gap-3.5 select-none bg-white border-2 border-plate rounded-2xl shadow-[3px_3px_0px_#1e2220]">
    <!-- Top Header -->
    <div class="flex items-start justify-between gap-3 border-b-2 border-plate/10 pb-3">
      <div>
        <span class="text-[11px] font-mono font-bold tracking-widest text-emerald-text uppercase block">
          EXERCISE PROGRESSION · กราฟวิวัฒนาการ
        </span>
        <div class="flex items-center gap-2 mt-0.5 flex-wrap">
          <!-- Progress Delta Badge -->
          <div
            v-if="deltaBadge"
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border"
            :class="deltaBadge.isPositive
              ? 'bg-emerald-bg text-emerald-text border-emerald'
              : deltaBadge.isNegative
                ? 'bg-red-50 text-red-700 border-red-300'
                : 'bg-surface-low text-ink border-plate/30'"
          >
            <span>{{ deltaBadge.label }}</span>
          </div>

          <span v-else-if="timeline.length === 1" class="text-[11px] font-mono font-bold text-ink-muted">
            (บันทึกครั้งแรก)
          </span>

          <span v-if="stats && stats.bestWeightEver" class="text-[11px] font-mono text-ink-muted">
            · ยกสูงสุด: <strong class="text-ink">{{ stats.bestWeightEver }} กก.</strong>
          </span>
        </div>
      </div>

      <!-- Goal Setting Toggle Button -->
      <button
        type="button"
        @click="toggleGoalModal"
        class="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl border-2 border-plate bg-surface hover:bg-paper-dim text-xs font-heading font-bold text-ink shadow-[2px_2px_0px_#1e2220] touch-manipulation active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1.5 flex-shrink-0"
        title="กำหนดเป้าหมายความแข็งแรงของท่านี้"
      >
        <span>🎯</span>
        <span class="hidden sm:inline">{{ goal ? 'แก้ไขเป้าหมาย' : 'ตั้งเป้าหมาย' }}</span>
      </button>
    </div>

    <!-- Inline Goal Setting Form (Collapsible) -->
    <div
      v-if="isGoalModalOpen"
      class="p-3.5 bg-paper-subtle border-2 border-plate rounded-xl shadow-[2px_2px_0px_#1e2220] flex flex-col gap-2.5"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-heading font-bold text-ink flex items-center gap-1.5">
          <span>🎯</span>
          <span>กำหนดเป้าหมายความแข็งแรง (Exercise Goal)</span>
        </span>
        <span class="text-[11px] font-mono text-ink-muted">
          บันทึกในเครื่อง
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-mono font-bold text-ink-muted">น้ำหนักเป้าหมาย (กก.) *</label>
          <input
            v-model="goalForm.targetWeight"
            type="number"
            step="0.5"
            min="1"
            max="1000"
            placeholder="เช่น 100"
            class="min-h-[44px] px-3 py-2 rounded-xl border-2 border-plate bg-white text-ink text-xs font-mono font-bold"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-mono font-bold text-ink-muted">จำนวนครั้ง (Reps) *</label>
          <input
            v-model="goalForm.targetReps"
            type="number"
            min="1"
            max="100"
            placeholder="เช่น 1 หรือ 5"
            class="min-h-[44px] px-3 py-2 rounded-xl border-2 border-plate bg-white text-ink text-xs font-mono font-bold"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-mono font-bold text-ink-muted">บันทึกช่วยจำ (Notes)</label>
          <input
            v-model="goalForm.notes"
            type="text"
            maxlength="100"
            placeholder="เช่น เป้าสิ้นปี 2026"
            class="min-h-[44px] px-3 py-2 rounded-xl border-2 border-plate bg-white text-ink text-xs font-body"
          />
        </div>
      </div>

      <!-- Error inside goal form -->
      <div
        v-if="goalError"
        class="p-2 rounded-lg bg-red-100 border border-red-500 text-red-950 text-xs font-mono"
      >
        {{ goalError }}
      </div>

      <div class="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          @click="isGoalModalOpen = false"
          class="min-h-[44px] min-w-[44px] px-3 rounded-xl border-2 border-plate bg-white text-ink text-xs font-heading font-bold shadow-[1px_1px_0px_#1e2220] touch-manipulation active:translate-x-[1px] active:translate-y-[1px]"
        >
          ยกเลิก
        </button>

        <button
          type="button"
          @click="handleSaveGoal"
          :disabled="goalSaving"
          class="min-h-[44px] px-4 rounded-xl border-2 border-plate bg-emerald hover:bg-emerald/90 text-white text-xs font-heading font-bold shadow-[2px_2px_0px_#1e2220] touch-manipulation active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <span v-if="goalSaving">กำลังบันทึก...</span>
          <span v-else>บันทึกเป้าหมาย</span>
        </button>
      </div>
    </div>

    <!-- Active Goal Banner (when set and not currently editing) -->
    <div
      v-if="goal && !isGoalModalOpen"
      class="px-3 py-2 rounded-xl border-2 border-plate bg-flame-bg text-ink flex items-center justify-between gap-2 text-xs font-mono"
    >
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-bold text-flame-text">🎯 เป้าหมาย:</span>
        <strong class="font-bold text-ink">{{ goal.targetWeight }} กก. × {{ goal.targetReps }} ครั้ง</strong>
        <span v-if="goal.targetE1rm" class="text-ink-muted">
          (e1RM ≈ {{ goal.targetE1rm }} กก.)
        </span>
        <span v-if="goal.notes" class="text-ink-muted italic">
          — "{{ goal.notes }}"
        </span>
      </div>
      <button
        type="button"
        @click="toggleGoalModal"
        class="min-h-[44px] min-w-[44px] text-xs font-bold text-ink-muted hover:text-ink underline touch-manipulation flex items-center justify-center"
      >
        แก้ไข
      </button>
    </div>

    <!-- Metric Switcher Buttons (e1RM / Max Weight / Volume) -->
    <div class="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        @click="setMetric('e1rm')"
        class="min-h-[44px] px-3.5 py-2 text-xs font-heading font-bold rounded-xl border-2 border-plate touch-manipulation transition-all active:translate-x-[1px] active:translate-y-[1px]"
        :class="activeMetric === 'e1rm'
          ? 'bg-flame text-white shadow-[2px_2px_0px_#1e2220]'
          : 'bg-surface hover:bg-paper-dim text-ink shadow-[1px_1px_0px_#1e2220]'"
      >
        e1RM (แรงประเมิน)
      </button>

      <button
        type="button"
        @click="setMetric('maxWeight')"
        class="min-h-[44px] px-3.5 py-2 text-xs font-heading font-bold rounded-xl border-2 border-plate touch-manipulation transition-all active:translate-x-[1px] active:translate-y-[1px]"
        :class="activeMetric === 'maxWeight'
          ? 'bg-flame text-white shadow-[2px_2px_0px_#1e2220]'
          : 'bg-surface hover:bg-paper-dim text-ink shadow-[1px_1px_0px_#1e2220]'"
      >
        น้ำหนักยกสูงสุด
      </button>

      <button
        type="button"
        @click="setMetric('volume')"
        class="min-h-[44px] px-3.5 py-2 text-xs font-heading font-bold rounded-xl border-2 border-plate touch-manipulation transition-all active:translate-x-[1px] active:translate-y-[1px]"
        :class="activeMetric === 'volume'
          ? 'bg-flame text-white shadow-[2px_2px_0px_#1e2220]'
          : 'bg-surface hover:bg-paper-dim text-ink shadow-[1px_1px_0px_#1e2220]'"
      >
        ปริมาณรวม (Volume)
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-12 text-center text-xs text-ink-muted font-body">
      กำลังโหลดข้อมูลวิวัฒนาการ...
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="p-3 rounded-xl bg-red-100 border-2 border-red-500 text-red-950 text-xs font-mono font-bold flex items-center justify-between shadow-[2px_2px_0px_#1e2220]"
    >
      <div class="flex items-center gap-1.5">
        <span>⚠️</span>
        <span>{{ error }}</span>
      </div>
      <button
        type="button"
        @click="loadProgression(exerciseId)"
        class="min-h-[44px] min-w-[44px] px-3 py-1 rounded-lg border border-red-600 bg-white text-red-900 text-xs font-bold hover:bg-red-50 active:translate-x-[1px] active:translate-y-[1px] touch-manipulation"
      >
        ลองใหม่
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!hasData"
      class="p-6 text-center text-xs text-ink-muted font-body bg-paper-subtle rounded-xl border border-plate/20"
    >
      ยังไม่มีประวัติการฝึกสำหรับสร้างกราฟวิวัฒนาการ เมื่อคุณบันทึกการซ้อมในแต่ละวัน ข้อมูลจะพล็อตที่นี่โดยอัตโนมัติ
    </div>

    <!-- Chart Visualization & Tapped Detail -->
    <template v-else>
      <div class="relative w-full bg-paper-subtle border-2 border-plate rounded-xl p-2 sm:p-3 shadow-inner">
        <!-- Metric Unit Indicator -->
        <div class="flex items-center justify-between text-[11px] font-mono text-ink-muted px-1 mb-1">
          <span>หน่วย: {{ currentMetricUnit }}</span>
          <span v-if="chartData.goalLine" class="text-flame-text font-bold">
            {{ chartData.goalLine.label }}
          </span>
        </div>

        <svg
          viewBox="0 0 340 180"
          class="w-full h-auto overflow-visible"
          role="img"
          :aria-label="`กราฟแสดง ${currentMetricLabel} รายวัน`"
        >
          <defs>
            <linearGradient id="progression-emerald-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#059669" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#059669" stop-opacity="0.0" />
            </linearGradient>
          </defs>

          <!-- Y-Axis Grid Lines & Tick Labels -->
          <g v-for="tick in chartData.yAxisTicks" :key="'y-' + tick.y">
            <line
              x1="45"
              :y1="tick.y"
              x2="315"
              :y2="tick.y"
              stroke="#1e2220"
              stroke-opacity="0.12"
              stroke-dasharray="3 3"
            />
            <text
              x="40"
              :y="tick.y + 4"
              text-anchor="end"
              font-family="monospace"
              font-size="11"
              fill="#4a544f"
            >
              {{ tick.label }}
            </text>
          </g>

          <!-- Goal Dashed Line (if applicable) -->
          <g v-if="chartData.goalLine">
            <line
              x1="45"
              :y1="chartData.goalLine.y"
              x2="315"
              :y2="chartData.goalLine.y"
              stroke="#ea580c"
              stroke-width="2"
              stroke-dasharray="4 4"
            />
          </g>

          <!-- Area Gradient Fill -->
          <path
            v-if="chartData.areaPath"
            :d="chartData.areaPath"
            fill="url(#progression-emerald-grad)"
          />

          <!-- Main Progression Stroke Line -->
          <path
            v-if="chartData.path"
            :d="chartData.path"
            fill="none"
            stroke="#1e2220"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Data Points with Touch Target Area -->
          <g v-for="pt in chartData.points" :key="'pt-' + pt.index">
            <!-- Large Invisible Touch Hit Circle (≥ 44px equivalent) -->
            <circle
              :cx="pt.x"
              :cy="pt.y"
              r="22"
              fill="transparent"
              class="cursor-pointer touch-manipulation"
              @click="selectPoint(pt.index)"
            />

            <!-- Outer Selection Ring -->
            <circle
              v-if="selectedPointIndex === pt.index"
              :cx="pt.x"
              :cy="pt.y"
              r="9"
              fill="none"
              stroke="#ea580c"
              stroke-width="2.5"
            />

            <!-- Visible Point Circle -->
            <circle
              :cx="pt.x"
              :cy="pt.y"
              :r="selectedPointIndex === pt.index ? 6 : 4.5"
              :fill="selectedPointIndex === pt.index ? '#ea580c' : '#ffffff'"
              stroke="#1e2220"
              stroke-width="2.5"
              class="pointer-events-none transition-all"
            />
          </g>

          <!-- X-Axis Date Labels -->
          <g v-for="(tick, idx) in chartData.xAxisTicks" :key="'x-' + idx">
            <text
              :x="tick.x"
              y="170"
              text-anchor="middle"
              font-family="sans-serif"
              font-size="11"
              fill="#4a544f"
            >
              {{ tick.label }}
            </text>
          </g>
        </svg>
      </div>

      <!-- Tapped Data Point Detail Panel -->
      <div
        v-if="selectedPoint"
        class="p-3 bg-surface-low border-2 border-plate rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-[2px_2px_0px_#1e2220]"
      >
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold font-heading text-ink">
              📌 {{ selectedPoint.fullDate || selectedPoint.date }}
            </span>
            <span class="text-xs font-mono font-bold text-flame-text">
              {{ selectedMetricText }}
            </span>
          </div>

          <div class="text-[11px] font-mono text-ink-muted mt-0.5">
            <span v-if="selectedPoint.bestSet">
              เซ็ตดีที่สุด: {{ selectedPoint.bestSet.weight }} กก. × {{ selectedPoint.bestSet.reps }} ครั้ง
              <span v-if="selectedPoint.bestSet.rir !== null && selectedPoint.bestSet.rir !== undefined">
                (RIR {{ selectedPoint.bestSet.rir }})
              </span>
            </span>
            <span> · ทำไป {{ selectedPoint.workingSetsCount }} เซ็ตจริง</span>
            <span> · ปริมาณรวม {{ Math.round(selectedPoint.totalVolume).toLocaleString() }} กก.</span>
          </div>
        </div>

        <div class="text-[11px] font-mono text-ink-muted self-end sm:self-auto">
          แตะจุดบนกราฟเพื่อดูรอบอื่น
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { reactive, computed, watch, onMounted } from 'vue';
import {
  useExerciseProgression,
  METRIC_CONFIG,
  formatMetricValue
} from '../composables/useExerciseProgression.js';

const props = defineProps({
  exerciseId: {
    type: String,
    required: true
  }
});

const {
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
} = useExerciseProgression();

const goalForm = reactive({
  targetWeight: '',
  targetReps: 1,
  notes: ''
});

const currentMetricLabel = computed(() => {
  return METRIC_CONFIG[activeMetric.value]?.label || '';
});

const currentMetricUnit = computed(() => {
  return METRIC_CONFIG[activeMetric.value]?.unit || 'กก.';
});

const selectedMetricText = computed(() => {
  if (!selectedPoint.value) return '';
  if (activeMetric.value === 'maxWeight') {
    return `ยกสูงสุด: ${selectedPoint.value.maxWeight} กก.`;
  }
  if (activeMetric.value === 'volume') {
    return `Volume: ${Math.round(selectedPoint.value.totalVolume).toLocaleString()} กก.`;
  }
  return `e1RM: ${selectedPoint.value.bestE1rm} กก.`;
});

function toggleGoalModal() {
  if (!isGoalModalOpen.value) {
    // Populate form with existing goal if present
    if (goal.value) {
      goalForm.targetWeight = goal.value.targetWeight;
      goalForm.targetReps = goal.value.targetReps || 1;
      goalForm.notes = goal.value.notes || '';
    } else {
      goalForm.targetWeight = stats.value?.bestWeightEver || '';
      goalForm.targetReps = 1;
      goalForm.notes = '';
    }
  }
  isGoalModalOpen.value = !isGoalModalOpen.value;
}

async function handleSaveGoal() {
  await setGoal(props.exerciseId, {
    targetWeight: goalForm.targetWeight,
    targetReps: goalForm.targetReps,
    notes: goalForm.notes
  });
}

watch(
  () => props.exerciseId,
  (newId) => {
    if (newId) {
      loadProgression(newId);
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (props.exerciseId) {
    loadProgression(props.exerciseId);
  }
});
</script>
