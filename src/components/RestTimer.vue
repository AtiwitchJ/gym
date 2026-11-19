<template>
  <div
    v-if="isWorkoutDay || isRunning"
    class="w-full bg-paper/95 backdrop-blur-md border-t-2 border-plate px-2.5 sm:px-4 py-1.5 sm:py-2 shadow-[0_-4px_16px_rgba(30,34,32,0.08)] select-none"
  >
    <div class="max-w-3xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3">
      <!-- Digital Stopwatch Readout -->
      <div class="flex items-center gap-2 sm:gap-3 min-w-0">
        <div class="flex flex-col flex-shrink-0">
          <span class="text-[8px] sm:text-[9px] font-mono font-bold tracking-widest text-ink-muted uppercase leading-none">
            REST INTERVAL
          </span>
          <span
            class="font-mono tabular-nums text-2xl sm:text-3xl font-extrabold tracking-wider leading-tight"
            :class="isRunning ? 'text-flame animate-pulse' : 'text-ink'"
          >
            {{ formatTime(timerRemaining) }}
          </span>
          <!-- Next set (or "all done") -->
          <span class="text-[10px] sm:text-[11px] font-mono text-ink-muted truncate max-w-[12rem] leading-tight">
            {{ nextHint }}
          </span>
        </div>

        <!-- Presets -->
        <div class="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none">
          <button
            v-for="preset in [60, 90, 120, 180]"
            :key="preset"
            @click="setTimerDuration(preset)"
            class="min-h-[44px] min-w-[44px] text-[10px] sm:text-[11px] font-mono font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full border-2 border-plate transition-all select-none touch-manipulation whitespace-nowrap"
            :class="timerDuration === preset
              ? 'bg-flame text-white shadow-[1.5px_1.5px_0px_#1e2220] translate-x-[-1px] translate-y-[-1px]'
              : 'bg-surface hover:bg-paper-dim text-ink shadow-[1px_1px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
          >
            {{ preset }}s
          </button>
        </div>

        <!-- Dynamic Steppers (+30s / -15s) -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <button
            @click="adjustRemaining(30)"
            class="min-h-[44px] px-2.5 sm:px-3 text-xs sm:text-sm font-mono font-bold rounded-xl border-2 border-plate bg-paper-subtle hover:bg-paper-dim text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all whitespace-nowrap touch-manipulation"
            title="เพิ่มเวลาพักอีก 30 วินาที"
          >
            +30s
          </button>
          <button
            @click="adjustRemaining(-15)"
            class="min-h-[44px] px-2.5 sm:px-3 text-xs sm:text-sm font-mono font-bold rounded-xl border-2 border-plate bg-paper-subtle hover:bg-paper-dim text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all whitespace-nowrap touch-manipulation"
            title="ลดเวลาพัก 15 วินาที"
          >
            -15s
          </button>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <!-- Skip rest; after the last set it is the main action -->
        <button
          type="button"
          @click="skipTimer"
          class="min-h-[44px] px-3 text-xs sm:text-sm font-heading font-bold rounded-xl border-2 border-plate transition-all touch-manipulation whitespace-nowrap"
          :class="allDone
            ? 'bg-emerald text-white shadow-[2px_2px_0px_#1e2220]'
            : 'bg-surface text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
          :title="allDone ? 'จบทุกท่าแล้ว ข้ามพัก' : 'ข้ามพักเดี๋ยวนี้'"
        >ข้ามพัก</button>
        <!-- Play / Pause Button -->
        <button
          @click="toggleTimer"
          class="min-h-[44px] min-w-[44px] w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-white transition-all select-none border-2 border-plate touch-manipulation"
          :class="isRunning
            ? 'bg-gold hover:bg-gold-glow text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
            : 'bg-flame hover:bg-flame-glow shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
          :title="isRunning ? 'พักเวลา' : 'เริ่มจับเวลา'"
        >
          <svg v-if="isRunning" class="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
          <svg v-else class="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        <!-- Reset Button -->
        <button
          @click="resetTimer"
          class="min-h-[44px] min-w-[44px] w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-surface hover:bg-paper-subtle border-2 border-plate flex items-center justify-center text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
          title="รีเซ็ตเวลา"
        >
          <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useTimer } from '../composables/useTimer';
import { useWorkoutStore } from '../composables/useWorkoutStore';
import { nextUndoneSet, restHint } from '../composables/useRestPanel.js';

const { currentDay, workoutData, userState } = useWorkoutStore();
const isWorkoutDay = computed(() => ['prog_a', 'prog_b'].includes(currentDay.value));

// Next undone set in the current day (null when every set is done).
const next = computed(() => nextUndoneSet(workoutData[currentDay.value], userState[currentDay.value]));
const nextHint = computed(() => restHint(next.value));
const allDone = computed(() => next.value === null);

const {
  timerDuration,
  timerRemaining,
  isRunning,
  formatTime,
  toggleTimer,
  resetTimer,
  setTimerDuration,
  adjustRemaining,
  skipTimer
} = useTimer();
</script>
