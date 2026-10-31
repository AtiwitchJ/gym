<template>
  <header class="sticky top-0 z-40 bg-titanium-950/90 backdrop-blur-md border-b border-surface-border px-4 py-3">
    <div class="max-w-3xl mx-auto flex items-center justify-between">
      <!-- Brand Logo -->
      <div class="flex items-center gap-2.5">
        <span class="bg-crimson text-white font-display font-extrabold text-sm px-2.5 py-1 rounded tracking-wider shadow-sm">
          JETTS
        </span>
        <div class="flex flex-col">
          <span class="text-sm font-bold font-display tracking-tight text-white leading-none">
            WORKOUT TRACKER
          </span>
          <span class="text-[10px] font-mono tracking-widest text-titanium-400 uppercase mt-0.5">
            4-Day Hypertrophy
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <!-- Auto-save Pill -->
        <span
          class="text-[11px] font-mono px-2.5 py-1 rounded-full border transition-all duration-200 flex items-center gap-1.5"
          :class="saveStatus === 'saving'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'"
        >
          <span class="w-1.5 h-1.5 rounded-full" :class="saveStatus === 'saving' ? 'bg-amber-400' : 'bg-emerald-400'"></span>
          {{ saveStatus === 'saving' ? 'SYNCING...' : 'SAVED' }}
        </span>

        <!-- Reset Button (visible only in workout day tabs) -->
        <button
          v-if="isWorkoutDay"
          @click="confirmReset"
          class="text-[11px] font-mono font-medium px-2.5 py-1 rounded border border-surface-border bg-surface hover:bg-surface-muted text-titanium-400 hover:text-white transition-colors"
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
