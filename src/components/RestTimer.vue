<template>
  <div class="fixed bottom-0 left-0 right-0 z-50 bg-titanium-950/95 backdrop-blur-lg border-t border-surface-border px-4 py-2.5 pb-[max(12px,env(safe-area-inset-bottom))] shadow-2xl">
    <div class="max-w-3xl mx-auto flex items-center justify-between gap-3">
      <!-- Digital Stopwatch Readout -->
      <div class="flex items-center gap-3">
        <div class="flex flex-col">
          <span class="text-[9px] font-mono tracking-widest text-titanium-400 uppercase leading-none">
            REST INTERVAL
          </span>
          <span
            class="font-mono tabular-nums text-2xl font-extrabold tracking-wider leading-tight"
            :class="isRunning ? 'text-crimson animate-pulse' : 'text-white'"
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
            class="text-[11px] font-mono px-2 py-1 rounded border transition-colors select-none"
            :class="timerDuration === preset
              ? 'bg-crimson text-white border-crimson font-bold'
              : 'bg-surface hover:bg-surface-muted text-titanium-400 border-surface-border'"
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
          class="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-white transition-all shadow-md select-none"
          :class="isRunning
            ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950'
            : 'bg-crimson hover:bg-crimson-hover shadow-crimson-dark'"
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
          class="w-11 h-11 rounded-lg bg-surface hover:bg-surface-muted border border-surface-border flex items-center justify-center text-titanium-300 hover:text-white transition-colors"
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
