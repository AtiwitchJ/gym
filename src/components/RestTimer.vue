<template>
  <div
    v-if="isWorkoutDay || isRunning"
    class="w-full bg-paper/95 backdrop-blur-md border-t-2 border-plate px-2.5 sm:px-4 py-1 sm:py-2 shadow-[0_-4px_16px_rgba(30,34,32,0.08)] select-none"
  >
    <div class="max-w-3xl mx-auto">
      <!-- Collapsed line (always shown, 44 px): time, expand toggle, play/pause. Compact on phones (about 54 px with the border). -->
      <div class="flex items-center gap-2 min-h-[44px]">
        <button
          type="button"
          class="flex flex-1 min-w-0 min-h-[44px] items-center gap-2 text-left touch-manipulation sm:pointer-events-none sm:cursor-default"
          :aria-expanded="expanded ? 'true' : 'false'"
          aria-controls="rest-detail"
          title="ดูตัวเลือกเวลาพัก"
          @click="toggleExpanded"
        >
          <span class="text-[11px] font-mono font-bold tracking-widest text-ink-muted uppercase leading-none flex-shrink-0">
            REST
          </span>
          <span
            class="font-mono tabular-nums text-xl sm:text-3xl font-extrabold tracking-wider leading-none"
            :class="isRunning ? 'text-flame-text animate-pulse' : 'text-ink'"
          >
            {{ formatTime(timerRemaining) }}
          </span>
          <svg
            class="w-4 h-4 ml-auto flex-shrink-0 fill-none stroke-current stroke-[2.5] sm:hidden transition-transform"
            :class="expanded ? 'rotate-180' : ''"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <!-- Play / Pause Button -->
        <button
          type="button"
          @click="toggleTimer"
          class="min-h-[44px] min-w-[44px] w-11 h-11 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-white transition-all select-none border-2 border-plate touch-manipulation flex-shrink-0"
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
      </div>

      <!-- Detail: hidden on phones until the line is tapped; always shown from 640 px up. -->
      <div
        id="rest-detail"
        :class="expanded ? 'flex' : 'hidden'"
        class="sm:flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 sm:gap-3 pt-1.5 pb-1"
      >
        <!-- Next set (or "all done") -->
        <span class="w-full text-[11px] font-mono text-ink-muted truncate leading-tight">
          {{ nextHint }}
        </span>

        <!-- Presets -->
        <div class="flex flex-wrap items-center gap-1 sm:gap-1.5">
          <button
            v-for="preset in [60, 90, 120, 180]"
            :key="preset"
            type="button"
            @click="setTimerDuration(preset)"
            class="min-h-[44px] min-w-[44px] text-[11px] font-mono font-bold px-2 sm:px-2.5 rounded-full border-2 border-plate transition-all select-none touch-manipulation whitespace-nowrap"
            :class="timerDuration === preset
              ? 'bg-flame text-white shadow-[1.5px_1.5px_0px_#1e2220] translate-x-[-1px] translate-y-[-1px]'
              : 'bg-surface hover:bg-paper-dim text-ink shadow-[1px_1px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
          >
            {{ preset }}s
          </button>
        </div>

        <!-- Custom rest for this exercise (10–600 s, whole seconds) -->
        <div class="flex flex-col gap-0.5 flex-shrink-0">
          <div class="flex items-center gap-1">
            <input
              v-model="restInput"
              type="text"
              inputmode="numeric"
              maxlength="3"
              placeholder="10–600"
              :disabled="!exerciseKey"
              aria-label="เวลาพักเอง (วินาที)"
              class="min-h-[44px] w-20 px-2 rounded-xl border-2 border-plate bg-white text-xs sm:text-sm font-mono font-bold text-ink disabled:opacity-50"
              @keyup.enter="saveRest"
            />
            <button
              type="button"
              :disabled="!exerciseKey"
              class="min-h-[44px] min-w-[44px] px-2.5 rounded-xl border-2 border-plate bg-surface hover:bg-paper-subtle text-xs font-bold text-ink disabled:opacity-50 touch-manipulation"
              title="บันทึกเวลาพักของท่านี้"
              @click="saveRest"
            >บันทึก</button>
          </div>
          <span v-if="restError" class="text-[11px] font-mono text-red-700 leading-tight max-w-[12rem]">{{ restError }}</span>
          <span v-else-if="restOk" class="text-[11px] font-mono text-emerald-text leading-tight max-w-[12rem]">{{ restOk }}</span>
        </div>

        <!-- Dynamic Steppers (+30s / -15s) -->
        <div class="flex flex-wrap items-center gap-1 flex-shrink-0">
          <button
            type="button"
            @click="adjustRemaining(30)"
            class="min-h-[44px] px-2.5 sm:px-3 text-xs sm:text-sm font-mono font-bold rounded-xl border-2 border-plate bg-paper-subtle hover:bg-paper-dim text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all whitespace-nowrap touch-manipulation"
            title="เพิ่มเวลาพักอีก 30 วินาที"
          >
            +30s
          </button>
          <button
            type="button"
            @click="adjustRemaining(-15)"
            class="min-h-[44px] px-2.5 sm:px-3 text-xs sm:text-sm font-mono font-bold rounded-xl border-2 border-plate bg-paper-subtle hover:bg-paper-dim text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all whitespace-nowrap touch-manipulation"
            title="ลดเวลาพัก 15 วินาที"
          >
            -15s
          </button>
        </div>

        <!-- Skip rest and reset. Skip collapses the panel; after the last set it is the main action. -->
        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            type="button"
            @click="onSkip"
            class="min-h-[44px] px-3 text-xs sm:text-sm font-heading font-bold rounded-xl border-2 border-plate transition-all touch-manipulation whitespace-nowrap"
            :class="allDone
              ? 'bg-emerald text-white shadow-[2px_2px_0px_#1e2220]'
              : 'bg-surface text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'"
            :title="allDone ? 'จบทุกท่าแล้ว ข้ามพัก' : 'ข้ามพักเดี๋ยวนี้'"
          >ข้ามพัก</button>

          <!-- Reset Button -->
          <button
            type="button"
            @click="resetTimer"
            class="min-h-[44px] min-w-[44px] w-11 h-11 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-surface hover:bg-paper-subtle border-2 border-plate flex items-center justify-center text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all touch-manipulation"
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
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useTimer } from '../composables/useTimer';
import { useWorkoutStore } from '../composables/useWorkoutStore';
import { ref, watch } from 'vue';
import { nextUndoneSet, restHint } from '../composables/useRestPanel.js';
import { getCustomRest, saveCustomRest } from '../composables/useCustomRest.js';

