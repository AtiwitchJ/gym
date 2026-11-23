<template>
  <div id="body-weight" class="archive-card p-4 sm:p-5 flex flex-col gap-4 select-none">
    <!-- Header -->
    <div class="flex items-center justify-between border-b-2 border-plate/20 pb-3">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-2xl bg-flame-bg border-2 border-plate flex items-center justify-center text-flame-text text-xl shadow-[2px_2px_0px_#1e2220] flex-shrink-0">
          ⚖️
        </div>
        <div>
          <span class="text-[11px] font-mono font-bold tracking-widest text-flame-text uppercase block">
            BODY WEIGHT TRACKER
          </span>
          <h3 class="text-base sm:text-lg font-heading font-extrabold text-ink leading-tight">
            บันทึกน้ำหนักตัว & แนวโน้ม
          </h3>
        </div>
      </div>

      <button
        type="button"
        @click="fetchBodyWeights"
        :disabled="loading"
        class="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl border border-plate/30 hover:border-flame bg-paper-subtle hover:bg-flame-bg text-ink-muted hover:text-flame-text text-xs font-mono font-bold transition-all shadow-[1px_1px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1 touch-manipulation disabled:opacity-50"
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
        @click="fetchBodyWeights"
        class="min-h-[44px] px-2.5 py-1 rounded-lg border border-red-600 bg-white text-red-900 text-xs font-bold hover:bg-red-50 active:translate-x-[1px] active:translate-y-[1px] touch-manipulation"
      >
        ลองใหม่
      </button>
    </div>

    <!-- Latest Stat & Sparkline Overview -->
    <div class="bg-white border-2 border-plate shadow-[3px_3px_0px_#1e2220] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <!-- Weight & Delta -->
      <div class="flex flex-col gap-1">
        <span class="text-xs font-mono font-bold text-ink-muted">
          น้ำหนักตัวล่าสุด (Latest Weight)
        </span>
        <div class="flex items-baseline gap-2">
          <span class="font-mono tabular-nums text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            {{ latestWeight !== null ? latestWeight : '—' }}
          </span>
          <span class="font-mono text-base font-bold text-flame-text">กก.</span>

          <!-- Delta Badge -->
          <div
            v-if="deltaWeight !== null"
            class="ml-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border"
            :class="deltaClass"
          >
            <span>{{ deltaSymbol }}</span>
            <span>{{ Math.abs(deltaWeight) }} กก.</span>
          </div>
          <span
            v-else-if="latestWeight !== null"
            class="text-[11px] font-mono text-ink-muted ml-1"
          >
            (บันทึกแรก)
          </span>
        </div>

        <span v-if="latestEntry" class="text-[11px] font-mono text-ink-muted">
          บันทึกเมื่อ: {{ formatDateThai(latestEntry.date) }}
        </span>
      </div>

      <!-- Trend Sparkline Graphic -->
      <div class="flex flex-col items-end gap-1 w-full sm:w-auto">
        <span class="text-[11px] font-mono font-bold text-ink-muted uppercase">
          แนวโน้มล่าสุด (Daily Trend)
        </span>
        <div class="h-12 w-40 bg-paper-subtle border border-plate/30 rounded-xl p-1 flex items-center justify-center relative shadow-inner">
          <svg
            v-if="sparkline.path"
            viewBox="0 0 160 44"
            class="w-full h-full overflow-visible"
          >
            <!-- Trend Line -->
            <path
              :d="sparkline.path"
              fill="none"
              stroke="#e11d48"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <!-- Data Points -->
            <circle
              v-for="(pt, idx) in sparkline.points"
              :key="idx"
              :cx="pt.x"
              :cy="pt.y"
              r="3"
              class="fill-white stroke-flame stroke-2"
            />
          </svg>
          <span v-else class="text-[11px] font-mono text-ink-muted italic">
            {{ entries.length === 1 ? 'ต้องการข้อมูล ≥ 2 วัน' : 'ยังไม่มีข้อมูล' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Log Weight Form -->
    <form
      @submit.prevent="handleSubmit"
      class="bg-paper-subtle border-2 border-plate shadow-[3px_3px_0px_#1e2220] rounded-2xl p-4 flex flex-col gap-3"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-mono font-bold text-ink uppercase tracking-wider">
          บันทึกน้ำหนักวันนี้ (Log Weight)
        </span>
        <span class="text-[11px] font-mono text-ink-muted">
          หน่วย: กิโลกรัม (กก.)
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <!-- Date Input -->
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-mono font-bold text-ink-muted">วันที่</label>
          <input
            type="date"
            v-model="formDate"
            required
            class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border-2 border-plate bg-white text-xs sm:text-sm font-mono font-bold text-ink shadow-[1.5px_1.5px_0px_#1e2220] focus:border-flame touch-manipulation"
          />
        </div>

        <!-- Weight Input -->
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-mono font-bold text-ink-muted">น้ำหนัก (กก.)</label>
          <input
            type="number"
            step="0.1"
            min="20"
            max="300"
            v-model="formWeight"
            required
            placeholder="เช่น 72.5"
            class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border-2 border-plate bg-white text-xs sm:text-sm font-mono font-bold text-ink shadow-[1.5px_1.5px_0px_#1e2220] focus:border-flame touch-manipulation"
          />
        </div>

        <!-- Note Input -->
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-mono font-bold text-ink-muted">บันทึกเพิ่มเติม (ไม่บังคับ)</label>
          <input
            type="text"
            maxlength="500"
            v-model="formNote"
            placeholder="เช่น ชั่งตอนเช้าหลังตื่นนอน"
            class="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border-2 border-plate bg-white text-xs sm:text-sm font-body text-ink shadow-[1.5px_1.5px_0px_#1e2220] focus:border-flame touch-manipulation"
          />
        </div>
      </div>

      <div class="flex justify-end pt-1">
        <button
          type="submit"
          :disabled="isSubmitting"
          class="min-h-[44px] min-w-[44px] px-5 py-2.5 rounded-xl border-2 border-plate bg-flame hover:bg-flame-glow text-white font-heading font-extrabold text-sm shadow-[2.5px_2.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-2 touch-manipulation disabled:opacity-50"
        >
          <span>💾 บันทึกค่าน้ำหนัก</span>
        </button>
      </div>
    </form>

    <!-- Recent History (5-7 Records) -->
    <div class="bg-white border-2 border-plate shadow-[3px_3px_0px_#1e2220] rounded-2xl p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-mono font-bold text-ink uppercase tracking-wider">
          ประวัติย้อนหลัง (Recent History)
        </span>
        <span class="text-[11px] font-mono text-ink-muted">
          {{ entries.length }} รายการทั้งหมด
        </span>
      </div>

      <div v-if="recentEntries.length > 0" class="space-y-2">
        <div
          v-for="item in recentEntries"
          :key="item.date"
          class="flex items-center justify-between p-2.5 rounded-xl border border-plate/20 bg-paper-subtle hover:bg-paper-dim transition-colors"
        >
          <div class="flex items-center gap-3">
            <span class="text-xs font-mono font-bold text-ink-muted w-24">
              {{ formatDateThai(item.date) }}
            </span>
            <span class="text-sm font-mono font-extrabold text-ink tabular-nums">
              {{ item.weight }} กก.
            </span>
            <span v-if="item.note" class="text-xs text-ink-muted truncate max-w-[120px] sm:max-w-xs" :title="item.note">
              • {{ item.note }}
            </span>
          </div>

          <button
            type="button"
            @click="handleDelete(item.date)"
            class="min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-mono font-bold text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-300 hover:border-red-600 transition-all flex items-center justify-center touch-manipulation"
            :title="`ลบข้อมูลวันที่ ${item.date}`"
          >
            ลบ
          </button>
        </div>
      </div>

      <div
        v-else
        class="text-center py-4 text-xs font-mono text-ink-muted italic"
      >
        ยังไม่มีประวัติการบันทึกน้ำหนักตัว
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useBodyWeight, todayDateString, formatDateThai } from '../composables/useBodyWeight.js';

const {
  entries,
  loading,
  error,
  latestEntry,
  latestWeight,
  deltaWeight,
  trendDirection,
  sparkline,
  fetchBodyWeights,
  saveBodyWeight,
  deleteBodyWeight
} = useBodyWeight();

const formDate = ref(todayDateString());
const formWeight = ref('');
const formNote = ref('');
const isSubmitting = ref(false);

const recentEntries = computed(() => {
  return entries.value.slice(0, 7);
});

const deltaClass = computed(() => {
  if (trendDirection.value === 'up') {
    return 'bg-amber-100 text-amber-900 border-amber-400';
  } else if (trendDirection.value === 'down') {
    return 'bg-emerald-bg text-emerald-text border-emerald/40';
  }
  return 'bg-paper-subtle text-ink border-plate/30';
});

const deltaSymbol = computed(() => {
  if (trendDirection.value === 'up') return '+';
  if (trendDirection.value === 'down') return '-';
  return '→';
});

async function handleSubmit() {
  if (!formWeight.value) return;
  isSubmitting.value = true;
  const success = await saveBodyWeight({
    date: formDate.value,
    weight: formWeight.value,
    note: formNote.value
  });
  if (success) {
    formWeight.value = '';
    formNote.value = '';
  }
  isSubmitting.value = false;
}

async function handleDelete(date) {
  if (confirm(`คุณต้องการลบข้อมูลน้ำหนักวันที่ ${date} หรือไม่?`)) {
    await deleteBodyWeight(date);
  }
}

onMounted(() => {
  fetchBodyWeights();
});
</script>
