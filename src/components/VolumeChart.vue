<template>
  <div class="archive-card p-4 sm:p-5 space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <span class="text-[11px] font-mono font-bold tracking-widest text-emerald-text uppercase block">
          WEEKLY VOLUME · 8 สัปดาห์
        </span>
        <h3 class="text-sm font-bold font-heading text-ink">ปริมาณการฝึกต่อสัปดาห์ (น้ำหนัก × ครั้ง)</h3>
      </div>
      <div class="inline-flex rounded-lg p-0.5 bg-surface border-2 border-plate">
        <button
          type="button"
          class="px-2.5 py-1 rounded-md text-[11px] font-heading font-bold transition-all"
          :class="mode === 'muscles' ? 'bg-emerald text-white' : 'text-ink-muted hover:text-ink'"
          @click="setMode('muscles')"
        >กล้ามเนื้อ</button>
        <button
          type="button"
          class="px-2.5 py-1 rounded-md text-[11px] font-heading font-bold transition-all"
          :class="mode === 'exercises' ? 'bg-emerald text-white' : 'text-ink-muted hover:text-ink'"
          @click="setMode('exercises')"
        >ท่าฝึก</button>
      </div>
    </div>

    <div v-if="error" class="text-xs font-body text-red-700 bg-red-50 border-2 border-red-600 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
      <span>{{ error }}</span>
      <button
        type="button"
        class="min-h-[44px] min-w-[44px] px-3 rounded-xl border-2 border-plate bg-white text-ink font-heading font-bold text-xs touch-manipulation"
        @click="retry"
      >ลองอีกครั้ง</button>
    </div>
    <p v-else-if="loading" class="text-xs text-ink-muted font-body" role="status">{{ slow ? slowMessage : 'กำลังโหลดข้อมูล...' }}</p>
    <p v-else-if="!hasData" class="text-xs text-ink-muted font-body">
      {{ emptyMessage }}
    </p>

    <template v-else>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="item in ranked"
          :key="item.key"
          type="button"
          class="px-2 py-1 rounded-lg border-2 border-plate text-[11px] font-body transition-all"
          :class="item.key === selectedKey ? 'bg-emerald-bg font-bold text-ink shadow-[2px_2px_0px_#1e2220]' : 'bg-white text-ink-muted hover:text-ink'"
          @click="selectedKey = item.key"
        >
          {{ item.label }}
        </button>
      </div>

      <svg
        viewBox="0 0 320 190"
        class="w-full h-auto"
        role="img"
        :aria-label="`ปริมาณการฝึก 8 สัปดาห์ของ ${selectedLabel}`"
      >
        <line x1="8" y1="150" x2="312" y2="150" stroke="#1e2220" stroke-width="2" />
        <g v-for="(bar, i) in bars" :key="bar.weekStart">
          <rect
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            rx="4"
            :fill="bar.volume > 0 ? '#059669' : '#e6d6be'"
            stroke="#1e2220"
            stroke-width="1.5"
          />
          <text
            v-if="bar.volume > 0"
            :x="bar.x + bar.width / 2"
            :y="bar.y - 4"
            text-anchor="middle"
            font-size="9"
            font-family="monospace"
            fill="#1e2220"
          >{{ bar.label }}</text>
          <text
            :x="bar.x + bar.width / 2"
            y="166"
            text-anchor="middle"
            font-size="9"
            fill="#4a544f"
          >{{ bar.week }}</text>
        </g>
      </svg>

      <p class="text-[11px] text-ink-muted font-body">
        {{ selectedLabel }}: รวม {{ selectedTotal }} (ปริมาณ) ใน 8 สัปดาห์ · เฉพาะเซ็ตทำงานที่ทำเสร็จ (ไม่รวมวอร์ม)
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useWeeklyVolume, rankKeys, buildSeries, hasAnyVolume, VOLUME_EMPTY_MESSAGE, VOLUME_SLOW_MESSAGE } from '../composables/useWeeklyVolume.js';

const CHART_W = 320;
const CHART_BASE = 150;
const CHART_MAX_H = 120;
const BAR_W = 26;
const BAR_GAP = 12;

const { weeks, loading, slow, error, load, retry } = useWeeklyVolume();
const slowMessage = VOLUME_SLOW_MESSAGE;

const mode = ref('muscles');
const selectedKey = ref('');
const emptyMessage = VOLUME_EMPTY_MESSAGE;

const hasData = computed(() => hasAnyVolume(weeks.value));
const ranked = computed(() => rankKeys(weeks.value, mode.value).slice(0, 12));
const selectedItem = computed(() => ranked.value.find((r) => r.key === selectedKey.value) || ranked.value[0] || null);
const selectedLabel = computed(() => (selectedItem.value ? selectedItem.value.label : '-'));
const selectedTotal = computed(() => Math.round(bars.value.reduce((sum, b) => sum + b.volume, 0) * 10) / 10);

const bars = computed(() => {
  if (!selectedItem.value) return [];
  const series = buildSeries(weeks.value, mode.value, selectedItem.value.key);
  const max = Math.max(1, ...series.map((s) => s.volume));
  const n = series.length || 1;
  const slot = (CHART_W - 16) / n;
  return series.map((s, i) => {
    const height = s.volume > 0 ? Math.max(3, (s.volume / max) * CHART_MAX_H) : 0;
    const width = Math.min(BAR_W, slot - BAR_GAP);
    return {
      weekStart: s.weekStart,
      volume: s.volume,
      x: 8 + i * slot + (slot - width) / 2,
      y: CHART_BASE - height,
      width,
      height,
      label: formatVolume(s.volume),
      week: formatWeek(s.weekStart)
    };
  });
});

function setMode(next) {
  mode.value = next;
  selectedKey.value = '';
}

function formatVolume(v) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
}

function formatWeek(iso) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

watch(ranked, (list) => {
  if (!list.some((r) => r.key === selectedKey.value)) {
    selectedKey.value = list.length ? list[0].key : '';
  }
});

onMounted(() => {
  load();
});
</script>