const { currentDay, workoutData, userState } = useWorkoutStore();
const isWorkoutDay = computed(() => ['prog_a', 'prog_b'].includes(currentDay.value));

// Next undone set in the current day (null when every set is done).
const next = computed(() => nextUndoneSet(workoutData[currentDay.value], userState[currentDay.value]));
const nextHint = computed(() => restHint(next.value));
const allDone = computed(() => next.value === null);

// The custom rest belongs to the exercise of the next set (the rest happens before that set).
const exerciseKey = computed(() => (next.value ? next.value.exerciseId : null));

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

const restInput = ref('');
const restError = ref('');
const restOk = ref('');

// Phone: the detail panel (presets, +30s/-15s, skip, custom time) is collapsed until the line is tapped.
const expanded = ref(false);

function toggleExpanded() {
  expanded.value = !expanded.value;
}

// Starting a rest (Done on a set, or play) collapses the panel again; tap the line to open it.
watch(isRunning, (now, before) => {
  if (now && !before) expanded.value = false;
});

function onSkip() {
  skipTimer();
  expanded.value = false;
}

// When the next exercise changes and no timer is running, use its saved rest.
watch(
  exerciseKey,
  (key) => {
    if (isRunning.value) return;
    const saved = getCustomRest(key);
    if (saved) setTimerDuration(saved);
  },
  { immediate: true }
);

function saveRest() {
  const result = saveCustomRest(exerciseKey.value, restInput.value);
  if (!result.ok) {
    restError.value = result.error;
    restOk.value = '';
    return;
  }
  restError.value = '';
  restOk.value = isRunning.value
    ? `บันทึก ${result.seconds} วินาที (ใช้กับการพักครั้งถัดไป)`
    : `บันทึก ${result.seconds} วินาที`;
  restInput.value = '';
  if (!isRunning.value) setTimerDuration(result.seconds);
}
</script>
