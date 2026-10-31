<template>
  <header class="sticky top-0 z-40 bg-paper/95 backdrop-blur-md border-b-2 border-plate px-4 py-3">
    <div class="max-w-3xl mx-auto flex items-center justify-between">
      <!-- Brand Seal Chop -->
      <div class="flex items-center gap-2.5">
        <span class="seal-chop">
          ATIWITCH
        </span>
        <div class="flex flex-col">
          <span class="text-sm font-bold font-heading tracking-tight text-ink leading-none">
            WORKOUT LOG
          </span>
          <span class="text-[10px] font-mono tracking-wider text-ink-muted uppercase mt-0.5">
            Personal Strength Protocol
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <!-- Auto-save Pill -->
        <span
          class="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border-2 transition-all flex items-center gap-1.5 select-none"
          :class="saveStatus === 'saving'
            ? 'bg-flame-bg border-flame text-flame shadow-[2px_2px_0px_#ea580c] animate-pulse'
            : 'bg-emerald-bg border-emerald text-emerald shadow-[2px_2px_0px_#059669]'"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="saveStatus === 'saving' ? 'bg-flame' : 'bg-emerald'"></span>
          {{ saveStatus === 'saving' ? 'SYNCING...' : 'SAVED' }}
        </span>

        <!-- Reset Button -->
        <button
          v-if="isWorkoutDay"
          @click="confirmReset"
          class="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border-2 border-plate bg-surface hover:bg-paper-subtle text-ink shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          title="ล้างข้อมูลติ๊กของวันนี้"
        >
          RESET
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useWorkoutStore } from '../composables/useWorkoutStore';

const { currentDay, saveStatus, resetDayData } = useWorkoutStore();

const isWorkoutDay = computed(() => ['mon', 'tue', 'wed', 'thu'].includes(currentDay.value));

function confirmReset() {
  if (confirm('คุณต้องการรีเซ็ตการติ๊กของวันนี้ใช่หรือไม่? (น้ำหนักสถิติล่าสุดจะยังคงจำไว้)')) {
    resetDayData(currentDay.value);
  }
}
</script>
