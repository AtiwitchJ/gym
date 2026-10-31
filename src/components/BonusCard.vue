<template>
  <div
    class="bg-surface rounded-xl border transition-all duration-200 overflow-hidden mb-4 border-amber-500/30"
    :class="isAllCompleted ? 'bg-surface/80 border-confirmed/40' : ''"
  >
    <!-- Card Header -->
    <div class="p-4 border-b border-surface-border bg-amber-500/5">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <span class="font-mono text-sm font-bold text-amber-400 mt-0.5 select-none">
            +{{ index + 1 }}
          </span>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded tracking-wide uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                TOUCH-UP: {{ bonus.part }}
              </span>
            </div>
            <h3 class="text-base font-bold text-white tracking-tight leading-snug">
              {{ bonus.name }}
            </h3>
            <p class="text-xs text-titanium-400 mt-0.5">
              {{ bonus.altName }}
            </p>
          </div>
        </div>

        <a
          v-if="bonus.videoUrl"
          :href="bonus.videoUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 text-[11px] font-mono text-titanium-300 bg-surface-border hover:bg-crimson hover:text-white px-2.5 py-1.5 rounded-lg border border-surface-border transition-colors whitespace-nowrap"
        >
          <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span>VIDEO</span>
        </a>
      </div>

      <div class="mt-2.5 text-xs text-amber-300/80 bg-amber-500/10 px-2.5 py-1.5 rounded border border-amber-500/20">
        💡 {{ bonus.tip }}
      </div>

      <!-- Last Record Hint -->
      <div class="mt-2 flex items-center gap-2 text-[11px] font-mono bg-surface-border/40 px-2.5 py-1.5 rounded border border-surface-border/80 text-sky-400">
        <span class="text-titanium-400 uppercase tracking-wider text-[10px]">LAST:</span>
        <span>วอร์ม <strong class="tabular-nums font-bold text-white">{{ prevWarm }}</strong> กก.</span>
        <span class="text-titanium-500">|</span>
        <span>เล่นเสริม <strong class="tabular-nums font-bold text-white">{{ prevTouch }}</strong> กก.</span>
      </div>
    </div>

    <!-- Sets List -->
    <div class="divide-y divide-surface-border/60">
      <div
        v-for="(set, sIdx) in bonus.sets"
        :key="sIdx"
        class="px-4 py-2.5 flex items-center justify-between gap-3 transition-colors"
        :class="isSetDone(sIdx) ? 'bg-confirmed-bg/25' : 'hover:bg-surface-card/40'"
      >
        <div class="flex items-center gap-2.5 min-w-[70px]">
          <span
            class="text-[11px] font-mono font-bold px-2 py-0.5 rounded tracking-wider uppercase"
            :class="set.type === 'warm'
              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'"
          >
            {{ set.type === 'warm' ? 'W1' : 'T1' }}
          </span>
          <span class="text-xs text-titanium-400 hidden sm:inline">{{ set.reps }}</span>
        </div>

        <span class="text-xs text-titanium-400 sm:hidden flex-1">{{ set.reps }}</span>

        <!-- Weight Input -->
        <div class="flex items-center gap-1.5">
          <div class="relative w-24">
            <input
              type="number"
              step="0.5"
              inputmode="decimal"
              pattern="[0-9]*"
              :value="getWeight(sIdx)"
              @input="onWeightChange(sIdx, $event.target.value)"
              :placeholder="`${getPrevWeight(sIdx)}`"
              class="w-full bg-titanium-950 border border-surface-border focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-center font-mono tabular-nums text-sm font-semibold text-white outline-none transition-colors"
            />
            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-titanium-500 pointer-events-none">
              กก.
            </span>
          </div>
        </div>

        <!-- Toggle Checkmark -->
        <button
          type="button"
          @click="onToggle(sIdx)"
          class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base transition-all select-none"
          :class="isSetDone(sIdx)
            ? 'bg-confirmed text-white shadow-md shadow-emerald-950 border border-confirmed-border'
            : 'bg-titanium-950 hover:bg-surface-muted text-titanium-500 border border-surface-border'"
        >
          <svg v-if="isSetDone(sIdx)" class="w-5 h-5 fill-current" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          <span v-else class="text-xs font-mono opacity-50">✓</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useWorkoutStore } from '../composables/useWorkoutStore';
import { useTimer } from '../composables/useTimer';

const props = defineProps({
  bonus: { type: Object, required: true },
  index: { type: Number, required: true }
});

const { currentDay, userState, lastWeights, updateWeight, toggleSetDone } = useWorkoutStore();
const { startTimer, triggerHaptic } = useTimer();

const exState = computed(() => (userState[currentDay.value] && userState[currentDay.value][props.bonus.id]) || {});
const exLast = computed(() => lastWeights[props.bonus.id] || {});

const prevWarm = computed(() => (exLast.value.wt_0 !== undefined && exLast.value.wt_0 !== '') ? exLast.value.wt_0 : 0);
const prevTouch = computed(() => (exLast.value.wt_1 !== undefined && exLast.value.wt_1 !== '') ? exLast.value.wt_1 : 0);

function getPrevWeight(sIdx) {
  return (exLast.value[`wt_${sIdx}`] !== undefined && exLast.value[`wt_${sIdx}`] !== '')
    ? exLast.value[`wt_${sIdx}`]
    : 0;
}

function getWeight(sIdx) {
  return exState.value[`wt_${sIdx}`] !== undefined ? exState.value[`wt_${sIdx}`] : '';
}

function isSetDone(sIdx) {
  return !!exState.value[`set_${sIdx}`];
}

const isAllCompleted = computed(() => {
  if (!props.bonus.sets || props.bonus.sets.length === 0) return false;
  return props.bonus.sets.every((_, idx) => isSetDone(idx));
});

function onWeightChange(sIdx, val) {
  updateWeight(currentDay.value, props.bonus.id, sIdx, val);
}

function onToggle(sIdx) {
  const isNowChecked = toggleSetDone(currentDay.value, props.bonus.id, sIdx);
  if (isNowChecked) {
    triggerHaptic([35]);
    startTimer();
  }
}
</script>
