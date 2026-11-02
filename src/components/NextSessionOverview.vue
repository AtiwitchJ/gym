<template>
  <div
    v-if="dayData && totalCount > 0"
    class="mb-3 p-2 sm:px-3 sm:py-2.5 rounded-lg border-2 border-plate bg-paper shadow-[2px_2px_0px_#1e2220] flex flex-wrap items-center justify-between gap-2 font-mono text-xs select-none"
  >
    <!-- Left: Tally Badges -->
    <div class="flex items-center gap-1.5 flex-wrap">
      <span class="text-[10px] sm:text-[11px] font-bold text-ink-muted uppercase tracking-wider mr-1">
        แผนรอบหน้า:
      </span>
      <span
        v-if="increaseCount > 0"
        class="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-flame text-white border border-plate shadow-[1px_1px_0px_#1e2220]"
      >
        +2 kg ({{ increaseCount }} ท่า)
      </span>
      <span
        v-if="optimalCount > 0"
        class="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-emerald text-white border border-plate shadow-[1px_1px_0px_#059669]"
      >
        0 kg ({{ optimalCount }} ท่า)
      </span>
      <span
        v-if="decreaseCount > 0"
        class="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-amber-500 text-white border border-plate shadow-[1px_1px_0px_#1e2220]"
      >
        -2 kg ({{ decreaseCount }} ท่า)
      </span>
    </div>

    <!-- Right: Trigger Modal Button -->
    <button
      type="button"
      @click="$emit('open-plan')"
      class="text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-md border-2 border-plate bg-white hover:bg-paper-subtle text-ink shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none transition-all whitespace-nowrap"
    >
      ตารางแผนรอบหน้า ➔
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useWeightAdvisor } from '../composables/useWeightAdvisor';

const props = defineProps({
  dayKey: { type: String, default: 'mon' },
  dayData: { type: Object, default: () => ({}) },
  userState: { type: Object, default: () => ({}) },
  lastWeights: { type: Object, default: () => ({}) }
});

defineEmits(['open-plan']);

const { getExerciseOverallAdvice } = useWeightAdvisor();

const stats = computed(() => {
  let inc = 0;
  let dec = 0;
  let opt = 0;
  let total = 0;

  if (!props.dayData) return { inc, dec, opt, total };

  const daySt = props.userState[props.dayKey] || {};

  function checkEx(ex) {
    total++;
    const exSt = daySt[ex.id] || {};
    const setsData = ex.sets.map((s, idx) => {
      const wt = (exSt[`wt_${idx}`] !== undefined && exSt[`wt_${idx}`] !== '')
        ? exSt[`wt_${idx}`]
        : (props.lastWeights[ex.id] && props.lastWeights[ex.id][`wt_${idx}`]) || '';

      const reps = (exSt[`reps_${idx}`] !== undefined && exSt[`reps_${idx}`] !== '')
        ? exSt[`reps_${idx}`]
        : (props.lastWeights[ex.id] && props.lastWeights[ex.id][`reps_${idx}`]) || '';

      return {
        type: s.type,
        weight: wt,
        reps
      };
    });

    const advice = getExerciseOverallAdvice(setsData);
    if (advice?.workAdvice) {
      if (advice.workAdvice.delta > 0) inc++;
      else if (advice.workAdvice.delta < 0) dec++;
      else opt++;
    } else if (advice?.warmAdvice && advice.warmAdvice.delta !== 0) {
      if (advice.warmAdvice.delta > 0) inc++;
      else dec++;
    } else {
      opt++;
    }
  }

  if (props.dayData.exercises) {
    props.dayData.exercises.forEach(checkEx);
  }
  if (props.dayData.bonusExercises) {
    props.dayData.bonusExercises.forEach(checkEx);
  }

  return { inc, dec, opt, total };
});

const increaseCount = computed(() => stats.value.inc);
const decreaseCount = computed(() => stats.value.dec);
const optimalCount = computed(() => stats.value.opt);
const totalCount = computed(() => stats.value.total);
</script>
