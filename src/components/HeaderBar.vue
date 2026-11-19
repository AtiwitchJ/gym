<template>
  <header class="sticky top-0 z-40 bg-paper/95 backdrop-blur-md border-b-2 border-plate px-2.5 sm:px-4 py-2 sm:py-2.5 pt-[max(8px,env(safe-area-inset-top))] select-none">
    <div class="max-w-3xl mx-auto flex items-center justify-between gap-2">
      <!-- Brand Seal Chop -->
      <div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <span class="seal-chop text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 flex-shrink-0">
          ATIWITCH
        </span>
        <div class="flex flex-col min-w-0">
          <span class="text-xs sm:text-sm font-bold font-heading tracking-tight text-ink leading-tight truncate">
            WORKOUT LOG
          </span>
          <span class="hidden sm:inline text-[9px] font-mono tracking-wider text-ink-muted uppercase truncate">
            Personal Strength Protocol
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        <!-- Auto-save Pill -->
        <span
          class="text-[10px] sm:text-[11px] font-mono font-bold px-2 sm:px-2.5 py-1 rounded-full border-2 transition-all flex items-center gap-1 select-none"
          :class="saveStatus === 'saving'
            ? 'bg-flame-bg border-flame text-flame shadow-[1.5px_1.5px_0px_#ea580c] animate-pulse'
            : 'bg-emerald-bg border-emerald text-emerald shadow-[1.5px_1.5px_0px_#059669]'"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="saveStatus === 'saving' ? 'bg-flame' : 'bg-emerald'"></span>
          <span>{{ saveStatus === 'saving' ? 'กำลังบันทึก...' : 'บันทึกในเครื่องแล้ว' }}</span>
        </span>

        <!-- Image Preview Toggle -->
        <button
          v-if="isWorkoutDay"
          @click="toggleExerciseImages"
          class="min-h-[44px] min-w-[44px] text-[10px] sm:text-[11px] font-mono font-bold px-2 py-1 rounded-full border-2 border-plate shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 select-none touch-manipulation"
          :class="showExerciseImages ? 'bg-flame-bg text-flame border-flame' : 'bg-surface text-ink-muted opacity-80'"
          :title="showExerciseImages ? 'คลิกเพื่อซ่อนรูป (โหมดกระชับ)' : 'คลิกเพื่อแสดงภาพตัวอย่าง'"
        >
          <svg class="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span class="hidden xs:inline">{{ showExerciseImages ? 'รูป' : 'ซ่อน' }}</span>
        </button>

        <!-- Reset Button -->
        <button
          v-if="isWorkoutDay"
          @click="confirmReset"
          class="min-h-[44px] min-w-[44px] text-[10px] sm:text-[11px] font-mono font-bold px-2 sm:px-2.5 py-1 rounded-full border-2 border-plate bg-surface hover:bg-paper-subtle text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
          title="ล้างการติ๊กของวันนี้ (ไม่ลบประวัติ)"
        >
          ล้างการติ๊ก
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useWorkoutStore } from '../composables/useWorkoutStore';

const {
  currentDay,
  saveStatus,
  resetDayData,
  showExerciseImages,
  toggleExerciseImages
} = useWorkoutStore();

const isWorkoutDay = computed(() => ['prog_a', 'prog_b'].includes(currentDay.value));

function confirmReset() {
  if (confirm('ล้างการติ๊กของวันนี้ใช่หรือไม่? (ประวัติและน้ำหนักล่าสุดจะยังคงอยู่)')) {
    resetDayData(currentDay.value);
  }
}
</script>
