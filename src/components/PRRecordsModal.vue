<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-plate/60 backdrop-blur-sm select-none"
    @click.self="$emit('close')"
  >
    <div
      class="w-full max-w-lg bg-paper border-4 border-plate rounded-t-3xl sm:rounded-3xl shadow-[0_12px_40px_rgba(30,34,32,0.35)] p-4 sm:p-6 max-h-[90vh] overflow-y-auto flex flex-col gap-4 font-body text-ink"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pr-records-modal-title"
    >
      <!-- Header -->
      <div class="flex items-start justify-between gap-3 border-b-2 border-plate/20 pb-3">
        <div class="min-w-0 flex-1">
          <span class="text-[11px] font-mono font-bold tracking-widest text-emerald-text uppercase block">
            PR &amp; SET RECORDS · สถิติสูงสุดและประวัติ PR
          </span>
          <h3 id="pr-records-modal-title" class="text-base sm:text-lg font-extrabold font-heading text-ink leading-tight truncate mt-0.5">
            🏆 {{ exerciseName || 'ท่าฝึก' }}
          </h3>
        </div>
        <button
          type="button"
          class="min-h-[44px] min-w-[44px] w-11 h-11 rounded-full border-2 border-plate bg-white flex items-center justify-center text-ink font-bold shadow-[2px_2px_0px_#1e2220] hover:bg-paper-subtle active:translate-x-[0.5px] active:translate-y-[0.5px] touch-manipulation flex-shrink-0"
          title="ปิด"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Loading / Error States -->
      <div v-if="error" class="text-xs font-body text-red-700 bg-red-50 border-2 border-red-600 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
        <span>{{ error }}</span>
        <button
          type="button"
          class="min-h-[44px] min-w-[44px] px-3 rounded-xl border-2 border-plate bg-white text-ink font-heading font-bold text-xs touch-manipulation"
          @click="retry"
        >
          ลองอีกครั้ง
        </button>
      </div>
      <p v-else-if="loading" class="text-xs text-ink-muted font-mono py-6 text-center">
        กำลังโหลดสถิติ PR...
      </p>

      <template v-else>
        <!-- 1. The 4 Key All-Time PR Records Cards -->
        <div class="space-y-2">
          <div class="text-xs font-heading font-bold text-ink flex items-center gap-1.5">
            <span>🏆</span>
            <span>สถิติสูงสุดตลอดกาล (All-Time Personal Records)</span>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <!-- Heaviest Weight -->
            <div class="bg-white border-2 border-plate rounded-2xl p-3 shadow-[2px_2px_0px_#1e2220]">
              <div class="text-[11px] font-mono font-bold text-ink-muted leading-tight">🏋️ น้ำหนักสูงสุด</div>
              <div class="text-lg sm:text-xl font-mono font-extrabold text-ink tabular-nums mt-1">
                {{ formatRecordValue('heaviestWeight', data.records?.heaviestWeight?.value) }}
              </div>
              <div class="text-[11px] font-mono text-ink-muted mt-1 truncate">
                {{ data.records?.heaviestWeight ? formatThaiDate(data.records.heaviestWeight.date) : 'ยังไม่มีสถิติ' }}
              </div>
            </div>

            <!-- Best e1RM -->
            <div class="bg-white border-2 border-plate rounded-2xl p-3 shadow-[2px_2px_0px_#1e2220]">
              <div class="text-[11px] font-mono font-bold text-ink-muted leading-tight">⚡ 1RM สูงสุด (e1RM)</div>
              <div class="text-lg sm:text-xl font-mono font-extrabold text-emerald-text tabular-nums mt-1">
                {{ formatRecordValue('bestE1rm', data.records?.bestE1rm?.value) }}
              </div>
              <div class="text-[11px] font-mono text-ink-muted mt-1 truncate">
                {{ data.records?.bestE1rm ? formatThaiDate(data.records.bestE1rm.date) : 'ยังไม่มีสถิติ' }}
              </div>
            </div>

            <!-- Best Set Volume -->
            <div class="bg-white border-2 border-plate rounded-2xl p-3 shadow-[2px_2px_0px_#1e2220]">
              <div class="text-[11px] font-mono font-bold text-ink-muted leading-tight">📦 โวลุ่มเซ็ตสูงสุด</div>
              <div class="text-lg sm:text-xl font-mono font-extrabold text-ink tabular-nums mt-1">
                {{ formatRecordValue('bestSetVolume', data.records?.bestSetVolume?.value) }}
              </div>
              <div class="text-[11px] font-mono text-ink-muted mt-1 truncate">
                {{ data.records?.bestSetVolume ? formatThaiDate(data.records.bestSetVolume.date) : 'ยังไม่มีสถิติ' }}
              </div>
            </div>

            <!-- Most Reps -->
            <div class="bg-white border-2 border-plate rounded-2xl p-3 shadow-[2px_2px_0px_#1e2220]">
              <div class="text-[11px] font-mono font-bold text-ink-muted leading-tight">🔥 จำนวนครั้งสูงสุด</div>
              <div class="text-lg sm:text-xl font-mono font-extrabold text-flame-text tabular-nums mt-1">
                {{ formatRecordValue('mostReps', data.records?.mostReps?.value) }}
              </div>
              <div class="text-[11px] font-mono text-ink-muted mt-1 truncate">
                {{ data.records?.mostReps ? formatThaiDate(data.records.mostReps.date) : 'ยังไม่มีสถิติ' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Set Records Table (น้ำหนักสูงสุดต่อจำนวนครั้ง Reps) -->
        <div class="space-y-2 mt-1">
          <div class="text-xs font-heading font-bold text-ink flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <span>📊</span>
              <span>สถิติต่อจำนวนครั้ง (Set Records)</span>
            </span>
            <span class="text-[11px] font-mono text-ink-muted">
              {{ data.setRecords.length }} รายการ
            </span>
          </div>

          <div v-if="data.setRecords.length === 0" class="text-xs font-mono text-ink-muted text-center py-4 bg-surface rounded-xl border border-plate/20">
            ยังไม่มีข้อมูล Set Records (คำนวณจาก Working Sets ที่บันทึก)
          </div>
          <div v-else class="bg-white border-2 border-plate rounded-2xl overflow-hidden shadow-[2px_2px_0px_#1e2220]">
            <table class="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr class="bg-paper-subtle border-b-2 border-plate text-[11px] font-bold text-ink uppercase">
                  <th class="py-2 px-3">จำนวนครั้ง (Reps)</th>
                  <th class="py-2 px-3 text-center">น้ำหนักสูงสุด</th>
                  <th class="py-2 px-3 text-right">วันที่ทำได้</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-plate/15">
                <tr
                  v-for="record in data.setRecords"
                  :key="record.reps"
                  class="hover:bg-paper-subtle/40 transition-colors"
                >
                  <td class="py-2 px-3 font-bold text-ink">
                    {{ record.reps }} ครั้ง ({{ record.reps }}RM)
                  </td>
                  <td class="py-2 px-3 text-center font-extrabold text-emerald-text">
                    {{ record.weight }} kg
                  </td>
                  <td class="py-2 px-3 text-right text-ink-muted text-[11px]">
                    {{ formatThaiDate(record.date) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 3. PR Timeline (ประวัติเหตุการณ์ทำลายสถิติ PR) -->
        <div class="space-y-2 mt-1">
          <div class="text-xs font-heading font-bold text-ink flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <span>📅</span>
              <span>ไทม์ไลน์การทำลายสถิติ (PR Timeline)</span>
            </span>
            <span class="text-[11px] font-mono text-ink-muted">
              {{ data.timeline.length }} เหตุการณ์
            </span>
          </div>

          <div v-if="data.timeline.length === 0" class="text-xs font-mono text-ink-muted text-center py-4 bg-surface rounded-xl border border-plate/20">
            ยังไม่มีเหตุการณ์ทำ PR ใหม่
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(item, idx) in data.timeline"
              :key="idx"
              class="border-2 border-plate rounded-2xl p-3 bg-surface shadow-[1.5px_1.5px_0px_#1e2220]"
            >
              <div class="flex items-center justify-between gap-2 mb-1">
                <span class="text-[11px] font-mono font-bold text-ink">
                  {{ formatThaiDate(item.date) }}
                </span>
                <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border" :class="getTypeBadgeClass(item.type)">
                  {{ formatShortType(item.type) }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-2 text-xs">
                <div class="font-extrabold font-heading text-ink">
                  {{ formatRecordValue(item.type, item.value) }}
                </div>
                <div class="text-[11px] font-mono text-ink-muted">
                  <span v-if="item.previousValue !== null && item.previousValue !== undefined">
                    สถิติเดิม: {{ formatRecordValue(item.type, item.previousValue) }}
                  </span>
                  <span v-else>
                    สถิติแรกเริ่ม
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Bottom Close Button -->
      <div class="pt-2 border-t-2 border-plate/20">
        <button
          type="button"
          class="min-h-[44px] w-full px-4 py-2 rounded-xl border-2 border-plate bg-white hover:bg-paper-subtle text-ink font-heading font-bold text-sm shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] touch-manipulation"
          @click="$emit('close')"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch, onUnmounted } from 'vue';
import { usePrRecords, RECORD_TYPE_CONFIG } from '../composables/usePrRecords.js';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  exerciseId: { type: String, default: '' },
  exerciseName: { type: String, default: '' }
});

const emit = defineEmits(['close']);

const {
  data,
  loading,
  error,
  load,
  retry,
  formatRecordValue,
  formatThaiDate
} = usePrRecords();

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    emit('close');
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      window.addEventListener('keydown', onKeydown);
    } else {
      window.removeEventListener('keydown', onKeydown);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});

watch(
  () => [props.isOpen, props.exerciseId],
  ([open, id]) => {
    if (open && id) {
      load(id);
    }
  },
  { immediate: true }
);

function formatShortType(type) {
  return RECORD_TYPE_CONFIG[type]?.shortLabel || type;
}

function getTypeBadgeClass(type) {
  return RECORD_TYPE_CONFIG[type]?.badgeColor || 'bg-paper-subtle text-ink border-plate/30';
}
</script>
