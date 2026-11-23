<template>
  <div class="archive-card p-4 sm:p-5 flex flex-col gap-4 select-none">
    <!-- Header -->
    <div class="flex items-center justify-between border-b-2 border-plate/20 pb-3">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-2xl bg-sky-bg border-2 border-plate flex items-center justify-center text-sky-text text-xl shadow-[2px_2px_0px_#1e2220] flex-shrink-0">
          📏
        </div>
        <div>
          <span class="text-[11px] font-mono font-bold tracking-widest text-sky-text uppercase block">
            BODY MEASUREMENTS TRACKER
          </span>
          <h3 class="text-base sm:text-lg font-heading font-extrabold text-ink leading-tight">
            บันทึกสัดส่วนร่างกาย & แนวโน้ม
          </h3>
        </div>
      </div>

      <button
        type="button"
        @click="fetchMeasurements"
        :disabled="loading"
        class="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl border border-plate/30 hover:border-sky bg-paper-subtle hover:bg-sky-bg text-ink-muted hover:text-sky-text text-xs font-mono font-bold transition-all shadow-[1px_1px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1 touch-manipulation disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-plate"
        title="รีเฟรชข้อมูล"
      >
        <span :class="{ 'animate-spin': loading }">↺</span>
        <span class="hidden sm:inline">รีเฟรช</span>
      </button>
    </div>

    <!-- Error Alert Banner -->
    <div
      v-if="error"
      class="p-3 rounded-xl bg-red-100 border-2 border-red-500 text-red-950 text-xs font-mono font-bold flex items-center justify-between shadow-[2px_2px_0px_#1e2220]"
    >
      <div class="flex items-center gap-1.5">
        <span>⚠️</span>
        <span>{{ error }}</span>
      </div>
      <button
        type="button"
        @click="fetchMeasurements"
        class="min-h-[44px] px-2.5 py-1 rounded-lg border border-red-600 bg-white text-red-900 text-xs font-bold hover:bg-red-50 active:translate-x-[1px] active:translate-y-[1px] touch-manipulation focus-visible:ring-2 focus-visible:ring-plate"
      >
        ลองใหม่
      </button>
    </div>

    <!-- Latest measurements with trend arrows -->
    <div class="bg-white border-2 border-plate shadow-[3px_3px_0px_#1e2220] rounded-2xl p-4">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-mono font-bold text-ink-muted">
          สัดส่วนล่าสุด (Latest Measurements)
        </span>
        <span v-if="latest" class="text-[11px] font-mono text-ink-muted">
          {{ formatDateThai(latest.date) }}
        </span>
      </div>

      <div v-if="latest" class="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div
          v-for="field in MEASUREMENT_FIELDS"
          :key="field.key"
          class="rounded-xl border-2 border-plate/30 bg-paper-subtle px-2 py-2 flex flex-col items-center gap-0.5"
        >
          <span class="text-[11px] font-mono font-bold text-ink-muted">{{ field.label }}</span>
          <span class="font-mono tabular-nums text-lg font-extrabold text-ink">
            {{ latest[field.key] != null ? latest[field.key] : '—' }}
          </span>
          <span class="text-[11px] font-mono text-ink-muted">cm</span>
          <span
            v-if="trend && trend[field.key]"
            class="text-[11px] font-mono font-bold"
            :class="trendClass(trend[field.key].direction)"
          >
            {{ trendSymbol(trend[field.key].direction) }}
            {{ Math.abs(trend[field.key].delta) }} cm
          </span>
          <span v-else class="text-[11px] font-mono text-ink-muted">—</span>
        </div>
      </div>

      <div v-else class="text-[11px] font-mono text-ink-muted py-3 text-center">
        {{ MEASUREMENT_EMPTY_MESSAGE }}
      </div>
    </div>

    <!-- Input form -->
    <form class="flex flex-col gap-3" @submit.prevent="onSave">
      <div class="flex items-center gap-2 flex-wrap">
        <label for="bm-date" class="text-xs font-mono font-bold text-ink-muted">วันที่</label>
        <input
          id="bm-date"
          v-model="formDate"
          type="date"
          class="min-h-[44px] px-3 rounded-xl border-2 border-plate bg-white text-ink font-mono text-sm focus-visible:ring-2 focus-visible:ring-plate"
        />
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <label
          v-for="field in MEASUREMENT_FIELDS"
          :key="field.key"
          class="flex flex-col gap-1"
          :for="`bm-${field.key}`"
        >
          <span class="text-[11px] font-mono font-bold text-ink-muted">{{ field.label }}</span>
          <input
            :id="`bm-${field.key}`"
            v-model="form[field.key]"
            type="number"
            inputmode="decimal"
            min="20"
            max="300"
            step="0.1"
            :placeholder="field.placeholder"
            class="min-h-[44px] w-full px-2 rounded-xl border-2 border-plate bg-white text-ink font-mono text-sm focus-visible:ring-2 focus-visible:ring-plate"
          />
        </label>
      </div>

      <button
        type="submit"
        :disabled="loading || isSubmitting"
        class="min-h-[44px] w-full rounded-xl border-2 border-plate bg-flame-bg text-flame-text font-mono font-bold text-sm shadow-[2px_2px_0px_#1e2220] hover:bg-sky-bg active:translate-x-[1px] active:translate-y-[1px] active:shadow-none touch-manipulation disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-plate"
      >
        {{ isSubmitting ? 'กำลังบันทึก…' : 'บันทึกสัดส่วน' }}
      </button>
    </form>

    <!-- Recent history (5 rows) -->
    <div v-if="entries.length > 0" class="flex flex-col gap-1">
      <span class="text-xs font-mono font-bold text-ink-muted mb-1">ประวัติสัดส่วน (5 รายการล่าสุด)</span>
      <div
        v-for="entry in recentEntries"
        :key="entry.date"
        class="flex items-center justify-between gap-2 rounded-xl border-2 border-plate/30 bg-paper-subtle px-3 py-2"
      >
        <span class="text-[11px] font-mono font-bold text-ink">{{ formatDateThai(entry.date) }}</span>
        <span class="text-[11px] font-mono text-ink-muted text-right">
          <template v-for="field in MEASUREMENT_FIELDS" :key="field.key">
            <span v-if="entry[field.key] != null">{{ field.label }} {{ entry[field.key] }} </span>
          </template>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import {
  useBodyMeasurements,
  todayDateString,
  formatDateThai,
  MEASUREMENT_FIELDS
} from '../composables/useBodyMeasurements.js';

const {
  entries,
  latest,
  trend,
  loading,
  error,
  fetchMeasurements,
  saveMeasurement,
  MEASUREMENT_EMPTY_MESSAGE
} = useBodyMeasurements();

const formDate = ref(todayDateString());
const form = ref({ waist: '', chest: '', arm: '', thigh: '', hip: '' });
const isSubmitting = ref(false);

const recentEntries = computed(() => entries.value.slice(-5).reverse());

function trendClass(direction) {
  if (direction === 'up') return 'text-amber-700';
  if (direction === 'down') return 'text-emerald-700';
  return 'text-ink-muted';
}

function trendSymbol(direction) {
  if (direction === 'up') return '↑';
  if (direction === 'down') return '↓';
  return '→';
}

async function onSave() {
  isSubmitting.value = true;
  try {
    await saveMeasurement({ date: formDate.value, ...form.value });
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(fetchMeasurements);
</script>
