<template>
  <div class="fixed bottom-0 left-0 right-0 z-50 bg-paper/95 backdrop-blur-lg border-t-2 border-plate px-4 py-2.5 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(30,34,32,0.08)]">
    <div class="max-w-3xl mx-auto flex items-center justify-between gap-3">
      <!-- Digital Stopwatch Readout -->
      <div class="flex items-center gap-3">
        <div class="flex flex-col">
          <span class="text-[9px] font-mono font-bold tracking-widest text-ink-muted uppercase leading-none">
            REST INTERVAL
          </span>
          <span
            class="font-mono tabular-nums text-2xl font-bold tracking-wider leading-tight"
            :class="isRunning ? 'text-flame animate-pulse' : 'text-ink'"
          >
            {{ formatTime(timerRemaining) }}
          </span>
        </div>

        <!-- Presets -->
        <div class="flex items-center gap-1.5 ml-1">
          <button
            v-for="preset in [60, 90, 120, 180]"
            :key="preset"
            @click="setTimerDuration(preset)"
            class="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border-2 border-plate transition-all select-none"
            :class="timerDuration === preset
              ? 'bg-flame text-white shadow-[2px_2px_0px_#1e2220] translate-x-[-1px] translate-y-[-1px]'
              : 'bg-surface hover:bg-paper-dim text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
          >
            {{ preset }}s
          </button>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-2">
        <!-- Play / Pause Button -->
        <button
          @click="toggleTimer"
          class="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white transition-all select-none border-2 border-plate"
          :class="isRunning
            ? 'bg-gold hover:bg-gold-glow text-ink shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
            : 'bg-flame hover:bg-flame-glow shadow-[3px_3px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
          :title="isRunning ? 'พักเวลา' : 'เริ่มจับเวลา'"
        >
          <svg v-if="isRunning" class="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
          <svg v-else class="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        <!-- Reset Button -->
        <button
          @click="resetTimer"
          class="w-11 h-11 rounded-xl bg-surface hover:bg-paper-subtle border-2 border-plate flex items-center justify-center text-ink shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          title="รีเซ็ตเวลา"
        >
          <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useTimer } from '../composables/useTimer';

const {
  timerDuration,
  timerRemaining,
  isRunning,
  formatTime,
  toggleTimer,
  resetTimer,
  setTimerDuration
} = useTimer();
</script>
