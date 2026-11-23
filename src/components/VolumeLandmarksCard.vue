<template>
  <div class="archive-card p-4 sm:p-5 space-y-3">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <span class="text-[11px] font-mono font-bold tracking-widest text-emerald-text uppercase block">
          WEEKLY VOLUME LANDMARKS · MEV / MAV / MRV
        </span>
        <h3 class="text-sm font-bold font-heading text-ink">โควต้าเซ็ตกล้ามเนื้อรายสัปดาห์</h3>
      </div>
      <button
        type="button"
        @click="load"
        :disabled="loading"
        class="min-h-[44px] min-w-[44px] px-3 rounded-xl border-2 border-plate bg-paper-subtle text-ink font-mono font-bold text-[11px] shadow-[1px_1px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none touch-manipulation disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-plate"
      >
        {{ loading ? 'โหลด...' : 'รีเฟรช' }}
      </button>
    </div>

    <div v-if="error" class="text-xs font-body text-red-700 bg-red-50 border-2 border-red-600 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
      <span>{{ error }}</span>
      <button type="button" @click="load" class="min-h-[44px] px-3 rounded-xl border-2 border-plate bg-white text-ink font-bold text-[11px] touch-manipulation focus-visible:ring-2 focus-visible:ring-plate">ลองใหม่</button>
    </div>

    <p v-else-if="loading && landmarks.length === 0" class="text-[11px] font-body text-ink-muted" role="status">กำลังโหลดข้อมูล...</p>

    <template v-else>
      <div
        v-if="summary"
        class="rounded-xl border-2 border-plate bg-paper-subtle p-3 text-[11px] font-mono font-bold text-ink flex flex-wrap gap-x-4 gap-y-1"
      >
        <span>สัปดาห์เริ่ม {{ weekStart || '—' }}</span>
        <span>เซ็ตทำงานรวม {{ summary.totalWorkingSets }}</span>
        <span class="text-emerald-text">✓ เหมาะสม {{ summary.optimalCount }}</span>
        <span class="text-amber-700">⚠️ ต่ำกว่า {{ summary.underCount }}</span>
        <span class="text-red-700">🚨 เกิน {{ summary.overreachedCount }}</span>
      </div>

      <div class="inline-flex rounded-xl p-0.5 bg-surface border-2 border-plate flex-wrap gap-0.5" role="group" aria-label="กรองกลุ่มกล้ามเนื้อ">
        <button
          v-for="filter in CATEGORY_FILTERS"
          :key="filter.id"
          type="button"
          class="min-h-[44px] min-w-[44px] px-3 rounded-lg text-[11px] font-heading font-bold transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
          :class="activeCategory === filter.id ? 'bg-emerald text-white' : 'text-ink-muted hover:text-ink'"
          :aria-pressed="activeCategory === filter.id"
          @click="activeCategory = filter.id"
        >{{ filter.label }}</button>
      </div>

      <div class="space-y-3" role="region" aria-label="การประเมินปริมาณการฝึกกล้ามเนื้อรายสัปดาห์">
        <div
          v-for="item in filtered"
          :key="item.muscleKey"
          class="rounded-xl border-2 border-plate bg-white p-3 space-y-2"
        >
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <span class="text-[11px] sm:text-sm font-heading font-bold text-ink truncate">{{ item.displayNameTh }}</span>
            <span
              class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border-2 whitespace-nowrap"
              :class="statusMeta(item.status).badge"
            >
              {{ statusMeta(item.status).icon }} {{ item.statusLabelTh }} · {{ item.setsDone }}/{{ item.mav }} เซ็ต
            </span>
          </div>
          <div
            class="relative h-3 w-full rounded-full bg-paper-dim border-2 border-plate overflow-hidden"
            role="progressbar"
            :aria-valuenow="item.setsDone"
            aria-valuemin="0"
            :aria-valuemax="item.mrv"
            :aria-valuetext="`${item.setsDone} เซ็ต ในช่วง ${item.statusLabelTh}`"
          >
            <div
              class="h-full transition-all"
              :style="{ width: Math.min(100, item.progressPct) + '%', backgroundColor: statusMeta(item.status).color }"
            ></div>
            <span
              class="absolute top-0 bottom-0 w-0.5 bg-plate/60"
              :style="{ left: Math.min(100, Math.round((item.mev / item.mav) * 100)) + '%' }"
              :title="`MEV ${item.mev}`"
            ></span>
            <span
              class="absolute top-0 bottom-0 w-0.5 bg-plate"
              :style="{ left: Math.min(100, Math.round((item.mrv / item.mav) * 100)) + '%' }"
              :title="`MRV ${item.mrv}`"
            ></span>
          </div>
          <p class="text-[11px] font-mono text-ink-muted">
            MEV {{ item.mev }} · MAV {{ item.mav }} · MRV {{ item.mrv }} — {{ item.recommendationTh }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import {
  useVolumeLandmarks,
  CATEGORY_FILTERS,
  STATUS_META,
  filterLandmarks
} from '../composables/useVolumeLandmarks.js';

const { weekStart, summary, landmarks, loading, error, load } = useVolumeLandmarks();
const activeCategory = ref('all');

const filtered = computed(() => filterLandmarks(landmarks.value, activeCategory.value));
const statusMeta = (status) => STATUS_META[status] || STATUS_META.under;

onMounted(load);
</script>
