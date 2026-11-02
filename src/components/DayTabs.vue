<template>
  <nav class="w-full px-1 sm:px-3 py-1 sm:py-1.5 pb-[max(8px,env(safe-area-inset-bottom))] select-none">
    <div class="max-w-3xl mx-auto grid grid-cols-7 gap-1 sm:gap-1.5">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="switchDay(tab.id)"
        class="flex flex-col items-center justify-center py-1 sm:py-1.5 px-0.5 rounded-xl transition-all relative font-heading border-2 touch-manipulation group"
        :class="currentDay === tab.id
          ? tab.id === 'history'
            ? 'bg-emerald text-white border-plate shadow-[2px_2px_0px_#1e2220] -translate-y-0.5 font-bold'
            : tab.id === 'todo'
              ? 'bg-gold text-ink border-plate shadow-[2px_2px_0px_#1e2220] -translate-y-0.5 font-bold'
              : 'bg-plate text-white border-plate shadow-[2px_2px_0px_#ea580c] -translate-y-0.5 font-bold'
          : 'bg-surface/90 text-ink/75 hover:text-ink border-plate/30 hover:border-plate shadow-[1px_1px_0px_#1e2220] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none'"
        :title="`${tab.fullName} (${tab.sub})`"
      >
        <!-- Today Indicator Tag / Dot -->
        <span
          v-if="todayKey === tab.id"
          class="absolute -top-1.5 right-0.5 sm:right-1 px-1 py-0.2 bg-flame text-white text-[8px] font-mono font-extrabold rounded-full border border-plate shadow-[1px_1px_0px_#1e2220] leading-tight select-none pointer-events-none"
        >
          วันนี้
        </span>

        <!-- Tab Icon -->
        <div class="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center mb-0.5 transition-transform group-active:scale-90">
          <!-- Mon: Legs / Squat -->
          <svg v-if="tab.id === 'mon'" class="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M4 6h16M4 18h16M9 6v12M15 6v12M2 9h2v6H2zM20 9h2v6h-2z" />
          </svg>

          <!-- Tue: Chest / Bench Press -->
          <svg v-else-if="tab.id === 'tue'" class="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M6 5v14M18 5v14M2 12h20M9 8h6M9 16h6" />
          </svg>

          <!-- Wed: Back / Lat Pull -->
          <svg v-else-if="tab.id === 'wed'" class="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M3 7l9-4 9 4M4 17l8 4 8-4M2 12l10 5 10-5" />
          </svg>

          <!-- Thu: Shoulders / Overhead Press -->
          <svg v-else-if="tab.id === 'thu'" class="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" />
            <path d="M12 8v8M8 12h8" />
          </svg>

          <!-- Rest: Recovery / Moon -->
          <svg v-else-if="tab.id === 'rest'" class="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>

          <!-- History: Chart / Database -->
          <svg v-else-if="tab.id === 'history'" class="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M3 3v18h18" />
            <path d="M18 9l-5 5-4-4-3 3" />
          </svg>

          <!-- Todo: Checklist -->
          <svg v-else-if="tab.id === 'todo'" class="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>

        <!-- Label -->
        <span class="font-bold text-[10px] sm:text-xs tracking-tight truncate leading-tight">
          {{ tab.shortName }}
        </span>

        <!-- Subtitle hint for tablet/desktop -->
        <span
          class="hidden sm:inline text-[9px] opacity-75 mt-0.5 tracking-normal font-body truncate leading-none"
        >
          {{ tab.sub }}
        </span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useWorkoutStore } from '../composables/useWorkoutStore';

const { currentDay, switchDay } = useWorkoutStore();

// Map current day of week to highlight "Today"
const todayDayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
const dayMap = {
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu'
};
const todayKey = dayMap[todayDayIndex] || 'rest';

const tabs = [
  { id: 'mon', shortName: 'จันทร์', fullName: 'วันจันทร์', sub: 'ขา + ก้น' },
  { id: 'tue', shortName: 'อังคาร', fullName: 'วันอังคาร', sub: 'อก + แขน' },
  { id: 'wed', shortName: 'พุธ', fullName: 'วันพุธ', sub: 'หลัง + แขน' },
  { id: 'thu', shortName: 'พฤหัส', fullName: 'วันพฤหัส', sub: 'ไหล่ + ท้อง' },
  { id: 'rest', shortName: 'พัก', fullName: 'ศุกร์-อาทิตย์', sub: 'พักฟื้น' },
  { id: 'history', shortName: 'สถิติ', fullName: 'ประวัติ', sub: 'History' },
  { id: 'todo', shortName: 'ลิสต์', fullName: 'สิ่งที่ต้องทำ', sub: 'Todo' }
];
</script>
