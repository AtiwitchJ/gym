<template>
  <div class="archive-card p-4 sm:p-5 space-y-3" aria-labelledby="monthly-summary-title">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <span class="text-[11px] font-mono font-bold tracking-widest text-emerald-text uppercase block">
          MONTHLY SUMMARY
        </span>
        <h3 id="monthly-summary-title" class="text-sm font-bold font-heading text-ink">สรุปรายเดือน</h3>
      </div>
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="min-h-[44px] min-w-[44px] rounded-xl border-2 border-plate bg-surface text-ink font-heading font-bold touch-manipulation disabled:opacity-50"
          aria-label="เดือนก่อนหน้า"
          :disabled="loading"
          @click="setMonth(shiftMonth(month, -1))"
        >‹</button>
        <span class="min-w-[9rem] text-center text-xs font-heading font-bold text-ink" aria-live="polite">
          {{ monthTitle }}
        </span>
        <button
          type="button"
          class="min-h-[44px] min-w-[44px] rounded-xl border-2 border-plate bg-surface text-ink font-heading font-bold touch-manipulation disabled:opacity-50"
          aria-label="เดือนถัดไป"
          :disabled="loading || !canGoNext"
          @click="setMonth(shiftMonth(month, 1))"
        >›</button>
      </div>
    </div>

    <div
      v-if="error"
      role="alert"
      class="text-xs font-body text-red-700 bg-red-50 border-2 border-red-600 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"
    >
      <span>{{ error }}</span>
      <button
        type="button"
        class="min-h-[44px] min-w-[44px] px-3 rounded-xl border-2 border-plate bg-white text-ink font-heading font-bold text-xs touch-manipulation"
        @click="retry"
      >ลองอีกครั้ง</button>
    </div>
    <p v-else-if="loading" class="text-xs text-ink-muted font-body" role="status">
      {{ slow ? slowMessage : 'กำลังโหลดสรุปรายเดือน...' }}
    </p>
    <p v-else-if="!hasData" class="text-xs text-ink-muted font-body">{{ emptyMessage }}</p>

    <template v-else-if="summary">
      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-xl border-2 border-plate bg-white p-2.5 text-center">
          <div class="text-[11px] font-mono font-bold text-ink-muted">เซ็ตที่ทำเสร็จ</div>
          <div class="text-lg font-mono font-extrabold text-ink tabular-nums">{{ summary.completedWorkingSets }}</div>
        </div>
        <div class="rounded-xl border-2 border-plate bg-white p-2.5 text-center">
          <div class="text-[11px] font-mono font-bold text-ink-muted">ปริมาณรวม</div>
          <div class="text-lg font-mono font-extrabold text-ink tabular-nums">{{ volumeText }}</div>
        </div>
        <div class="rounded-xl border-2 border-plate bg-white p-2.5 text-center">
          <div class="text-[11px] font-mono font-bold text-ink-muted">จำนวนการฝึก</div>
          <div class="text-lg font-mono font-extrabold text-ink tabular-nums">{{ summary.sessions }}</div>
        </div>
      </div>

      <div v-if="summary.prs.length" class="space-y-1.5">
        <div class="text-[11px] font-mono font-bold text-ink-muted">PR ต่อท่า (เรียงตาม 1RM ประมาณ)</div>
        <ul class="divide-y-2 divide-plate/10 rounded-xl border-2 border-plate bg-white">
          <li
            v-for="pr in summary.prs"
            :key="pr.exerciseId"
            class="flex items-center justify-between gap-2 px-2.5 py-2 text-xs font-body"
          >
            <span class="min-w-0 truncate font-bold text-ink">{{ pr.exerciseName }}</span>
            <span class="shrink-0 font-mono text-ink-muted tabular-nums">
              {{ formatBestSet(pr) }}
              <span class="text-ink">· 1RM {{ formatE1RM(pr) }}</span>
            </span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import {
  useMonthlySummary,
  monthKeyOf,
  monthLabel,
  shiftMonth,
  hasMonthlyData,
  formatVolumeKg,
  formatBestSet,
  formatE1RM,
  MONTHLY_SLOW_MESSAGE,
  MONTHLY_EMPTY_MESSAGE
} from '../composables/useMonthlySummary.js';

const { month, summary, loading, slow, error, setMonth, retry } = useMonthlySummary();

const slowMessage = MONTHLY_SLOW_MESSAGE;
const emptyMessage = MONTHLY_EMPTY_MESSAGE;

const monthTitle = computed(() => monthLabel(month.value));
const hasData = computed(() => hasMonthlyData(summary.value));
const volumeText = computed(() => formatVolumeKg(summary.value ? summary.value.volumeKg : NaN));
// The next month is not offered past the current month (no data there yet).
const canGoNext = computed(() => month.value < monthKeyOf());

onMounted(() => {
  setMonth(month.value);
});
</script>
